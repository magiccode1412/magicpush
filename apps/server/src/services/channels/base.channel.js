const { HttpsProxyAgent } = require('https-proxy-agent');
const { SocksProxyAgent } = require('socks-proxy-agent');

/**
 * 渠道适配器基类
 * 所有具体渠道适配器都需要继承此类
 */
class BaseChannel {
  constructor(config, channelKey) {
    this.config = config;
    this.channelKey = channelKey;
  }

  /**
   * 发送消息
   * @param {Object} message - 消息对象
   * @param {string} message.title - 消息标题
   * @param {string} message.content - 消息内容
   * @param {string} message.type - 消息类型 (text/markdown/html)
   * @returns {Promise<Object>} - 发送结果
   */
  async send(_message) {
    throw new Error('子类必须实现send方法');
  }

  /**
   * 验证配置
   * @param {Object} config - 渠道配置
   * @returns {Object} - 验证结果 {valid: boolean, message: string}
   */
  validate(_config) {
    throw new Error('子类必须实现validate方法');
  }

  /**
   * 测试渠道连接
   * @returns {Promise<Object>} - 测试结果
   */
  async test() {
    throw new Error('子类必须实现test方法');
  }

  /**
   * 获取渠道名称
   * @returns {string}
   */
  static getName() {
    throw new Error('子类必须实现getName静态方法');
  }

  /**
   * 获取渠道描述
   * @returns {string}
   */
  static getDescription() {
    return '';
  }

  /**
   * 获取配置字段定义
   * @returns {Array<Object>} - 配置字段列表
   */
  static getConfigFields() {
    throw new Error('子类必须实现getConfigFields静态方法');
  }

  /**
   * 获取支持的通用消息类型
   * @returns {Array<string>} - 支持的通用类型列表，如 ['text', 'markdown']
   * 默认返回 ['text']，子类可覆写以声明更多支持
   */
  static getSupportedTypes() {
    return ['text'];
  }

  /**
   * 获取渠道特有的消息类型定义
   * @returns {Array<Object>} - 渠道特有类型列表
   * 每个类型包含: value, label, icon?, fields[], description?, example?
   * 默认返回空数组，表示无特有类型
   */
  static getChannelSpecificTypes() {
    return [];
  }

  /**
   * 剥离 HTML 标签，将 HTML 内容转换为纯文本
   * 用于不支持 HTML 渠道的降级处理
   * @param {string} html - HTML 字符串
   * @returns {string} - 纯文本内容
   */
  static stripHtmlTags(html) {
    if (typeof html !== 'string') return String(html || '');
    return html
      // 将 <br> / <br/> 换行符转为换行
      .replace(/<br\s*\/?>/gi, '\n')
      // 将块级元素转为换行
      .replace(/<\/(div|p|li|h[1-6]|tr|blockquote|pre|hr)[^>]*>/gi, '\n')
      // 移除所有剩余的 HTML 标签
      .replace(/<[^>]+>/g, '')
      // 解码常见 HTML 实体
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      // 合并连续空白和多余换行
      .replace(/[ \t]+/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  /**
   * 根据代理URL创建代理Agent
   * @param {string} proxyUrl - 代理URL，如 http://127.0.0.1:7890 或 socks5://user:pass@host:port
   * @returns {Object|null} - HttpsProxyAgent 或 SocksProxyAgent 实例，无效时返回null
   */
  createProxyAgent(proxyUrl) {
    if (!proxyUrl || proxyUrl.trim() === '') {
      return null;
    }

    try {
      const url = new URL(proxyUrl);
      const protocol = url.protocol.replace(':', '').toLowerCase();

      if (protocol === 'socks' || protocol === 'socks5' || protocol === 'socks4') {
        // SOCKS 代理
        return new SocksProxyAgent(proxyUrl);
      } else {
        // HTTP/HTTPS 代理
        return new HttpsProxyAgent(proxyUrl);
      }
    } catch {
      return null;
    }
  }
}

module.exports = BaseChannel;
