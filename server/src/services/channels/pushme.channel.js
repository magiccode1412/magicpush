const axios = require('axios');
const BaseChannel = require('./base.channel');
const logger = require('../../utils/logger');

/**
 * PushMe 渠道适配器
 *
 * PushMe 是一个轻量级 Android 消息推送客户端
 * 官网: https://push.i-i.me
 * API 文档: https://push.i-i.me/docs/index
 *
 * 发送消息接口: POST {serverUrl}
 * 鉴权方式: push_key 参数
 */
class PushMeChannel extends BaseChannel {
  /**
   * @param {Object} config - 渠道配置
   * @param {string} config.serverUrl - PushMe 服务端地址（官方或自建）
   * @param {string} config.pushKey - 推送密钥
   * @param {number} channelId - 渠道记录 ID
   */
  constructor(config, channelId) {
    super(config);
    this.serverUrl = (config.serverUrl || 'https://push.i-i.me').replace(/\/+$/, '');
    this.pushKey = config.pushKey;
    this.tempKey = config.tempKey || '';
    this.channelId = channelId;
    logger.info(`PushMe 渠道初始化: server=${this.serverUrl}, channelId=${channelId}, hasPushKey=${!!this.pushKey}, hasTempKey=${!!this.tempKey}`);
  }

  async send(message) {
    const { title, content, type = 'text' } = message;

    const effectiveKey = this.pushKey || this.tempKey;
    if (!effectiveKey) {
      throw new Error('Push Key 和 Temp Key 不能同时为空');
    }

    // temp_key 仅支持官方服务
    let url = this.serverUrl;
    if (this.tempKey && !this.pushKey && url !== 'https://push.i-i.me') {
      logger.warn(`PushMe: temp_key 模式强制使用官方地址，忽略自建地址 ${url}`);
      url = 'https://push.i-i.me';
    }

    const body = {
      push_key: effectiveKey,
      title: title || undefined,
      content: content || undefined,
    };

    // PushMe 原生支持 text/markdown/html，直接传递 type
    if (type !== 'text') {
      body.type = type;
    }

    logger.info(`PushMe 发送消息: url=${url}, type=${type}, useTempKey=${!!(this.tempKey && !this.pushKey)}`);
    let response;
    try {
      response = await axios.post(
        url,
        body,
        {
          headers: {
            'Content-Type': 'application/json',
          },
          timeout: 15000,
        }
      );
    } catch (error) {
      logger.error(`PushMe 请求失败: ${error.message}`, { url, error: error.code || error.response?.status });
      throw new Error(`PushMe 请求失败: ${error.message}`);
    }

    // 检查响应是否为 success
    const result = response.data;
    if (result === 'success') {
      return result;
    }
    if (typeof result === 'object' && result.errcode === 0) {
      return result;
    }
    throw new Error(`PushMe 推送失败: ${result}`);
  }

  validate(config) {
    if (config.serverUrl && config.serverUrl.trim() !== '') {
      try {
        new URL(config.serverUrl);
      } catch {
        return { valid: false, message: '服务器地址格式不正确' };
      }
    }
    const hasPushKey = config.pushKey && config.pushKey.trim() !== '';
    const hasTempKey = config.tempKey && config.tempKey.trim() !== '';
    if (!hasPushKey && !hasTempKey) {
      return { valid: false, message: 'Push Key 和 Temp Key 不能同时为空' };
    }
    if (hasTempKey && !hasPushKey && config.serverUrl && config.serverUrl.trim() !== '') {
      return { valid: false, message: 'Temp Key 仅支持官方服务，请清空自建服务器地址或使用 Push Key' };
    }
    return { valid: true, message: '' };
  }

  async test() {
    try {
      await this.send({
        title: '测试消息',
        content: '这是一条来自魔法推送的测试消息，如果您收到此消息，说明配置正确！',
        type: 'text',
      });
      return { success: true, message: '测试消息发送成功' };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  static getName() {
    return 'PushMe';
  }

  static getDescription() {
    return '轻量级 Android 消息推送服务';
  }

  static getConfigFields() {
    return [
      {
        name: 'serverUrl',
        label: '服务器地址',
        type: 'text',
        required: false,
        placeholder: '默认 https://push.i-i.me，自建服务请填写地址',
        description: 'PushMe 服务端地址，留空使用官方服务（temp_key 模式仅支持官方）',
      },
      {
        name: 'pushKey',
        label: 'Push Key',
        type: 'password',
        required: false,
        placeholder: '在 PushMe APP 中获取的 push_key',
        description: '推送密钥，用于身份验证（推荐）',
      },
      {
        name: 'tempKey',
        label: 'Temp Key（临时测试用）',
        type: 'password',
        required: false,
        placeholder: '临时推送密钥，仅用于测试',
        description: '临时密钥，仅支持官方服务，方便快速测试。正式使用请配置 Push Key',
      },
    ];
  }
}

module.exports = PushMeChannel;
