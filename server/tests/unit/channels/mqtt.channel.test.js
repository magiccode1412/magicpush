/**
 * MqttChannel 单元测试（基于 Node 内置 node:test，无第三方依赖）
 *
 * 通过覆盖 require.cache 中的 mqtt 注入 Mock，
 * 验证 brokerUrl 规范化、qos 边界裁剪、payload 格式（json/text）、
 * retain/skipTlsVerify 解析、topic 校验、validate 规则与 test() 成功/失败分支。
 */
const { test, beforeEach } = require('node:test');
const assert = require('node:assert');

// ---- Mock mqtt 库 ----
let lastConnect = null; // { url, opts }
let lastPublish = null; // { topic, payload, opts }
let publishShouldFail = false;

const fakeClient = {
  on(event, cb) {
    if (event === 'connect') {
      // 模拟异步连接成功
      setImmediate(() => cb());
    }
    // error 事件在此测试中不触发
    return fakeClient;
  },
  publish(topic, payload, opts, cb) {
    lastPublish = { topic, payload, opts };
    if (publishShouldFail) {
      cb(new Error('publish failed'));
    } else {
      cb(null);
    }
  },
  end() {
    return fakeClient;
  },
};

const mqttPath = require.resolve('mqtt');
delete require.cache[mqttPath];
require.cache[mqttPath] = {
  id: mqttPath,
  filename: mqttPath,
  loaded: true,
  exports: {
    connect: (url, opts) => {
      lastConnect = { url, opts };
      return fakeClient;
    },
  },
};

const MqttChannel = require('../../../src/services/channels/mqtt.channel');

const BROKER = 'mqtt://broker.example.com:1883/';

beforeEach(() => {
  lastConnect = null;
  lastPublish = null;
  publishShouldFail = false;
});

test('构造：brokerUrl 去除尾部斜杠', () => {
  const ch = new MqttChannel({ brokerUrl: BROKER, topic: 't' });
  assert.strictEqual(ch.brokerUrl, 'mqtt://broker.example.com:1883');
});

test('构造：qos 越界回退默认 0', () => {
  const ch = new MqttChannel({ brokerUrl: 'mqtt://b:1883', topic: 't', qos: 9 });
  assert.strictEqual(ch.qos, 0);
});

test('构造：qos 合法值保留', () => {
  const ch = new MqttChannel({ brokerUrl: 'mqtt://b:1883', topic: 't', qos: 2 });
  assert.strictEqual(ch.qos, 2);
});

test('构造：retain / skipTlsVerify 字符串解析为布尔', () => {
  const ch = new MqttChannel({ brokerUrl: 'mqtt://b:1883', topic: 't', retain: 'true', skipTlsVerify: 'true' });
  assert.strictEqual(ch.retain, true);
  assert.strictEqual(ch.skipTlsVerify, true);
});

test('构造：payloadFormat 默认 json，text 时保留', () => {
  const ch1 = new MqttChannel({ brokerUrl: 'mqtt://b:1883', topic: 't' });
  assert.strictEqual(ch1.payloadFormat, 'json');
  const ch2 = new MqttChannel({ brokerUrl: 'mqtt://b:1883', topic: 't', payloadFormat: 'text' });
  assert.strictEqual(ch2.payloadFormat, 'text');
});

test('send：json 格式构建 payload 并带 qos/retain', async () => {
  const ch = new MqttChannel({
    brokerUrl: 'mqtt://b:1883',
    topic: 'magicpush/alerts',
    qos: 1,
    retain: 'true',
  });
  await ch.send({ title: 'T', content: 'C', type: 'text' });
  assert.strictEqual(lastConnect.url, 'mqtt://b:1883');
  assert.strictEqual(lastPublish.topic, 'magicpush/alerts');
  assert.strictEqual(lastPublish.opts.qos, 1);
  assert.strictEqual(lastPublish.opts.retain, true);
  const parsed = JSON.parse(lastPublish.payload);
  assert.strictEqual(parsed.title, 'T');
  assert.strictEqual(parsed.content, 'C');
  assert.strictEqual(parsed.type, 'text');
  assert.ok(typeof parsed.timestamp === 'number');
});

test('send：text 格式 payload 为 title+换行+content', async () => {
  const ch = new MqttChannel({ brokerUrl: 'mqtt://b:1883', topic: 't', payloadFormat: 'text' });
  await ch.send({ title: 'T', content: 'C' });
  assert.strictEqual(lastPublish.payload, 'T\nC');
});

