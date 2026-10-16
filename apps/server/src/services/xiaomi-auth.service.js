/**
 * 小米云认证服务
 *
 * 实现小米账号的扫码登录流程，参考：
 * https://github.com/PiotrMachowski/Xiaomi-cloud-tokens-extractor
 *
 * 流程：
 * 1. 获取扫码登录的二维码 URL
 * 2. 长轮询等待用户扫码确认
 * 3. 从响应中提取 passToken / userId / ssecurity
 * 4. 通过 location URL 获取 serviceToken
 * 5. 调用小米云 API 获取音箱设备列表
 */

const crypto = require('crypto');
const axios = require('axios');
const { HttpsProxyAgent } = require('https-proxy-agent');
const { SocksProxyAgent } = require('socks-proxy-agent');
const logger = require('../utils/logger');

// ========== 小米账号认证相关常量 ==========

/** 小米账号服务基础 URL */
const XIAOMI_ACCOUNT_URL = 'https://account.xiaomi.com';

/** 小米服务 ID */
const XIAOMI_SID = 'xiaomiio';

/** 回调地址（用于 STS 令牌获取） */
const XIAOMI_CALLBACK = 'https://sts.api.io.mi.com/sts';

/** 二维码尺寸（像素） */
const QR_SIZE = 480;

/** 长轮询超时时间（秒） */
const POLL_TIMEOUT = 300;

/** 会话有效期（毫秒）：5 分钟 */
const SESSION_TTL = 5 * 60 * 1000;

/** 最大会话数量限制（防止内存耗尽） */
const MAX_SESSIONS = 1000;

// ========== 小米云 API 区域服务器 ==========

/**
 * 各区域的小米云 API 服务器地址
 * @type {Object.<string, string>}
 */
const _REGION_SERVERS = {
  cn: 'https://api.io.mi.com',       // 中国大陆
  de: 'https://de.api.io.mi.com',    // 德国
  us: 'https://us.api.io.mi.com',    // 美国
  ru: 'https://ru.api.io.mi.com',    // 俄罗斯
  tw: 'https://tw.api.io.mi.com',    // 台湾
  sg: 'https://sg.api.io.mi.com',    // 新加坡
  in: 'https://in.api.io.mi.com',    // 印度
  i2: 'https://i2.api.io.mi.com',    // 备用服务器
};

// ========== 扫码登录会话管理 ==========

/**
 * 扫码登录会话存储（内存缓存）
 * key: 随机 sessionId, value: { lpUrl, cookies, createdAt }
 * @type {Map<string, Object>}
 */
const loginSessions = new Map();

/**
 * 定期清理过期会话（每分钟执行一次）
 */
setInterval(() => {
  const now = Date.now();
  for (const [key, session] of loginSessions) {
    if (now - session.createdAt > SESSION_TTL) {
      loginSessions.delete(key);
    }
  }
}, 60 * 1000);

/**
 * 创建新的扫码登录会话
 * @param {Object} sessionData - 会话数据 { lpUrl, cookies }
 * @returns {string} sessionId
 * @throws {Error} 当会话数量超过上限时抛出异常
 */
function createSession(sessionData) {
  if (loginSessions.size >= MAX_SESSIONS) {
    throw new Error('服务器繁忙，请稍后再试');
  }
  const sessionId = crypto.randomBytes(16).toString('hex');
  loginSessions.set(sessionId, {
    ...sessionData,
    createdAt: Date.now(),
  });
  return sessionId;
}

/**
 * 获取会话数据
 * @param {string} sessionId - 会话 ID
 * @returns {Object|null} 会话数据，不存在或过期返回 null
 */
function getSession(sessionId) {
  const session = loginSessions.get(sessionId);
  if (!session) return null;

  // 检查是否过期
  if (Date.now() - session.createdAt > SESSION_TTL) {
    loginSessions.delete(sessionId);
    return null;
  }

  return session;
}

/**
 * 删除会话
 * @param {string} sessionId - 会话 ID
 */
function deleteSession(sessionId) {
  loginSessions.delete(sessionId);
}

/**
 * 根据环境变量创建 HTTP/SOCKS 代理 Agent
 * 支持通过 HTTP_PROXY / HTTPS_PROXY / ALL_PROXY 环境变量配置
 *
 * @returns {HttpsProxyAgent|SocksProxyAgent|undefined} 代理 Agent 实例
 */
