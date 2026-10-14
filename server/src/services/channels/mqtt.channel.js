const mqtt = require('mqtt');
const BaseChannel = require('./base.channel');
const logger = require('../../utils/logger');

/**
 * MQTT 渠道适配器
 *
 * MQTT 是轻量级的发布/订阅（pub/sub）消息协议，常用于物联网（IoT）、智能家居等场景。
 * MagicPush 在此作为 publisher，将消息发布到 Broker（EMQX / Mosquitto / HiveMQ 等）的指定 topic，
 * 订阅了该 topic 的客户端（Home Assistant、Node-RED、手机 App 等）即可收到通知。
 *
 * 官方文档: https://mqtt.org/
 * 客户端库: mqtt.js (https://github.com/mqttjs/MQTT.js)
 */

// 允许的 broker 连接协议
const ALLOWED_PROTOCOLS = ['mqtt', 'mqtts', 'tcp', 'tls', 'ws', 'wss'];
// 连接 / 发布超时（毫秒）
const OPERATION_TIMEOUT = 15000;

class MqttChannel extends BaseChannel {
  /**
   * @param {Object} config - 渠道配置
   * @param {string} config.brokerUrl - Broker 地址，如 mqtt://host:1883 或 mqtts://host:8883
   * @param {string} [config.username] - 用户名（Broker 开启认证时填写）
   * @param {string} [config.password] - 密码
   * @param {string} config.topic - 发布主题
   * @param {string} [config.clientId] - 客户端 ID，留空由 mqtt.js 自动生成
   * @param {number|string} [config.qos] - 服务质量 0/1/2，默认 0
   * @param {string} [config.payloadFormat] - 载荷格式 'json' | 'text'，默认 'json'
   * @param {boolean|string} [config.retain] - 是否保留消息（新订阅者能拿到最后一条），默认 否
   * @param {boolean|string} [config.skipTlsVerify] - 跳过 TLS 证书校验（自签名证书场景），默认 否
   * @param {number} channelId - 渠道记录 ID
   */
  constructor(config, channelId) {
    super(config);
    this.brokerUrl = (config.brokerUrl && config.brokerUrl.trim())
      ? config.brokerUrl.trim().replace(/\/+$/, '')
      : '';
    this.username = (config.username && config.username.trim()) || '';
    this.password = (config.password && config.password.trim()) || '';
    this.topic = (config.topic && config.topic.trim()) || '';
    this.clientId = (config.clientId && config.clientId.trim()) || '';

    const qos = parseInt(config.qos, 10);
    this.qos = [0, 1, 2].includes(qos) ? qos : 0;

    this.payloadFormat = config.payloadFormat === 'text' ? 'text' : 'json';
    this.retain = this._toBool(config.retain);
    this.skipTlsVerify = this._toBool(config.skipTlsVerify);

    this.channelId = channelId;
  }

  /**
   * 将表单的 'true'/'false'/布尔 统一解析为布尔值
   * @param {*} value
   * @returns {boolean}
   */
  _toBool(value) {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') return value.trim().toLowerCase() === 'true';
    return false;
  }

