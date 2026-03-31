const BaseChannel = require('./base.channel');
const QqbotClient = require('../qqbot/qqbot-client');

/**
 * QQ 官方机器人渠道适配器
 *
 * 支持四种推送模式：
 * - 子频道消息 (channel)：直接发送到指定子频道
 * - 群聊消息 (group)：发送到指定 QQ 群（需 @机器人）
 * - C2C 单聊消息 (c2c)：发送到指定用户的消息列表
 * - 私信消息 (dms)：通过私信频道发送（旧版方式，需先创建会话）
 *
 * 推荐使用 group/c2c 模式，API 更新更稳定
 *
 * 鉴权方式：Authorization: Bot ${appId}.${token}
 */
class QqbotChannel extends BaseChannel {
  /**
   * @param {Object} config - 渠道配置
   * @param {string} config.appId - 机器人 AppID
   * @param {string} config.token - 鉴权 Token（Access Token）
   * @param {string} config.msgType - 消息类型: 'dms'(私信) | 'channel'(子频道) | 'group'(群聊) | 'c2c'(单聊)
   * @param {string} config.targetId - 目标 ID（根据 msgType 不同含义不同）
   * @param {string} [config.sourceGuildId] - 来源频道ID（私信模式可选）
   * @param {string} [config.proxyUrl] - 代理地址
   * @param {number} channelId - 渠道记录 ID
   */
  constructor(config, channelId) {
    super(config);
    this.appId = config.appId;
    this.token = config.token;
    this.msgType = config.msgType || 'channel';
    this.targetId = config.targetId;
    this.sourceGuildId = config.sourceGuildId;
    this.proxyUrl = config.proxyUrl;
    this.channelId = channelId;

    // 私信会话缓存，避免每次发消息都创建会话
    this._dmsGuildIdCache = null;
    // 群/C2C 消息序号计数器，用于去重
    this._msgSeq = 0;
  }

  async send(message) {
    const { title, content, type = 'text' } = message;
    let text = title ? `${title}\n\n${content}` : content;

    // QQ 消息类型处理
    // channel 模式支持 markdown，group/c2c 也支持 markdown
    // dms 私信不支持 markdown，需要转为纯文本
    if (type === 'html') {
      text = this._stripHtml(text);
    } else if (type === 'markdown' && this.msgType === 'dms') {
      // 私信不支持 markdown，降级为纯文本
      text = this._stripMarkdown(text);
    }

    // 群/C2C 场景支持的 msg_type
    const qqMsgType = (this.msgType === 'group' || this.msgType === 'c2c')
      ? (type === 'markdown' ? 2 : 0)
      : undefined;

    const client = new QqbotClient({
      appId: this.appId,
      token: this.token,
      proxyUrl: this.proxyUrl,
    });

    switch (this.msgType) {
      case 'group':
        return client.sendGroupMessage(this.targetId, {
          content: text,
          msgType: qqMsgType,
          msgSeq: ++this._msgSeq,
        });
      case 'c2c':
        return client.sendC2CMessage(this.targetId, {
          content: text,
          msgType: qqMsgType,
          msgSeq: ++this._msgSeq,
        });
      case 'dms':
        return this._sendDMS(client, text);
      case 'channel':
      default:
        return client.sendChannelMessage(this.targetId, { content: text });
    }
  }

  /**
   * 发送私信消息
   * 先获取或创建私信会话，再发送消息
   */
  async _sendDMS(client, text) {
    let guildId = this._dmsGuildIdCache;

    if (!guildId) {
      const dms = await client.createDMS(this.targetId, this.sourceGuildId);
      guildId = dms.id;
      // 缓存私信频道 ID，有效期内可复用
      this._dmsGuildIdCache = guildId;
    }

    return client.sendDMSMessage(guildId, { content: text });
  }

  /**
   * 剥离 Markdown 格式标记，转为纯文本
   */
  _stripMarkdown(md) {
    return md
      .replace(/#{1,6}\s+/g, '')
      .replace(/\*\*(.+?)\*\*/g, '$1')
      .replace(/\*(.+?)\*/g, '$1')
      .replace(/~~(.+?)~~/g, '$1')
      .replace(/`{1,3}(.+?)`{1,3}/g, '$1')
      .replace(/\[(.+?)\]\(.+?\)/g, '$1')
      .replace(/^[-*+]\s/gm, '')
      .replace(/^\d+\.\s/gm, '')
      .replace(/^>\s/gm, '')
      .replace(/---+/g, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  /**
   * 剥离 HTML 标签，转为纯文本
   */
  _stripHtml(html) {
    return html
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<p>/gi, '\n')
      .replace(/<\/p>/gi, '')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  validate(config) {
    if (!config.appId || config.appId.trim() === '') {
      return { valid: false, message: 'AppID 不能为空' };
    }
    if (!config.token || config.token.trim() === '') {
      return { valid: false, message: 'Token 不能为空' };
    }
    if (!config.msgType || !['dms', 'channel', 'group', 'c2c'].includes(config.msgType)) {
      return { valid: false, message: '消息类型必须是"私信消息"、"子频道消息"、"群聊消息"或"单聊消息"' };
    }
    if (!config.targetId || config.targetId.trim() === '') {
      return { valid: false, message: '目标 ID 不能为空' };
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
      return { success: true, message: '测试消息发送成功' };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  static getName() {
    return 'QQ机器人';
  }

  static getDescription() {
    return '通过 QQ 官方机器人推送消息，支持群聊、单聊、子频道和私信';
  }

  static getConfigFields() {
    return [
      {
        name: 'appId',
        label: 'AppID',
        type: 'text',
        required: true,
        placeholder: 'QQ开放平台机器人的 AppID',
        description: '在 QQ 开放平台创建机器人后获取',
      },
      {
        name: 'token',
        label: 'AppSecret / Token',
        type: 'password',
        required: true,
        placeholder: '机器人的 AppSecret 或 Access Token',
        description: '在 QQ 开放平台获取，用于接口鉴权',
      },
      {
        name: 'msgType',
        label: '推送场景',
        type: 'select',
        required: true,
        options: [
          { value: 'group', label: '群聊消息' },
          { value: 'c2c', label: '单聊消息（消息列表）' },
          { value: 'channel', label: '子频道消息' },
          { value: 'dms', label: '私信消息（旧版）' },
        ],
        description: '群聊/单聊推荐使用，API 更新更稳定；子频道用于 QQ 频道；私信为旧版方式',
      },
      {
        name: 'targetId',
        label: '目标 ID',
        type: 'text',
        required: true,
        placeholder: '群聊填群号 / 单聊填用户ID / 频道填子频道ID',
        description: '群聊填 group_openid，单聊填用户 openid，子频道填 channel_id，私信填用户 openid',
      },
      {
        name: 'sourceGuildId',
        label: '来源频道 ID',
        type: 'text',
        required: false,
        placeholder: '可选，仅私信模式使用',
        description: '仅私信模式(dms)需要，用于创建私信会话的来源频道 ID',
      },
      {
        name: 'proxyUrl',
        label: '代理地址',
        type: 'text',
        required: false,
        placeholder: '如 http://127.0.0.1:7890',
        description: '可选，用于访问 QQ API 的代理地址',
      },
    ];
  }
}

module.exports = QqbotChannel;