test('send：text 格式无标题时仅 content', async () => {
  const ch = new MqttChannel({ brokerUrl: 'mqtt://b:1883', topic: 't', payloadFormat: 'text' });
  await ch.send({ content: 'C' });
  assert.strictEqual(lastPublish.payload, 'C');
});

test('send：skipTlsVerify 控制 rejectUnauthorized', async () => {
  const ch = new MqttChannel({ brokerUrl: 'mqtts://b:8883', topic: 't', skipTlsVerify: 'true' });
  await ch.send({ content: 'C' });
  assert.strictEqual(lastConnect.opts.rejectUnauthorized, false);

  const ch2 = new MqttChannel({ brokerUrl: 'mqtts://b:8883', topic: 't' });
  await ch2.send({ content: 'C' });
  assert.strictEqual(lastConnect.opts.rejectUnauthorized, true);
});

test('send：凭据与 clientId 透传', async () => {
  const ch = new MqttChannel({
    brokerUrl: 'mqtt://b:1883',
    topic: 't',
    username: 'u',
    password: 'p',
    clientId: 'cid',
  });
  await ch.send({ content: 'C' });
  assert.strictEqual(lastConnect.opts.username, 'u');
  assert.strictEqual(lastConnect.opts.password, 'p');
  assert.strictEqual(lastConnect.opts.clientId, 'cid');
});

test('send：发布失败时抛出错误', async () => {
  publishShouldFail = true;
  const ch = new MqttChannel({ brokerUrl: 'mqtt://b:1883', topic: 't' });
  await assert.rejects(() => ch.send({ content: 'C' }), /publish failed/);
});

test('validate：brokerUrl / topic 必填', () => {
  const ch = new MqttChannel({ brokerUrl: 'mqtt://b:1883', topic: 't' });
  assert.strictEqual(ch.validate({ brokerUrl: '', topic: 't' }).valid, false);
  assert.strictEqual(ch.validate({ brokerUrl: 'mqtt://b:1883', topic: '' }).valid, false);
});

test('validate：brokerUrl 协议合法性', () => {
  const ch = new MqttChannel({ brokerUrl: 'mqtt://b:1883', topic: 't' });
  assert.strictEqual(ch.validate({ brokerUrl: 'http://b:1883', topic: 't' }).valid, false);
  assert.strictEqual(ch.validate({ brokerUrl: 'not-a-url', topic: 't' }).valid, false);
  assert.strictEqual(ch.validate({ brokerUrl: 'mqtts://b:8883', topic: 't' }).valid, true);
});

test('validate：topic 不能以通配符开头且不能含空格', () => {
  const ch = new MqttChannel({ brokerUrl: 'mqtt://b:1883', topic: 't' });
  assert.strictEqual(ch.validate({ brokerUrl: 'mqtt://b:1883', topic: '#x' }).valid, false);
  assert.strictEqual(ch.validate({ brokerUrl: 'mqtt://b:1883', topic: '+x' }).valid, false);
  assert.strictEqual(ch.validate({ brokerUrl: 'mqtt://b:1883', topic: 'a b' }).valid, false);
  assert.strictEqual(ch.validate({ brokerUrl: 'mqtt://b:1883', topic: 'a/b/c' }).valid, true);
});

test('test：成功分支', async () => {
  const ch = new MqttChannel({ brokerUrl: 'mqtt://b:1883', topic: 't' });
  const res = await ch.test();
  assert.strictEqual(res.success, true);
  assert.strictEqual(res.message, '测试消息发送成功');
});

test('test：失败分支返回错误信息', async () => {
  publishShouldFail = true;
  const ch = new MqttChannel({ brokerUrl: 'mqtt://b:1883', topic: 't' });
  const res = await ch.test();
  assert.strictEqual(res.success, false);
  assert.strictEqual(res.message, 'publish failed');
});

test('静态方法：名称/描述/配置字段', () => {
  assert.strictEqual(MqttChannel.getName(), 'MQTT');
  assert.ok(MqttChannel.getDescription().length > 0);
  const fields = MqttChannel.getConfigFields();
  const names = fields.map(f => f.name);
  assert.ok(names.includes('brokerUrl'));
  assert.ok(names.includes('topic'));
  assert.ok(names.includes('qos'));
  assert.ok(names.includes('payloadFormat'));
});