function createProxyAgent() {
  const proxyUrl = process.env.HTTP_PROXY || process.env.HTTPS_PROXY || process.env.ALL_PROXY;
  if (!proxyUrl) return undefined;

  try {
    const url = new URL(proxyUrl);
    const protocol = url.protocol.replace(':', '').toLowerCase();
    if (protocol === 'socks' || protocol === 'socks5' || protocol === 'socks4') {
      return new SocksProxyAgent(proxyUrl);
    }
    return new HttpsProxyAgent(proxyUrl);
  } catch {
    logger.warn(`代理配置无效: ${proxyUrl}`);
    return undefined;
  }
}

/**
 * 生成随机 User-Agent（模拟小米手机浏览器）
 * 用于避免被小米服务端识别为异常请求
 *
 * @returns {string} 随机的 User-Agent 字符串
 */
function generateUserAgent() {
  const agents = [
    'Mozilla/5.0 (Linux; Android 14; 2304FPN6DC) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 13; 2210132C) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 12; M2102J2SC) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Mobile Safari/537.36',
  ];
  return agents[Math.floor(Math.random() * agents.length)];
}

/**
 * 从 JSONP 响应中提取 JSON 数据
 * 小米 API 返回格式：jsonpcallback({...})
 *
 * @param {string} text - JSONP 格式的响应文本
 * @returns {Object} 解析后的 JSON 对象
 * @throws {Error} 当无法提取 JSON 时抛出异常
 */
function extractJsonFromJsonp(text) {
  const match = text.match(/\{.*\}/s);
  if (!match) {
    throw new Error('无法解析 JSONP 响应');
  }
  return JSON.parse(match[0]);
}

/**
 * 小米云认证服务
 */
class XiaomiAuthService {
  /**
   * 创建带默认配置的 axios 实例
   */
  static _createClient(cookieJar = {}) {
    const proxyAgent = createProxyAgent();
    const client = axios.create({
      timeout: 30000,
      maxRedirects: 0, // 不自动跟随重定向，手动处理 Cookie
      validateStatus: (status) => status >= 200 && status < 400,
      headers: {
        'User-Agent': generateUserAgent(),
        'Accept': '*/*',
        'Accept-Language': 'zh-CN,zh;q=0.9',
      },
      ...(proxyAgent ? { httpsAgent: proxyAgent, httpAgent: proxyAgent } : {}),
    });

    // 请求拦截器：注入 Cookie
    client.interceptors.request.use((config) => {
      const cookieStr = Object.entries(cookieJar)
        .map(([k, v]) => `${k}=${v}`)
        .join('; ');
      if (cookieStr) {
        config.headers.Cookie = cookieStr;
      }
      return config;
    });

    // 响应拦截器：提取 Set-Cookie
    client.interceptors.response.use(
      (response) => {
        const setCookies = response.headers['set-cookie'];
        if (setCookies) {
          for (const cookie of setCookies) {
            const [kv] = cookie.split(';');
            const eqIdx = kv.indexOf('=');
            if (eqIdx > 0) {
              const key = kv.slice(0, eqIdx).trim();
              const val = kv.slice(eqIdx + 1).trim();
              cookieJar[key] = val;
            }
          }
        }
        return response;
      },
      (error) => {
        // 3xx 重定向也需要提取 Cookie
        if (error.response && error.response.headers['set-cookie']) {
          const setCookies = error.response.headers['set-cookie'];
          for (const cookie of setCookies) {
            const [kv] = cookie.split(';');
            const eqIdx = kv.indexOf('=');
            if (eqIdx > 0) {
              const key = kv.slice(0, eqIdx).trim();
              const val = kv.slice(eqIdx + 1).trim();
              cookieJar[key] = val;
            }
          }
        }
        // 对于 3xx 重定向，返回响应（location URL）
        if (error.response && error.response.status >= 300 && error.response.status < 400) {
          return error.response;
        }
        throw error;
      }
    );

    return client;
  }

