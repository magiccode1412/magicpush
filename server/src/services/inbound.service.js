const logger = require('../utils/logger');
const { extractFields, getPresetTemplate } = require('../utils/jsonpath');

/**
 * 入站消息处理服务
 */
class InboundService {
  /**
   * 处理入站请求
   * @param {Object} endpoint - 接口配置
   * @param {Object} payload - 原始请求数据
   * @returns {Object} - 标准化的消息对象 { title, content, type }
   */
  static processInbound(endpoint, payload) {
    // 如果没有配置 inbound_config，直接尝试从 payload 中提取标准字段
    if (!endpoint.inbound_config || !endpoint.inbound_config.enabled) {
      return this.extractStandardFields(payload);
    }

    const config = endpoint.inbound_config;
    
    // 如果选择了预设模板，合并模板配置
    let mapping = config.fieldMapping || {};
    let defaults = config.defaultValues || {};

    if (config.sourceType && config.sourceType !== 'generic') {
      const preset = getPresetTemplate(config.sourceType);
      if (preset) {
        // 合并映射：预设为基础，用户非空配置覆盖预设
        const userMapping = mapping || {};
        const filteredUserMapping = {};
        for (const [key, value] of Object.entries(userMapping)) {
          // 兼容 string 和 array：空字符串、空数组、null/undefined 均视为未配置
          const isEmpty = value === '' || value === null || value === undefined
            || (Array.isArray(value) && value.length === 0)
            || (Array.isArray(value) && value.length === 1 && value[0] === '');
          if (!isEmpty) {
            filteredUserMapping[key] = value;
          }
        }
        mapping = { ...preset.fieldMapping, ...filteredUserMapping };
        defaults = { ...preset.defaultValues, ...defaults };
      }
    }

    // 提取字段
    const message = extractFields(payload, mapping, defaults);

    // 根据数据来源类型丰富消息内容
    if (config.sourceType && config.sourceType !== 'generic') {
      this.enrichMessage(message, config.sourceType, payload);
    }

    logger.info(`[Inbound] 提取结果: mapping=${JSON.stringify(mapping)}, message=${JSON.stringify(message)}`);

    // 验证必要字段
    if (!message.content) {
      // 尝试将整个 payload 作为 content
      message.content = JSON.stringify(payload, null, 2);
      message.title = message.title || '消息通知';
    }

    // 确保 title 是字符串
    if (message.title !== undefined && message.title !== null && typeof message.title !== 'string') {
      message.title = String(message.title);
    }

    // 确保 content 是字符串
    if (typeof message.content !== 'string') {
      message.content = String(message.content);
    }

    // 确保类型有效
    if (!['text', 'markdown', 'html'].includes(message.type)) {
      message.type = 'text';
    }

    logger.info(`[Inbound] 处理完成: title=${message.title}, content_length=${message.content?.length}`);

    return message;
  }

  /**
   * 从 payload 中提取标准字段
   * 用于未配置 inbound_config 的情况
   */
  static extractStandardFields(payload) {
    // 尝试直接提取标准字段
    const title = payload.title || payload.subject || payload.name || '消息通知';
    let content = payload.content || payload.message || payload.body || payload.text;
    const type = payload.type || 'text';

    // 如果没有 content，将整个对象转为 JSON
    if (!content) {
      content = JSON.stringify(payload, null, 2);
    }

    return {
      title: String(title),
      content: String(content),
      type: ['text', 'markdown', 'html'].includes(type) ? type : 'text',
    };
  }

  /**
   * 根据数据来源类型丰富消息内容
   */
  static enrichMessage(message, sourceType, payload) {
    switch (sourceType) {
      case 'emby':
        // 丰富 Emby 消息内容
        const parts = [];
        if (message.content) parts.push(message.content);
        if (payload.Event) parts.push(`事件: ${payload.Event}`);
        if (payload.User?.Name) parts.push(`用户: ${payload.User.Name}`);
        if (payload.Server?.Name) parts.push(`服务器: ${payload.Server.Name}`);
        if (payload.Severity) parts.push(`级别: ${payload.Severity}`);
        if (parts.length > 1) {
          message.content = parts.join('\n');
        }
        break;

      case 'grafana':
      case 'prometheus':
        // 丰富告警消息
        if (payload.alerts && payload.alerts[0]) {
          const alert = payload.alerts[0];
          const parts = [message.content];
          if (alert.labels) {
            const labels = Object.entries(alert.labels)
              .map(([k, v]) => `${k}=${v}`)
              .join(', ');
            if (labels) parts.push(`标签: ${labels}`);
          }
          if (alert.annotations?.summary) {
            parts.push(`摘要: ${alert.annotations.summary}`);
          }
          if (alert.status) parts.push(`状态: ${alert.status}`);
          if (parts.length > 1) {
            message.content = parts.join('\n');
          }
        }
        break;

      case 'github':
        // 丰富 GitHub 消息
        const ghParts = [message.content];
        if (payload.sender?.login) ghParts.push(`触发者: ${payload.sender.login}`);
        if (payload.ref) ghParts.push(`分支: ${payload.ref}`);
        if (ghParts.length > 1) {
          message.content = ghParts.join('\n');
        }
        break;
    }
  }

  /**
   * 验证 inbound_config 配置
   */
  static validateConfig(config) {
    if (!config) {
      return { valid: true };
    }

    // 如果启用了入站，必须配置 fieldMapping 或选择 sourceType
    if (config.enabled) {
      if (!config.sourceType && (!config.fieldMapping || Object.keys(config.fieldMapping).length === 0)) {
        return {
          valid: false,
          message: '请选择数据来源类型或配置字段映射规则',
        };
      }
    }

    return { valid: true };
  }
}

module.exports = InboundService;
