const BaseChannel = require('./base.channel');
const WechatclawbotChannel = require('./wechatclawbot.channel');
const WecomChannel = require('./wecom.channel');
const TelegramChannel = require('./telegram.channel');
const PushPlusChannel = require('./pushplus.channel');
const WxPusherChannel = require('./wxpusher.channel');
const FeishuChannel = require('./feishu.channel');
const DingtalkChannel = require('./dingtalk.channel');
const WebhookChannel = require('./webhook.channel');
const WechatOfficialChannel = require('./wechat-official.channel');
const ServerChanChannel = require('./serverchan.channel');
const SmtpChannel = require('./smtp.channel');
const GotifyChannel = require('./gotify.channel');
const MeowChannel = require('./meow.channel');
const WecomappChannel = require('./wecomapp.channel');
const BarkChannel = require('./bark.channel');
const PushMeChannel = require('./pushme.channel');
const XizhiChannel = require('./xizhi.channel');
const YuabaobotChannel = require('./yuanbaobot.channel');
const NtfyChannel = require('./ntfy.channel');
const PushDeerChannel = require('./pushdeer.channel');
const IGotChannel = require('./igot.channel');
const SynologyChatChannel = require('./synologychat.channel');
const ShowDocChannel = require('./showdoc.channel');
const MisoundChannel = require('./misound.channel');
const QqbotChannel = require('./qqbot.channel');
const MqttChannel = require('./mqtt.channel');

// 渠道类型到适配器的映射
const channelAdapters = {
  wechatclawbot: WechatclawbotChannel,
  yuanbaobot: YuabaobotChannel,
  wecom: WecomChannel,
  telegram: TelegramChannel,
  pushplus: PushPlusChannel,
  wxpusher: WxPusherChannel,
  feishu: FeishuChannel,
  dingtalk: DingtalkChannel,
  webhook: WebhookChannel,
  wechat_official: WechatOfficialChannel,
  serverchan: ServerChanChannel,
  smtp: SmtpChannel,
  gotify: GotifyChannel,
  meow: MeowChannel,
  wecomapp: WecomappChannel,
  bark: BarkChannel,
  pushme: PushMeChannel,
  xizhi: XizhiChannel,
  ntfy: NtfyChannel,
  pushdeer: PushDeerChannel,
  igot: IGotChannel,
  synologychat: SynologyChatChannel,
  showdoc: ShowDocChannel,
  misound: MisoundChannel,
  qqbot: QqbotChannel,
  mqtt: MqttChannel,
};

/**
 * 获取渠道适配器
 * @param {string} type - 渠道类型
 * @param {Object} config - 渠道配置
 * @returns {BaseChannel} - 渠道适配器实例
 */
function getChannelAdapter(type, config, channelId) {
  const AdapterClass = channelAdapters[type];
  if (!AdapterClass) {
    throw new Error(`不支持的渠道类型: ${type}`);
  }
  return new AdapterClass(config, channelId, type);
}

/**
 * 获取所有支持的渠道类型
 * @returns {Array<Object>} - 渠道类型列表
 */
function getChannelTypes() {
  return Object.entries(channelAdapters).map(([type, AdapterClass]) => ({
    type,
    name: AdapterClass.getName(),
    description: AdapterClass.getDescription(),
    configFields: AdapterClass.getConfigFields(),
  }));
}

/**
 * 获取指定渠道的类型信息（包含支持的消息类型）
 * @param {string} type - 渠道类型
 * @returns {Object|null} - 渠道类型信息，包含 supportedTypes 和 channelSpecificTypes
 */
function getChannelTypeInfo(type) {
  const AdapterClass = channelAdapters[type];
  if (!AdapterClass) {
    return null;
  }

  return {
    type,
    name: AdapterClass.getName(),
    description: AdapterClass.getDescription(),
    supportedTypes: AdapterClass.getSupportedTypes(),
    channelSpecificTypes: AdapterClass.getChannelSpecificTypes(),
  };
}

/**
 * 获取所有渠道的能力信息
 * @returns {Array<Object>} - 所有渠道的类型信息
 */
function getAllChannelsCapabilities() {
  return Object.entries(channelAdapters)
    .map(([type, AdapterClass]) => ({
      type,
      name: AdapterClass.getName(),
      description: AdapterClass.getDescription(),
      supportedTypes: AdapterClass.getSupportedTypes(),
      channelSpecificTypes: AdapterClass.getChannelSpecificTypes(),
    }))
    .filter(channel => channel.channelSpecificTypes.length > 0); // 只返回有特有类型的渠道
}

/**
 * 验证渠道配置
 * @param {string} type - 渠道类型
 * @param {Object} config - 渠道配置
 * @returns {Object} - 验证结果
 */
function validateChannelConfig(type, config) {
  const AdapterClass = channelAdapters[type];
  if (!AdapterClass) {
    return { valid: false, message: `不支持的渠道类型: ${type}` };
  }
  return AdapterClass.prototype.validate.call({ config }, config);
}

module.exports = {
  BaseChannel,
  WechatclawbotChannel,
  WecomChannel,
  TelegramChannel,
  PushPlusChannel,
  WxPusherChannel,
  FeishuChannel,
  DingtalkChannel,
  WebhookChannel,
  WechatOfficialChannel,
  ServerChanChannel,
  SmtpChannel,
  GotifyChannel,
  MeowChannel,
  WecomappChannel,
  BarkChannel,
  PushMeChannel,
  XizhiChannel,
  YuabaobotChannel,
  NtfyChannel,
  PushDeerChannel,
  IGotChannel,
  SynologyChatChannel,
  ShowDocChannel,
  MisoundChannel,
  QqbotChannel,
  MqttChannel,
  getChannelAdapter,
  getChannelTypes,
  getChannelTypeInfo,
  getAllChannelsCapabilities,
  validateChannelConfig,
  channelAdapters,
};
