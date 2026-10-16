/**
 * XiaomiAuthService 单元测试（基于 Node 内置 node:test，无第三方依赖）
 *
 * 覆盖公开静态方法：
 *  - signedNonce / generateSignature（签名，与 crypto 复算一致）
 *  - generateNonce（结构校验）
 *  - createSession / getSession / deleteSession（内存会话管理）
 *  - encryptRc4 / generateEncParams（RC4 加密，依赖 OpenSSL legacy provider）
 *
 * 说明：
 *  - 模块加载时会启动一个会话清理 setInterval，为避免其挂起测试进程，
 *    在 require 前临时将 global.setInterval 置为 no-op。
 *  - encryptRc4 使用 RC4 算法，在 OpenSSL 3（Node 17+）中默认禁用，
 *    需通过 --openssl-legacy-provider 启用；当前环境若不支持则跳过这两个用例。
 */
const { test } = require('node:test');
const assert = require('node:assert');
const crypto = require('crypto');

function rc4Supported() {
  try {
    const c = crypto.createCipheriv('rc4', Buffer.from('k'), null);
    c.update(Buffer.from('x'));
    c.final();
    return true;
  } catch {
    return false;
  }
}
const RC4_OK = rc4Supported();

const _setInterval = global.setInterval;
global.setInterval = () => 0; // 屏蔽后台定时器，避免测试进程无法退出
const XiaomiAuthService = require('../../../src/services/xiaomi-auth.service');
global.setInterval = _setInterval;

test('signedNonce：与 SHA256(secret|nonce) 复算一致', () => {
  const ssecurity = Buffer.from('my-secret-key').toString('base64');
  const nonce = Buffer.from('my-nonce').toString('base64');
  const expected = crypto
    .createHash('sha256')
    .update(Buffer.concat([Buffer.from(ssecurity, 'base64'), Buffer.from(nonce, 'base64')]))
    .digest('base64');
  assert.strictEqual(XiaomiAuthService.signedNonce(ssecurity, nonce), expected);
});

test('generateSignature：与 HMAC-SHA256 复算一致', () => {
  const uri = '/api/device';
  const signedNonce = Buffer.from('signed').toString('base64');
  const nonce = Buffer.from('nonce').toString('base64');
  const data = '{"name":"x"}';
  const signString = [uri, signedNonce, nonce, `data=${data}`].join('&');
  const expected = crypto
    .createHmac('sha256', Buffer.from(signedNonce, 'base64'))
    .update(signString)
    .digest('base64');
  assert.strictEqual(XiaomiAuthService.generateSignature(uri, signedNonce, nonce, data), expected);
});

test('encryptRc4：RC4 对称，加密后解密还原', { skip: !RC4_OK }, () => {
  const key = Buffer.from('rc4-key');
  const plain = Buffer.from('hello xiaomi');
  const enc = XiaomiAuthService.encryptRc4(key, plain);
  assert.notDeepStrictEqual(enc, plain);
  const dec = XiaomiAuthService.encryptRc4(key, enc); // RC4 解密 = 再次加密
  assert.strictEqual(dec.toString('utf-8'), 'hello xiaomi');
});

test('generateEncParams：保留 _nonce/signature，其余 RC4 加密', { skip: !RC4_OK }, () => {
  const signedNonce = Buffer.from('secret').toString('base64');
  const result = XiaomiAuthService.generateEncParams(signedNonce, 'n', {
    a: 'hello',
    _nonce: 'keep',
    signature: 'sig',
  });
  assert.strictEqual(result._nonce, 'keep');
  assert.strictEqual(result.signature, 'sig');
  const dec = XiaomiAuthService.encryptRc4(Buffer.from(signedNonce, 'base64'), Buffer.from(result.a, 'base64'));
  assert.strictEqual(dec.toString('utf-8'), 'hello');
});

test('会话管理：create/get/delete', () => {
  const sid = XiaomiAuthService.createSession({ lpUrl: 'https://x/lp', cookies: {} });
  assert.strictEqual(typeof sid, 'string');
  const sess = XiaomiAuthService.getSession(sid);
  assert.ok(sess);
  assert.strictEqual(sess.lpUrl, 'https://x/lp');
  XiaomiAuthService.deleteSession(sid);
  assert.strictEqual(XiaomiAuthService.getSession(sid), null);
});

test('generateNonce：输出为 12 字节的 base64', () => {
  const ssecurity = Buffer.from('sec').toString('base64');
  const nonce = XiaomiAuthService.generateNonce(ssecurity);
  const buf = Buffer.from(nonce, 'base64');
  assert.strictEqual(buf.length, 12); // 8 随机 + 4 分钟时间戳
});
