const axios = require('axios');
const BaseChannel = require('./base.channel');
const logger = require('../../utils/logger');

/**
 * 飞书群机器人适配器
 *
 * 支持的消息类型：
 * - 通用类型: text, markdown, html(自动转为text)
 * - 特有类型: post(富文本), image(图片), interactive_card(交互卡片), share_chat(群名片)
 */
class FeishuChannel extends BaseChannel {
  constructor(config, channelKey) {
    super(config, channelKey);
    this.webhookUrl = config.webhookUrl;
    this.secret = config.secret || '';
  }


  /**
   * 生成飞书签名
   */
  generateSign(timestamp) {
    if (!this.secret) return '';
    
    const crypto = require('crypto');
    const stringToSign = `${timestamp}\n${this.secret}`;
    const hmac = crypto.createHmac('sha256', stringToSign);
    const signature = hmac.digest('base64');
    return signature;
  }

  /**
   * 构建带签名的请求配置
   */
  _buildSignedPayload(msgType, content, extra = {}) {
    const timestamp = Math.floor(Date.now() / 1000);
    return {
      timestamp: timestamp,
      sign: this.generateSign(timestamp),
      msg_type: msgType,
      // 飞书消息体均以消息类型为顶层键：如 post/image/share_chat；interactive 特例为 card
      [msgType === 'interactive' ? 'card' : msgType]: content,
      ...extra,
    };
  }

  async send(message) {
    let { title, content, type = 'text', channelType, extraData } = message;

    // 有 channelType → 走特有消息分支
    if (channelType) {
      // extraData 已经在 push.service 中通过命名空间提取，直接使用
      return await this.sendChannelSpecific(channelType, extraData);
    }

    // HTML类型：剥离HTML标签，转为纯文本发送
    if (type === 'html') {
      content = BaseChannel.stripHtmlTags(content);
      type = 'text';
    }

    // 通用类型处理（保持原有逻辑不变）
    let payload;
    const timestamp = Math.floor(Date.now() / 1000);

    if (type === 'markdown') {
      payload = {
        timestamp: timestamp,
        sign: this.generateSign(timestamp),
        msg_type: 'interactive',
        card: {
          header: {
            title: {
              tag: 'plain_text',
              content: title || '消息通知',
            },
          },
          elements: [
            {
              tag: 'div',
              text: {
                tag: 'lark_md',
                content: content,
              },
            },
          ],
        },
      };
    } else {
      // text类型
      const text = title ? `${title}\n\n${content}` : content;
      payload = {
        timestamp: timestamp,
        sign: this.generateSign(timestamp),
        msg_type: 'text',
        content: {
          text: text,
        },
      };
    }

    const response = await axios.post(this.webhookUrl, payload, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 10000,
    });

    if (response.data.code !== 0) {
      throw new Error(`飞书发送失败: ${response.data.msg}`);
    }

