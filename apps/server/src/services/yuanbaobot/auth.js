const crypto = require('crypto');
const axios = require('axios');
const logger = require('../../utils/logger');

// ── 默认配置 ──────────────────────────────────────────────────────────
const DEFAULT_API_DOMAIN = 'bot.yuanbao.tencent.com';
const SIGN_TOKEN_PATH = '/api/v5/robotLogic/sign-token';
const TOKEN_REFRESH_BEFORE_MS = 5 * 60 * 1000;   // 过期前 5 分钟刷新
const OPENCLAW_INSTANCE_ID = 16;                  // 与官方一致

/**
 * 获取操作系统标识
 */
function getOS() {
  const platform = process.platform;
  switch (platform) {
    case 'darwin': return 'Darwin';
    case 'win32': return 'Windows_NT';
    default: return 'Linux';
  }
}

// ── Token 签名 & 缓存 ─────────────────────────────────────────────────

/**
 * 计算 HMAC-SHA256 签名
 * 明文 = nonce + timestamp + appKey + appSecret
 */
function computeSignature(nonce, timestamp, appKey, appSecret) {
  const plain = nonce + timestamp + appKey + appSecret;
  return crypto.createHmac('sha256', appSecret).update(plain).digest('hex');
}

/**
 * 获取北京时间 ISO 字符串（无毫秒，与官方一致）
 */
function beijingISODate() {
  const bjTime = new Date(Date.now() + 8 * 3600000);
  return bjTime.toISOString().replace('Z', '+08:00').replace(/\.\d{3}/, '');
}

/**
 * 生成 16 字节随机 hex nonce
 */
function generateNonce() {
  return crypto.randomBytes(16).toString('hex');
}

/**
 * Token 缓存条目
 * @typedef {{ token: string, botId: string, expiresAt: number, source: string }}
 */

/**
 * Token 签名管理器
 * 每个 appKey 对应一个缓存实例
 */
class TokenManager {
  /**
   * @param {Object} options
   * @param {string} options.appKey
   * @param {string} options.appSecret
   * @param {string} [options.apiDomain]
   */
  constructor(options) {
    this.appKey = options.appKey;
    this.appSecret = options.appSecret;
    this.apiDomain = options.apiDomain || DEFAULT_API_DOMAIN;

    /** @type {Promise<{token:string,botId:string,expiresAt:number}>|null} 防止并发重复请求 */
    this._signingFlight = null;
    /** @type {{token:string,botId:string,expiresAt:number}|null} 内存缓存 */
    this._cache = null;
  }

  /**
   * 获取有效的 token（缓存未过期则直接返回）
   * @returns {Promise<{token: string, botId: string, expiresAt: number}>}
   */
  async getToken() {
    // 有正在进行的签名请求，复用它（防并发重复请求）
    if (this._signingFlight) {
      logger.debug(`[yuanbaobot-auth] 等待已有签名请求完成...`);
      return this._signingFlight;
    }

    // 检查缓存有效性
    if (this._cache && this._cache.expiresAt > Date.now()) {
      const ttlSec = Math.round((this._cache.expiresAt - Date.now()) / 1000);
      logger.debug(`[yuanbaobot-auth] 使用缓存 token, 剩余 ${ttlSec}s`);
      return this._cache;
    }

    // 发起新签名
    this._signingFlight = this._requestSignToken()
      .then(result => {
        this._cache = result;
        this._signingFlight = null;
        return result;
      })
      .catch(err => {
        this._signingFlight = null;
        throw err;
      });

    return this._signingFlight;
  }

  /**
   * 清除缓存（强制下次重新签名）
   */
  invalidateCache() {
    this._cache = null;
    logger.info('[yuanbaobot-auth] token cache cleared');
  }

  /**
   * 向元宝 API 请求签发 token
   * @private
   */
  async _requestSignToken() {
    const nonce = generateNonce();
    const timestamp = beijingISODate();

    logger.info(`[yuanbaobot-auth] 请求签发 token, appKey=${this.appKey}, domain=${this.apiDomain}, ts=${timestamp}`);

    const signature = computeSignature(nonce, timestamp, this.appKey, this.appSecret);

    const url = `https://${this.apiDomain}${SIGN_TOKEN_PATH}`;
    let resp;
    try {
      resp = await axios.post(url, {
        app_key: this.appKey,
        nonce,
        timestamp,
        signature,
      }, {
        headers: {
          'Content-Type': 'application/json',
          'X-AppVersion': 'magicpush-1.0.0',
          'X-OperationSystem': getOS(),
          'X-Instance-Id': String(OPENCLAW_INSTANCE_ID),
          'X-Bot-Version': 'magicpush-1.0.0',
        },
        timeout: 15000,
      });
    } catch (err) {
      logger.error(`[yuanbaobot-auth] HTTP 请求失败: url=${url}, error=${err.message}`);
      throw new Error(`元宝签名API请求失败: ${err.message}`);
    }

    const data = resp.data;
    logger.info(`[yuanbaobot-auth] 签名响应 code=${data.code}, duration=${data?.data?.duration}s`);

    if (data.code !== 0 || !data.data || !data.data.token) {
      throw new Error(`元宝签名失败: code=${data.code}, message=${data.message || 'unknown'}`);
    }

    const tokenData = data.data;
    const durationMs = (tokenData.duration || 3600) * 1000;

    // 提前过期，确保使用时不会刚好超时
    const expiresAt = Date.now() + durationMs - TOKEN_REFRESH_BEFORE_MS;

    const result = {
      token: tokenData.token,
      botId: tokenData.bot_id || '',
      expiresAt,
      source: tokenData.source || 'bot',
    };

    logger.info(`[yuanbaobot-auth] token 签发成功, botId=${result.botId}, 有效至=${new Date(expiresAt).toISOString()}`);
    return result;
  }
}

// ── 全局 TokenManager 单例池 ──────────────────────────────────────────
/** @type {Map<string, TokenManager>} */
const managerPool = new Map();

/**
 * 获取或创建指定 appKey 的 TokenManager
 * @param {string} appKey
 * @param {string} appSecret
 * @param {string} [apiDomain]
 * @returns {TokenManager}
 */
function getTokenManager(appKey, appSecret, apiDomain) {
  const key = `${appKey}@${apiDomain || DEFAULT_API_DOMAIN}`;
  if (!managerPool.has(key)) {
    managerPool.set(key, new TokenManager({ appKey, appSecret, apiDomain }));
    logger.info(`[yuanbaobot-auth] 创建 TokenManager: key=${key}`);
  }
  return managerPool.get(key);
}

module.exports = {
  TokenManager,
  getTokenManager,
  computeSignature,
  generateNonce,
  DEFAULT_API_DOMAIN,
};
