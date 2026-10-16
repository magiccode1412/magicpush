const crypto = require('crypto');
const axios = require('axios');
const logger = require('../../utils/logger');

const DEFAULT_BASE_URL = 'https://ilinkai.weixin.qq.com';
const BOT_TYPE = '3';

/**
 * 微信 ilink API 客户端
 * 封装与微信 ClawBot ilink API 的 HTTP 交互
 */
class IlinkClient {
  constructor({ baseUrl = DEFAULT_BASE_URL, token }) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.token = token;
  }

  /**
   * 生成随机 X-WECHAT-UIN 头（随机 uint32 -> base64）
   */
  _randomUin() {
    const uint32 = crypto.randomBytes(4).readUInt32BE(0);
    return Buffer.from(String(uint32), 'utf-8').toString('base64');
  }

  /**
   * 生成随机 client_id（UUID v4）
   */
  _generateClientId() {
    return crypto.randomUUID();
  }

  /**
   * 构建请求头
   */
  _headers() {
    return {
      'Content-Type': 'application/json',
      'AuthorizationType': 'ilink_bot_token',
      'X-WECHAT-UIN': this._randomUin(),
      ...(this.token && { 'Authorization': `Bearer ${this.token}` }),
    };
  }

  /**
   * 获取绑定二维码
   * GET ilink/bot/get_bot_qrcode?bot_type=3
   * @returns {{ qrcode: string, qrcodeUrl: string }}
   */
  async getQRCode() {
    const { data } = await axios.get(`${this.baseUrl}/ilink/bot/get_bot_qrcode`, {
      params: { bot_type: BOT_TYPE },
      headers: this._headers(),
      timeout: 15000,
    });
    logger.debug('获取 ClawBot 二维码响应: %j', data);
    return {
      qrcode: data.qrcode,
      qrcodeUrl: data.qrcode_img_content,
    };
  }

  /**
   * 轮询扫码状态
   * GET ilink/bot/get_qrcode_status?qrcode=xxx
   * @returns {{ status: string, token?: string, botId?: string, userId?: string, baseUrl?: string }}
   */
  async pollQRStatus(qrcode) {
    const { data } = await axios.get(`${this.baseUrl}/ilink/bot/get_qrcode_status`, {
      params: { qrcode },
      headers: this._headers(),
      timeout: 25000,
    });

    logger.debug('ClawBot 轮询响应 qrcode=%s: %j', qrcode, data);

    const numericStatusMap = {
      0: 'wait',
      1: 'scaned',
      2: 'confirmed',
      3: 'expired',
      4: 'canceled',
    };

    const validStatuses = ['wait', 'scaned', 'confirmed', 'expired', 'canceled'];
    const rawStatus = data.status;
    const normalizedStatus = (typeof rawStatus === 'number')
      ? (numericStatusMap[rawStatus] || 'wait')
      : (validStatuses.includes(rawStatus) ? rawStatus : 'wait');

    const result = { status: normalizedStatus };

    if (normalizedStatus === 'confirmed') {
      logger.info('ClawBot 扫码绑定确认: %j', data);
      result.token = data.bot_token || data.token;
      result.botId = data.ilink_bot_id;
      result.userId = data.ilink_user_id;
      result.baseUrl = data.baseurl || DEFAULT_BASE_URL;
    }

    return result;
  }

  /**
   * 发送文本消息
   * POST ilink/bot/sendmessage
   * @param {Object} params
   * @param {string} params.toUserId - 目标用户 ID
   * @param {string} params.text - 消息文本
   * @param {string} [params.contextToken] - 上下文 Token（可选）
   */
  async sendTextMessage({ toUserId, text, contextToken }) {
    const body = {
      msg: {
        from_user_id: '',
        to_user_id: toUserId,
        client_id: this._generateClientId(),
        message_type: 2,
        message_state: 2,
        item_list: [{ type: 1, text_item: { text } }],
      },
      base_info: { channel_version: '1.0.0' },
    };

    if (contextToken) {
      body.msg.context_token = contextToken;
    }

    const { data } = await axios.post(`${this.baseUrl}/ilink/bot/sendmessage`, body, {
      headers: this._headers(),
      timeout: 15000,
    });

    logger.debug('ClawBot 发送消息响应: %j', data);

    // ret 字段存在且非 0 表示失败（成功时返回空对象 {}）
    if (data.ret !== undefined && data.ret !== 0) {
      const errMsg = this._getRetErrorMessage(data.ret);
      const error = new Error(`发送失败: ${errMsg} (ret: ${data.ret})`);
      error.retCode = data.ret;
      throw error;
    }

    return data;
  }

  /**
   * 长轮询获取新消息
   * POST ilink/bot/getupdates
   * @param {Object} params
   * @param {string} [params.getUpdatesBuf] - 上次返回的游标，首次传空
   * @returns {Promise<Object>} { ret, msgs, get_updates_buf, longpolling_timeout_ms }
   */
  async getUpdates({ getUpdatesBuf = '' }) {
    const body = {
      get_updates_buf: getUpdatesBuf,
      base_info: { channel_version: '1.0.0' },
    };

    const { data } = await axios.post(`${this.baseUrl}/ilink/bot/getupdates`, body, {
      headers: this._headers(),
      timeout: 60000,
    });

    return data;
  }

  /**
   * ret 错误码转中文描述
   */
  _getRetErrorMessage(ret) {
    const messages = {
      '-2': '对话上下文已过期，请向机器人主动发送一条消息以重新激活',
      '-1': '系统错误',
    };
    return messages[String(ret)] || `未知错误 (ret: ${ret})`;
  }
}

module.exports = IlinkClient;