    return {
      success: true,
      messageId: response.data.data ? response.data.data.message_id : null,
    };
  }

  /**
   * 处理渠道特有类型的消息
   */
  async sendChannelSpecific(channelType, extraData) {
    switch (channelType) {
      case 'post':
        return await this.sendPost(extraData);
      case 'image':
        return await this.sendImage(extraData);
      case 'interactive_card':
        return await this.sendInteractiveCard(extraData);
      case 'share_chat':
        return await this.sendShareChat(extraData);
      default:
        throw new Error(`不支持的渠道特有类型: ${channelType}`);
    }
  }

  /**
   * 发送富文本消息（post）
   * 文档: https://open.feishu.cn/document/server-docs/group/custom-bot/send#8a28e2e4
   */
  async sendPost(data) {
    if (!data || !data.content) {
      throw new Error('富文本消息必须包含 content（内容数组）');
    }

    const payload = this._buildSignedPayload('post', {
      zh_cn: {
        title: data.title || '消息通知',
        content: data.content,
      },
    });

    logger.info(`飞书发送富文本消息: title=${data.title || '(无)'}`);
    const response = await axios.post(this.webhookUrl, payload, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 10000,
    });

    if (response.data.code !== 0) {
      throw new Error(`飞书富文本消息发送失败: ${response.data.msg}`);
    }

    return {
      success: true,
      messageId: response.data.data ? response.data.data.message_id : null,
      type: 'post',
    };
  }

  /**
   * 发送图片消息
   * 支持 image_key 或 image_content(base64 data URL)
   */
  async sendImage(data) {
    if (!data) {
      throw new Error('图片数据不能为空');
    }
    if (!data.image_key && !data.base64) {
      throw new Error('图片消息必须包含 image_key 或 base64 数据');
    }

    let content;
    if (data.image_key) {
      content = { image_key: data.image_key };
    } else {
      content = { image_content: `data:image/png;base64,${data.base64}` };
    }

    const payload = this._buildSignedPayload('image', content);
    // 飞书 image 消息体键名为 image（与 _buildSignedPayload 的 msgType 键一致）

    logger.info(`飞书发送图片消息`);
    const response = await axios.post(this.webhookUrl, payload, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 15000,
    });

    if (response.data.code !== 0) {
      throw new Error(`飞书图片消息发送失败: ${response.data.msg}`);
    }

    return {
      success: true,
      messageId: response.data.data ? response.data.data.message_id : null,
      type: 'image',
    };
  }

  /**
   * 发送交互式卡片消息
   * 完整的 interactive 卡片，支持按钮、表单等丰富交互元素
   * 文档: https://open.feishu.cn/document/server-docs/group/custom-bot-send/card_message
   */
  async sendInteractiveCard(data) {
    if (!data || !data.card) {
      throw new Error('交互卡片必须包含 card（卡片对象）');
    }

    const payload = this._buildSignedPayload('interactive', data.card);

    logger.info(`飞书发送交互式卡片消息`);
    const response = await axios.post(this.webhookUrl, payload, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 10000,
    });

    if (response.data.code !== 0) {
      throw new Error(`飞书交互卡片发送失败: ${response.data.msg}`);
    }

    return {
      success: true,
      messageId: response.data.data ? response.data.data.message_id : null,
      type: 'interactive_card',
    };
  }

  /**
   * 发送群名片分享消息
   */
  async sendShareChat(data) {
    if (!data || !data.share_chat_id) {
      throw new Error('群名片分享必须包含 share_chat_id');
    }

    const payload = this._buildSignedPayload('share_chat', {
      share_chat_id: data.share_chat_id,
    }, { msg_type: 'share_chat' });
    // share_chat 的格式不同，需要特殊处理
    delete payload.content;
    payload.share_chat = {
      share_chat_id: data.share_chat_id,
    };

    logger.info(`飞书发送群名片分享: id=${data.share_chat_id}`);
    const response = await axios.post(this.webhookUrl, payload, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 10000,
    });

    if (response.data.code !== 0) {
      throw new Error(`飞书群名片分享失败: ${response.data.msg}`);
    }

    return {
      success: true,
      messageId: response.data.data ? response.data.data.message_id : null,
      type: 'share_chat',
    };
  }

  validate(config) {
    if (!config.webhookUrl || config.webhookUrl.trim() === '') {
      return { valid: false, message: 'Webhook地址不能为空' };
    }
    if (!config.webhookUrl.startsWith('https://open.feishu.cn/open-apis/bot/v2/hook/')) {
      return { valid: false, message: 'Webhook地址格式不正确' };
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
    return '飞书';
  }

  static getDescription() {
    return '飞书群机器人，支持文本、Markdown、富文本、图片、交互卡片和群名片';
  }

  static getSupportedTypes() {
    return ['text', 'markdown', 'html'];
  }

  static getChannelSpecificTypes() {
    return [
      {
        value: 'post',
        label: '富文本消息',
        icon: '📝',
        description: '支持多段落、链接、@人等富文本内容',
        fields: [
          { name: 'title', label: '标题', type: 'text', required: false, maxLength: 128 },
          {
            name: 'content',
            label: '内容（段落列表）',
            type: 'array',
            required: true,
            itemFields: [
              { name: 'tag', label: '标签类型', type: 'select', required: true, options: [
                { value: 'text', label: '纯文本' },
                { value: 'a', label: '超链接' },
                { value: 'at', label: '@人' },
              ]},
              { name: 'text', label: '文本内容', type: 'text', required: true },
              { name: 'href', label: '链接地址', type: 'url', required: false },
              { name: 'user_id', label: '用户ID(@人)', type: 'text', required: false },
            ],
          },
        ],
        example: {
          channelType: 'post',
          extraData: {
            feishu: {
              title: '项目更新通知',
              content: [
                [{ tag: 'text', text: '项目有新的更新：' }],
                [{ tag: 'a', text: '查看详情', href: 'https://example.com/update' }],
                [{ tag: 'at', text: '', user_id: 'ou_xxx' }],
              ]
            }
          }
        }
      },
      {
        value: 'interactive_card',
        label: '交互卡片',
        icon: '🃏',
        description: '完整的交互式卡片消息，支持标题、内容和按钮等元素',
        fields: [
          {
            name: 'card',
            label: '卡片对象(JSON)',
            type: 'textarea',
            required: true,
            description: '完整的飞书卡片JSON对象，含header和elements',
          },
        ],
        example: {
          channelType: 'interactive_card',
          extraData: {
            feishu: {
              card: {
                header: {
                  title: { tag: 'plain_text', content: '系统通知' },
                  template: 'blue'
                },
                elements: [
                  { tag: 'div', text: { tag: 'lark_md', content: '**服务器状态**: 正常运行\n**CPU使用率**: 45%' } },
                  {
                    tag: 'action',
                    actions: [
                      { tag: 'button', text: { tag: 'plain_text', content: '查看详情' }, url: 'https://example.com', type: 'primary' }
                    ]
                  }
                ]
              }
            }
          }
        }
      },
      {
        value: 'image',
        label: '图片消息',
        icon: '🖼️',
        description: '发送图片，支持 image_key 或 Base64 编码',
        fields: [
          { name: 'image_key', label: '图片Key', type: 'text', required: false, description: '通过上传接口获取的图片key' },
          { name: 'base64', label: 'Base64编码', type: 'textarea', required: false, description: '与 image_key 二选一，图片的Base64编码字符串' },
        ],
        example: {
          channelType: 'image',
          extraData: {
            feishu: {
              base64: '/9j/4AAQSkZJRgABAQAAAQABAAD...'
            }
          }
        }
      },
      {
        value: 'share_chat',
        label: '群名片分享',
        icon: '👥',
        description: '分享群聊的电子名片',
        fields: [
          { name: 'share_chat_id', label: '群聊ID', type: 'text', required: true, description: '目标群聊的 open_chat_id' },
        ],
        example: {
          channelType: 'share_chat',
          extraData: {
            feishu: {
              share_chat_id: 'oc_xxxxxxxx'
            }
          }
        }
      },
    ];
  }

  static getConfigFields() {
    return [
      {
        name: 'webhookUrl',
        label: 'Webhook地址',
        type: 'text',
        required: true,
        placeholder: '请输入飞书机器人Webhook地址',
        description: '在飞书群中添加自定义机器人后获取的Webhook地址',
      },
      {
        name: 'secret',
        label: 'Secret密钥（可选）',
        type: 'text',
        required: false,
        placeholder: '如有签名校验请输入Secret',
        description: '启用签名校验时的密钥',
      },
      {
        name: '_docLinks',
        label: '官方文档',
        type: 'links',
        required: false,
        links: [
          {
            label: '查看飞书自定义机器人创建指南',
            url: 'https://open.feishu.cn/document/client-docs/bot-v3/add-custom-bot#355ec8c0',
          },
        ],
      },
    ];
  }
}

module.exports = FeishuChannel;
