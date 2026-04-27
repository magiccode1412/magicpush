const axios = require('axios');
const BaseChannel = require('./base.channel');

/**
 * 息知(XiZhi)适配器
 * 极简微信消息通知接口 - 永久免费
 * 官网: https://xz.qqoq.net/
 *
 * 推送模式:
 *   - 单点推送: https://xizhi.qqoq.net/{key}.send (推送到个人微信)
 *   - 频道推送: https://xizhi.qqoq.net/{key}.channel (推送到频道所有成员)
 *
 * 限制说明:
 *   - 永久免费，无推送数量限制计划
 *   - 每分钟不超过30条（触发限流）
 *   - 微信方日调用上限10万次
 *   - 仅在微信卡片显示标题，内容需点击查看
 */
class XizhiChannel extends BaseChannel {
  constructor(config) {
    super(config);
    this.pushMode = config.pushMode || 'single';
    this.key = config.key;
    this.channelKey = config.channelKey || null;
    this.channelId = config.channelId || null;
  }

  async send(message) {
    const { title, content, type = 'text' } = message;

    // 息知只支持 text 和 markdown，将 html 转为纯文本
    let finalContent = content;
    if (type === 'html') {
      finalContent = content.replace(/<[^>]+>/g, '');
    }

    // 根据推送模式选择 URL 后缀和 key
    let urlSuffix, key;
    if (this.pushMode === 'channel') {
      urlSuffix = '.channel';
      key = this.channelKey;
    } else {
      urlSuffix = '.send';
      key = this.key;
    }

    if (!key) {
      throw new Error('息知Key不能为空');
    }

    // 息知API：单点 https://xizhi.qqoq.net/{key}.send | 频道 https://xizhi.qqoq.net/{key}.channel
    const url = `https://xizhi.qqoq.net/${key}${urlSuffix}`;
    const params = {
      title: title || '消息通知',
      content: finalContent || '',
    };

    const response = await axios.post(url, null, {
      params,
      headers: { 'Content-Type': 'application/json' },
      timeout: 10000,
    });

    if (response.data && response.data.code !== undefined && response.data.code !== 200 && response.data.code !== 0) {
      throw new Error(`息知发送失败: ${response.data.message || response.data.msg || JSON.stringify(response.data)}`);
    }

    return {
      success: true,
      messageId: response.data?.id || null,
    };
  }

  validate(config) {
    const mode = config.pushMode || 'single';
    if (mode === 'channel') {
      if (!config.channelKey || config.channelKey.trim() === '') {
        return { valid: false, message: '频道Key不能为空' };
      }
    } else {
      if (!config.key || config.key.trim() === '') {
        return { valid: false, message: '单点Key不能为空' };
      }
    }
    return { valid: true, message: '' };
  }

  async test() {
    try {
      await this.send({
        title: '测试消息',
        content: '这是一条来自魔法推送的测试消息',
        type: 'text',
      });
      return { success: true, message: '连接测试成功' };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  static getName() {
    return '息知';
  }

  static getDescription() {
    return '极简微信消息通知接口，永久免费，支持单点推送和频道推送';
  }

  static getConfigFields() {
    return [
      {
        name: 'pushMode',
        label: '推送模式',
        type: 'select',
        required: true,
        options: [
          { label: '单点推送', value: 'single' },
          { label: '频道推送', value: 'channel' },
        ],
        description: '单点推送：消息发送到个人；频道推送：消息发送到订阅频道的所有成员',
      },
      {
        name: 'key',
        label: '单点Key',
        type: 'text',
        required: true,
        placeholder: '请输入息知单点Key',
        description: '从息知官网获取的单点推送Key，用于推送到个人微信',
        visibleWhen: { field: 'pushMode', value: 'single' },
      },
      {
        name: 'channelKey',
        label: '频道Key',
        type: 'text',
        required: true,
        placeholder: '请输入息知频道Key',
        description: '从息知官网获取的频道推送Key，用于推送到频道所有成员',
        visibleWhen: { field: 'pushMode', value: 'channel' },
      },
      {
        name: 'docs_link',
        type: 'links',
        links: [
          { label: '息知官方网站', url: 'https://xz.qqoq.net/' },
        ],
      },
    ];
  }
}

module.exports = XizhiChannel;