  /**
   * 步骤 1：获取扫码登录的二维码信息
   *
   * @returns {{ qr: string, lp: string, loginUrl: string, timeout: number }}
   *   - qr: 二维码图片 URL
   *   - lp: 长轮询 URL（用于等待扫码结果）
   *   - loginUrl: 登录页面 URL（备选，可直接在浏览器打开）
   *   - timeout: 二维码有效期（秒）
   */
  static async getLoginQR() {
    const cookieJar = {};
    const client = this._createClient(cookieJar);
    const dc = Date.now();

    const qs = encodeURIComponent(`?sid=${XIAOMI_SID}&_json=true`);
    const callback = encodeURIComponent(XIAOMI_CALLBACK);

    const url = `${XIAOMI_ACCOUNT_URL}/longPolling/loginUrl?_qrsize=${QR_SIZE}&qs=${qs}&callback=${callback}&_hasLogo=false&sid=${XIAOMI_SID}&serviceParam=&_locale=zh_CN&_dc=${dc}`;

    logger.info('[XiaomiAuth] 正在获取扫码登录二维码...');

    const response = await client.get(url);
    const data = extractJsonFromJsonp(response.data);

    if (!data.lp || !data.loginUrl) {
      throw new Error('获取二维码信息失败：响应缺少必要字段');
    }

    // loginUrl 本身就是二维码内容，可直接用 qrcode.vue 渲染
    const loginUrl = data.loginUrl;
    const lpUrl = data.lp;
    const timeout = data.timeout || POLL_TIMEOUT;

    logger.info('[XiaomiAuth] 二维码获取成功');

    return {
      qr: loginUrl,    // 二维码内容（URL）
      lp: lpUrl,       // 长轮询 URL
      loginUrl,        // 登录 URL
      timeout,         // 超时时间
      _cookies: cookieJar, // 内部使用的 Cookie（需要保存用于后续轮询）
    };
  }

  /**
   * 步骤 2：长轮询等待用户扫码结果
   *
   * @param {string} lpUrl - 长轮询 URL（从 getLoginQR 返回）
   * @param {Object} cookies - 之前获取的 Cookie
   * @returns {{ status: string, userId?: string, passToken?: string, ssecurity?: string, location?: string }}
   */
  static async pollScanStatus(lpUrl, cookies = {}) {
    const client = this._createClient(cookies);

    logger.info('[XiaomiAuth] 开始长轮询等待扫码...');

    const response = await client.get(lpUrl, {
      timeout: (POLL_TIMEOUT + 30) * 1000, // 长轮询超时比服务端多 30 秒
    });

    const data = extractJsonFromJsonp(response.data);

    // 扫码状态：code=0 表示成功
    if (data.code !== 0) {
      // 扫码失败或超时
      const statusMap = {
        70016: 'expired',     // 二维码已过期
        70023: 'expired',     // 二维码已失效
        87009: 'canceled',    // 用户取消
      };
      return {
        status: statusMap[data.code] || 'failed',
        message: data.desc || '扫码失败',
      };
    }

    // 扫码成功，提取凭证
    logger.info('[XiaomiAuth] 扫码登录成功，正在提取凭证...');

    return {
      status: 'confirmed',
      userId: data.userId ? String(data.userId) : '',
      passToken: data.passToken || '',
      ssecurity: data.ssecurity || '',
      location: data.location || '',
      cUserId: data.cUserId ? String(data.cUserId) : '',
      cookies, // 传递 Cookie 给后续请求
    };
  }

  /**
   * 步骤 3：通过 location URL 获取 serviceToken
   *
   * @param {string} location - 重定向 URL（从 pollScanStatus 返回）
   * @param {Object} cookies - 之前的 Cookie
   * @returns {{ serviceToken: string, userId: string }}
   */
  static async getServiceToken(location, cookies = {}) {
    const client = this._createClient(cookies);

    logger.info('[XiaomiAuth] 正在获取 serviceToken...');

    // location 会 302 重定向，Cookie 拦截器会自动提取 serviceToken
    await client.get(location).catch((err) => {
      // 302 重定向会被 axios 拦截，记录警告日志
      logger.warn('[XiaomiAuth] 获取 serviceToken 时重定向拦截:', err.message);
    });

    const serviceToken = cookies.serviceToken || '';
    const userId = cookies.userId || '';

    if (!serviceToken) {
      throw new Error('获取 serviceToken 失败');
    }

    logger.info('[XiaomiAuth] serviceToken 获取成功');

    return { serviceToken, userId };
  }

  /**
   * 步骤 4：获取音箱设备列表
   *
   * 注意：由于 xiaoii 的限制，无法在不初始化设备的情况下获取设备列表
   * 因此此方法直接返回空数组，让用户手动输入设备名称
   *
   * @param {{ userId: string, passToken: string }} credentials
   * @returns {Array<{ did: string, name: string, model: string }>}
   */
  static async getSpeakerDevices(_credentials) {
    logger.info('[XiaomiAuth] 跳过自动获取设备列表，需要用户手动输入设备名称');

    // 由于 xiaoii/lib/speaker 的 init() 方法在找不到设备时会崩溃
    // 我们无法安全地获取设备列表，因此直接返回空数组
    // 让用户手动输入米家 App 中的设备名称
    return [];
  }

