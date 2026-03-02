/**
 * 渠道适配器基类
 * 所有具体渠道适配器都需要继承此类
 */
class BaseChannel {
  constructor(config) {
    this.config = config;
  }

  /**
   * 发送消息
   * @param {Object} message - 消息对象
   * @param {string} message.title - 消息标题
   * @param {string} message.content - 消息内容
   * @param {string} message.type - 消息类型 (text/markdown/html)
   * @returns {Promise<Object>} - 发送结果
   */
  async send(message) {
    throw new Error('子类必须实现send方法');
  }

  /**
   * 验证配置
   * @param {Object} config - 渠道配置
   * @returns {Object} - 验证结果 {valid: boolean, message: string}
   */
  validate(config) {
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
}

module.exports = BaseChannel;
