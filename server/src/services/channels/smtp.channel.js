const nodemailer = require('nodemailer');
const BaseChannel = require('./base.channel');

/**
 * SMTP 邮件适配器
 * 通过 SMTP 协议发送邮件通知
 */
class SmtpChannel extends BaseChannel {
  constructor(config) {
    super(config);
    this.host = config.host;
    this.port = parseInt(config.port, 10) || 465;
    this.secure = config.secure !== false;
    this.user = config.user;
    this.pass = config.pass;
    this.from = config.from || config.user;
    this.to = config.to;
  }

  /**
   * 创建 SMTP 传输器
   */
  _createTransporter() {
    return nodemailer.createTransport({
      host: this.host,
      port: this.port,
      secure: this.secure,
      auth: {
        user: this.user,
        pass: this.pass,
      },
    });
  }

  async send(message) {
    const { title, content, type = 'text' } = message;

    if (!this.to) {
      throw new Error('收件人地址不能为空');
    }

    const transporter = this._createTransporter();

    const mailOptions = {
      from: this.from,
      to: this.to,
      subject: title || '通知',
    };

    if (type === 'html') {
      mailOptions.html = content;
    } else {
      mailOptions.text = content;
    }

    const info = await transporter.sendMail(mailOptions);

    return {
      success: true,
      messageId: info.messageId,
    };
  }

  validate(config) {
    if (!config.host || config.host.trim() === '') {
      return { valid: false, message: 'SMTP服务器地址不能为空' };
    }
    if (!config.port) {
      return { valid: false, message: '端口号不能为空' };
    }
    if (!config.user || config.user.trim() === '') {
      return { valid: false, message: '用户名不能为空' };
    }
    if (!config.pass || config.pass.trim() === '') {
      return { valid: false, message: '密码不能为空' };
    }
    if (!config.to || config.to.trim() === '') {
      return { valid: false, message: '收件人地址不能为空' };
    }

    const port = parseInt(config.port, 10);
    if (isNaN(port) || port < 1 || port > 65535) {
      return { valid: false, message: '端口号无效，应为1-65535之间的数字' };
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
      return { success: true, message: '邮件发送测试成功' };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  static getName() {
    return 'SMTP邮件';
  }

  static getDescription() {
    return '通过SMTP协议发送邮件通知，支持QQ邮箱、163邮箱、Gmail等';
  }

  static getConfigFields() {
    return [
      {
        name: 'host',
        label: 'SMTP服务器',
        type: 'text',
        required: true,
        placeholder: 'smtp.qq.com',
        description: 'SMTP服务器地址',
      },
      {
        name: 'port',
        label: '端口',
        type: 'number',
        required: true,
        placeholder: '465',
        description: 'SSL通常为465，TLS通常为587',
      },
      {
        name: 'secure',
        label: '启用SSL/TLS',
        type: 'switch',
        required: false,
        description: '端口465使用SSL需开启，端口587使用STARTTLS需关闭（后端会自动协商加密）',
      },
      {
        name: 'user',
        label: '用户名',
        type: 'text',
        required: true,
        placeholder: 'your@email.com',
        description: '邮箱账号',
      },
      {
        name: 'pass',
        label: '密码/授权码',
        type: 'password',
        required: true,
        placeholder: '请输入密码或授权码',
        description: '邮箱密码或第三方授权码（QQ邮箱需使用授权码）',
      },
      {
        name: 'from',
        label: '发件人地址（可选）',
        type: 'text',
        required: false,
        placeholder: '默认与用户名相同',
        description: '发件人显示地址，留空则使用用户名',
      },
      {
        name: 'to',
        label: '收件人地址',
        type: 'text',
        required: true,
        placeholder: 'recipient@email.com',
        description: '收件人邮箱地址，多个用英文逗号分隔',
      },
    ];
  }
}

module.exports = SmtpChannel;
