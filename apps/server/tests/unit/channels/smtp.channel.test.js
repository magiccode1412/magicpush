/**
 * SmtpChannel 单元测试（基于 Node 内置 node:test，无第三方依赖）
 *
 * 通过覆盖 require.cache 中的 nodemailer 注入 Mock 传输器，
 * 验证配置校验、html/text 分支、收件人必填及发送结果。
 */
const { test } = require('node:test');
const assert = require('node:assert');

let sentMail = null;
let sendMailImpl = (opts) => {
  sentMail = opts;
  return Promise.resolve({ messageId: '<123@magical-push>' });
};
const nodemailerPath = require.resolve('nodemailer');
require.cache[nodemailerPath] = {
  id: nodemailerPath,
  filename: nodemailerPath,
  loaded: true,
  exports: {
    createTransport: () => ({
      sendMail: (opts) => sendMailImpl(opts),
    }),
  },
};

const SmtpChannel = require('../../../src/services/channels/smtp.channel');

test('validate：必填项与端口范围', () => {
  const ch = new SmtpChannel({});
  assert.strictEqual(ch.validate({ host: '', user: 'u', pass: 'p', to: 't@x.com' }).valid, false);
  assert.strictEqual(ch.validate({ host: 'h', port: 0, user: 'u', pass: 'p', to: 't@x.com' }).valid, false);
  assert.strictEqual(ch.validate({ host: 'h', port: 70000, user: 'u', pass: 'p', to: 't@x.com' }).valid, false);
  assert.strictEqual(ch.validate({ host: 'h', port: 465, user: '', pass: 'p', to: 't@x.com' }).valid, false);
  assert.strictEqual(ch.validate({ host: 'h', port: 465, user: 'u', pass: '', to: 't@x.com' }).valid, false);
  assert.strictEqual(ch.validate({ host: 'h', port: 465, user: 'u', pass: 'p', to: '' }).valid, false);
  assert.strictEqual(ch.validate({ host: 'h', port: 465, user: 'u', pass: 'p', to: 't@x.com' }).valid, true);
});

test('send：html 类型使用 mailOptions.html', async () => {
  const ch = new SmtpChannel({ host: 'smtp.qq.com', port: 465, user: 'a@b.com', pass: 'p', to: 'c@d.com' });
  const r = await ch.send({ title: 'T', content: '<b>C</b>', type: 'html' });
  assert.strictEqual(sentMail.html, '<b>C</b>');
  assert.strictEqual(sentMail.text, undefined);
  assert.strictEqual(sentMail.to, 'c@d.com');
  assert.strictEqual(r.messageId, '<123@magical-push>');
});

test('send：text 类型使用 mailOptions.text', async () => {
  const ch = new SmtpChannel({ host: 'h', port: 465, user: 'u', pass: 'p', to: 't@x.com' });
  await ch.send({ title: 'T', content: '纯文本', type: 'text' });
  assert.strictEqual(sentMail.text, '纯文本');
  assert.strictEqual(sentMail.html, undefined);
});

test('send：缺少收件人抛错', async () => {
  const ch = new SmtpChannel({ host: 'h', port: 465, user: 'u', pass: 'p' });
  await assert.rejects(() => ch.send({ title: 't', content: 'c' }), /收件人地址不能为空/);
});

test('test：发送成功返回 success:true', async () => {
  const ch = new SmtpChannel({ host: 'h', port: 465, user: 'u', pass: 'p', to: 't@x.com' });
  const r = await ch.test();
  assert.strictEqual(r.success, true);
  assert.strictEqual(r.message, '邮件发送测试成功');
});

test('test：发送失败返回 success:false 与错误信息', async () => {
  sendMailImpl = () => Promise.reject(new Error('smtp down'));
  const ch = new SmtpChannel({ host: 'h', port: 465, user: 'u', pass: 'p', to: 't@x.com' });
  const r = await ch.test();
  assert.strictEqual(r.success, false);
  assert.strictEqual(r.message, 'smtp down');
});
