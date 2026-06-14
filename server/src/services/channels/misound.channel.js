const BaseChannel = require('./base.channel');
const logger = require('../../utils/logger');

let speakerModule = null;

/**
 * 延迟加载 xiaoii speaker 模块（ESM 动态 import 兼容）
 */
function getSpeaker() {
  if (!speakerModule) {
    speakerModule = require('xiaoii/lib/speaker');
  }
  return speakerModule;
}

/**
 * 小爱音箱（MiSound）渠道适配器
 *
 * 通过 xiaoii 底层 Speaker 模块直接调用 TTS 接口，
 * 将文本消息发送至小爱音箱进行语音播报。
 *
 * 不对外暴露 Webhook 服务，纯代码内调用直连小米 IoT API。
 * GitHub: https://github.com/xvhuan/xiaoi
 */
class MisoundChannel extends BaseChannel {
  /**
   * @param {Object} config - 渠道配置
   * @param {string} config.userId - 小米 ID（数字）
   * @param {string} [config.passToken] - passToken（推荐）
   * @param {string} [config.password] - 密码（不推荐，可能被安全验证拦截）
   * @param {string} config.did - 音箱设备标识或名称
   * @param {string} [config.ttsMode] - TTS 模式：auto(默认)/command/default
   * @param {number} channelId - 渠道记录 ID
   */
  constructor(config, channelId) {
    super(config);
    this.userId = config.userId;
    this.passToken = config.passToken || '';
    this.password = config.password || '';
    this.did = config.did || '';
    this.ttsMode = config.ttsMode || 'auto';
    this.channelId = channelId;
    this._initialized = false;
  }

  /**
   * 构建 speaker 配置对象
   */
  _buildSpeakerConfig() {
    const cfg = {
      userId: this.userId,
      did: this.did,
      ttsMode: this.ttsMode,
    };
    if (this.passToken) {
      cfg.passToken = this.passToken;
    } else if (this.password) {
      cfg.password = this.password;
    }
    return cfg;
  }

  /**
   * 确保 speaker 已初始化（懒初始化，首次发送时执行）
   */
  async _ensureInitialized() {
    if (this._initialized) return;
    const speaker = getSpeaker();
    await speaker.init(this._buildSpeakerConfig());
    this._initialized = true;
    logger.info(`Misound 初始化完成: did=${this.did}, ttsMode=${this.ttsMode}`);
  }

  async send(message) {
    const { title, content, type = 'text' } = message;

    // 合并标题和内容为纯文本
    let text = content || '';
    if (title) {
      text = title + (text ? '，' + text : '');
    }

    // 清洗 markdown/html 标签，TTS 只接受纯文本
    if (type === 'markdown') {
      text = this._stripMarkdown(text);
    }
    if (type === 'html') {
      text = this._stripHtml(text);
    }

    // 截断过长的文本（小爱音箱 TTS 有长度限制）
    if (text.length > 500) {
      text = text.substring(0, 500);
      logger.warn(`Misound 文本过长，已截断至 500 字符`);
    }

    await this._ensureInitialized();

    const speaker = getSpeaker();
    logger.info(`Misound 发送 TTS: did=${this.did}, 长度=${text.length}`);

    try {
      const result = await speaker.tts(text, { did: this.did });
      return { success: true, result };
    } catch (error) {
      // 初始化可能过期，重试一次
      if (error.message && (error.message.includes('认证') || error.message.includes('token') || error.message.includes('登录'))) {
        logger.warn(`Misound 认证可能过期，重新初始化后重试`);
        this._initialized = false;
        await this._ensureInitialized();
        const retryResult = await speaker.tts(text, { did: this.did });
        return { success: true, result: retryResult };
      }
      throw error;
    }
  }

  _stripMarkdown(markdown) {
    return markdown
      .replace(/!\[.*?\]\(.*?\)/g, '')
      .replace(/\[(.*?)\]\(.*?\)/g, '$1')
      .replace(/#{1,6}\s+/g, '')
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/\*(.*?)\*/g, '$1')
      .replace(/~~(.*?)~~/g, '$1')
      .replace(/`{1,3}[^`]*`{1,3}/g, '')
      .replace(/^[-*+]\s+/gm, '')
      .replace(/^\d+\.\s+/gm, '')
      .replace(/^>\s+/gm, '')
      .replace(/---+/g, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

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
    if (!config.userId || config.userId.trim() === '') {
      return { valid: false, message: '小米ID不能为空' };
    }
    if (!/^\d+$/.test(config.userId.trim())) {
      return { valid: false, message: '小米ID必须为数字' };
    }
    if (!config.passToken && !config.password) {
      return { valid: false, message: 'passToken 和密码至少需要填写一个' };
    }
    if (!config.did || config.did.trim() === '') {
      return { valid: false, message: '音箱设备标识不能为空' };
    }
    const validModes = ['auto', 'command', 'default'];
    if (config.ttsMode && !validModes.includes(config.ttsMode)) {
      return { valid: false, message: 'TTS模式必须是 auto、command 或 default' };
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
      return { success: true, message: '测试消息发送成功，请检查小爱音箱是否播报' };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  static getName() {
    return '小爱音箱';
  }

  static getDescription() {
    return '小米小爱音箱语音播报通知';
  }

  static getConfigFields() {
    return [
      {
        name: 'userId',
        label: '小米ID',
        type: 'text',
        required: true,
        placeholder: '请输入小米ID（纯数字）',
        description: '在小米账号个人信息中查看的数字ID，非手机号或邮箱',
      },
      {
        name: 'passToken',
        label: 'PassToken',
        type: 'password',
        required: false,
        placeholder: '推荐使用 passToken 登录',
        description: 'passToken 登录方式更稳定，获取方式参考 mi-gpt 文档',
      },
      {
        name: 'password',
        label: '密码',
        type: 'password',
        required: false,
        placeholder: '不推荐使用密码登录',
        description: '密码登录可能被小米安全验证拦截，建议优先使用 passToken',
      },
      {
        name: 'did',
        label: '音箱设备标识',
        type: 'text',
        required: true,
        placeholder: '如 客厅小爱 / 音箱did',
        description: '目标小爱音箱在米家App中的名称或设备did',
      },
      {
        name: 'ttsMode',
        label: 'TTS 模式',
        type: 'select',
        required: false,
        options: [
          { label: '自动（推荐）', value: 'auto' },
          { label: '指令模式', value: 'command' },
          { label: '默认链路', value: 'default' },
        ],
        description: 'auto=智能选择最优方式; command=仅用MiOT指令; default=仅用MiNA默认链路',
      },
      {
        name: '_docLinks',
        label: '相关文档',
        type: 'links',
        required: false,
        links: [
          {
            label: 'xiaoii GitHub',
            url: 'https://github.com/xvhuan/xiaoi',
          },
          {
            label: '配置说明',
            url: 'https://github.com/xvhuan/xiaoi#%E9%85%8D%E7%BD%AE%E8%AF%A6%E8%A7%A3',
          },
        ],
      },
    ];
  }
}

module.exports = MisoundChannel;