  /**
   * 生成 Nonce（8 字节随机数 + 4 字节时间戳分钟数）
   *
   * @param {string} ssecurity - Base64 编码的安全密钥
   * @returns {string} Base64 编码的 Nonce
   */
  static generateNonce(_ssecurity) {
    const randomBytes = crypto.randomBytes(8);
    const timeBytes = Buffer.alloc(4);
    // 当前分钟数（非秒数）
    const minutes = Math.floor(Date.now() / 60000);
    timeBytes.writeUInt32BE(minutes, 0);
    const nonceBytes = Buffer.concat([randomBytes, timeBytes]);
    return nonceBytes.toString('base64');
  }

  /**
   * 生成签名 Nonce = SHA256(ssecurity + nonce)
   *
   * @param {string} ssecurity
   * @param {string} nonce - Base64 编码
   * @returns {string} Base64 编码的签名 Nonce
   */
  static signedNonce(ssecurity, nonce) {
    const secretBytes = Buffer.from(ssecurity, 'base64');
    const nonceBytes = Buffer.from(nonce, 'base64');
    const hash = crypto.createHash('sha256')
      .update(Buffer.concat([secretBytes, nonceBytes]))
      .digest();
    return hash.toString('base64');
  }

  /**
   * 生成请求签名 = HMAC-SHA256(signedNonce, uri + signedNonce + nonce + data)
   *
   * @param {string} uri - API 路径
   * @param {string} signedNonce
   * @param {string} nonce
   * @param {string} data - JSON 字符串
   * @returns {string} Base64 编码的签名
   */
  static generateSignature(uri, signedNonce, nonce, data) {
    const parts = [uri, signedNonce, nonce, `data=${data}`];
    const signString = parts.join('&');
    const signedNonceBytes = Buffer.from(signedNonce, 'base64');
    return crypto.createHmac('sha256', signedNonceBytes)
      .update(signString)
      .digest('base64');
  }

  /**
   * 生成加密请求参数
   *
   * @param {string} signedNonce
   * @param {string} nonce
   * @param {Object} params - 原始参数对象
   * @returns {Object} 加密后的参数对象
   */
  static generateEncParams(signedNonce, nonce, params) {
    const rc4Key = Buffer.from(signedNonce, 'base64');
    const result = {};

    for (const [key, value] of Object.entries(params)) {
      if (key === '_nonce' || key === 'signature') {
        result[key] = value;
        continue;
      }
      // RC4 加密 value
      const encrypted = this.encryptRc4(rc4Key, Buffer.from(value, 'utf-8'));
      result[key] = encrypted.toString('base64');
    }

    return result;
  }

  /**
   * RC4 加密
   *
   * @param {Buffer} key - 密钥
   * @param {Buffer} data - 明文数据
   * @returns {Buffer} 密文数据
   */
  static encryptRc4(key, data) {
    const cipher = crypto.createCipheriv('rc4', key, null);
    return Buffer.concat([cipher.update(data), cipher.final()]);
  }

  /**
   * 一站式完成扫码登录：获取二维码 → 长轮询 → 提取凭证
   * 返回二维码信息和一个 Promise，前端可自行决定何时轮询
   *
   * @returns {{ qrCodeUrl, lpUrl, loginUrl, timeout, cookies }}
   */
  static async initQRLogin() {
    const qrData = await this.getLoginQR();
    return {
      qrCodeUrl: qrData.qr,
      lpUrl: qrData.lp,
      loginUrl: qrData.loginUrl,
      timeout: qrData.timeout,
      cookies: qrData._cookies,
    };
  }

  /**
   * 完成登录流程：从扫码结果中提取完整凭证
   *
   * @param {string} lpUrl - 长轮询 URL
   * @param {Object} cookies - 之前的 Cookie
   * @returns {{ userId, passToken, ssecurity, serviceToken }}
   */
  static async completeLogin(lpUrl, cookies) {
    // 轮询等待扫码结果
    const pollResult = await this.pollScanStatus(lpUrl, cookies);

    if (pollResult.status !== 'confirmed') {
      return pollResult;
    }

    // 获取 serviceToken
    if (pollResult.location) {
      try {
        const tokenResult = await this.getServiceToken(
          pollResult.location,
          pollResult.cookies
        );
        pollResult.serviceToken = tokenResult.serviceToken;
        if (tokenResult.userId) {
          pollResult.userId = tokenResult.userId;
        }
      } catch (e) {
        logger.warn('[XiaomiAuth] 获取 serviceToken 失败（不影响基本功能）:', e.message);
      }
    }

    // 清理内部使用的 cookies 字段
    delete pollResult.cookies;
    delete pollResult.location;

    return pollResult;
  }
}

module.exports = XiaomiAuthService;
module.exports.createSession = createSession;
module.exports.getSession = getSession;
module.exports.deleteSession = deleteSession;