  async send(message) {
    const { title, content, type = 'text' } = message;

    let payload;
    if (this.payloadFormat === 'text') {
      payload = title ? `${title}\n${content}` : (content || '');
    } else {
      payload = JSON.stringify({
        title: title || '',
        content: content || '',
        type,
        timestamp: Date.now(),
      });
    }

    logger.info(`MQTT 发送消息: broker=${this.brokerUrl}, topic=${this.topic}, qos=${this.qos}, retain=${this.retain}`);

    const client = mqtt.connect(this.brokerUrl, {
      username: this.username || undefined,
      password: this.password || undefined,
      clientId: this.clientId || undefined,
      rejectUnauthorized: !this.skipTlsVerify,
      connectTimeout: OPERATION_TIMEOUT,
    });

    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        client.end(true);
        reject(new Error('MQTT 连接或发布超时'));
      }, OPERATION_TIMEOUT);

      client.on('connect', () => {
        client.publish(this.topic, payload, { qos: this.qos, retain: this.retain }, (err) => {
          clearTimeout(timer);
          client.end(true);
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
      });

      client.on('error', (err) => {
        clearTimeout(timer);
        client.end(true);
        reject(err);
      });
    });

    return { success: true };
  }

  validate(config) {
    if (!config.brokerUrl || config.brokerUrl.trim() === '') {
      return { valid: false, message: 'Broker 地址不能为空' };
    }

    let protocol;
    try {
      const url = new URL(config.brokerUrl.trim());
      protocol = url.protocol.replace(':', '').toLowerCase();
    } catch {
      return { valid: false, message: 'Broker 地址格式不正确' };
    }
    if (!ALLOWED_PROTOCOLS.includes(protocol)) {
      return {
        valid: false,
        message: `不支持的协议 "${protocol}"，仅支持: ${ALLOWED_PROTOCOLS.join(', ')}`,
      };
    }

    if (!config.topic || config.topic.trim() === '') {
      return { valid: false, message: 'Topic 不能为空' };
    }
    const topic = config.topic.trim();
    if (topic.startsWith('#') || topic.startsWith('+')) {
      return { valid: false, message: 'Topic 不能以通配符 # 或 + 开头（那是订阅语法）' };
    }
    if (topic.includes(' ')) {
      return { valid: false, message: 'Topic 不能包含空格' };
    }

    return { valid: true, message: '' };
  }

  async test() {
    try {
      await this.send({
        title: '测试消息',
        content: '这是一条来自魔法推送(MagicPush)的测试消息 🎉',
        type: 'text',
      });
      return { success: true, message: '测试消息发送成功' };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  static getName() {
    return 'MQTT';
  }

  static getDescription() {
    return '轻量级物联网消息发布/订阅协议';
  }

  static getConfigFields() {
    return [
      {
        name: 'brokerUrl',
        label: 'Broker 地址',
        type: 'text',
        required: true,
        placeholder: '如 mqtts://broker.emqx.io:8883',
        description: 'MQTT Broker 连接地址。支持协议: mqtt / mqtts / tcp / tls / ws / wss',
      },
      {
        name: 'username',
        label: '用户名',
        type: 'text',
        required: false,
        placeholder: 'Broker 开启认证时填写',
        description: 'Broker 用户名。匿名 Broker（如公共测试 broker）可留空',
      },
      {
        name: 'password',
        label: '密码',
        type: 'password',
        required: false,
        placeholder: '与用户名配对使用',
        description: 'Broker 密码。与用户名配对使用',
      },
      {
        name: 'topic',
        label: 'Topic（主题）',
        type: 'text',
        required: true,
        placeholder: '如 magicpush/alerts',
        description: '消息发布的主题。订阅了同一 topic 的客户端即可收到消息。不能以 # 或 + 开头',
      },
      {
        name: 'clientId',
        label: 'Client ID',
        type: 'text',
        required: false,
        placeholder: '留空自动生成',
        description: 'MQTT 客户端标识符。同一 Broker 上需唯一，留空由系统自动生成',
      },
      {
        name: 'qos',
        label: 'QoS（服务质量）',
        type: 'select',
        required: false,
        placeholder: '默认 0',
        options: [
          { label: '0 - 最多一次（最快，可能丢失）', value: '0' },
          { label: '1 - 至少一次（可能重复）', value: '1' },
          { label: '2 - 恰好一次（最可靠，最慢）', value: '2' },
        ],
        description: '消息投递质量保证等级，默认 0',
      },
      {
        name: 'payloadFormat',
        label: '消息格式',
        type: 'select',
        required: false,
        placeholder: '默认 JSON',
        options: [
          { label: 'JSON（结构化，推荐，便于 IoT 解析）', value: 'json' },
          { label: '纯文本（title + 换行 + content）', value: 'text' },
        ],
        description: '发布到 topic 的消息载荷格式。JSON 含 title/content/type/timestamp 字段',
      },
      {
        name: 'retain',
        label: '保留消息（Retain）',
        type: 'select',
        required: false,
        placeholder: '默认 否',
        options: [
          { label: '否', value: 'false' },
          { label: '是（新订阅者能立即拿到最后一条）', value: 'true' },
        ],
        description: '开启后 Broker 会保留最后一条消息，新订阅者连接时立即收到',
      },
      {
        name: 'skipTlsVerify',
        label: '跳过 TLS 证书校验',
        type: 'select',
        required: false,
        placeholder: '默认 否',
        options: [
          { label: '否（推荐）', value: 'false' },
          { label: '是（仅自签名证书测试环境）', value: 'true' },
        ],
        description: '⚠️ 仅当使用 mqtts/wss/tls 且 Broker 使用自签名证书时开启。会关闭证书校验，存在安全风险',
      },
    ];
  }
}

module.exports = MqttChannel;
