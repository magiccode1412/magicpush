/**
 * API 集成测试（基于 Node 内置 node:test + http，无第三方依赖）
 *
 * 覆盖三条核心链路的「HTTP → 路由 → 中间件 → 控制器 → 服务 → 模型 → SQLite」全流程：
 *   1. 鉴权：登录、注册开关、JWT 保护路由
 *   2. 限流：超过阈值返回 429
 *   3. 推送：按令牌/接口 ID 推送、关键词过滤、禁用接口、校验、发送失败、入站接收
 *
 * 隔离策略：
 *   - 使用临时 SQLite 数据库（DB_PATH 指向系统临时目录），测试结束后删除，互不污染。
 *   - 仅 mock 渠道适配器（services/channels 的 getChannelAdapter），拦截真实对外网络发送；
 *     其余组件（鉴权、限流、校验、控制器、服务、模型、数据库）均为真实实现。
 *   - 不引入 app.js（其含 listen 与各类 Bot 监控/定时器副作用），而是按 app.js 相同的中间件
 *     链路自建最小 Express 应用，仅挂载被测路由，保证测试轻量、无悬挂句柄。
 */

// ── 环境隔离：必须在 require 任何加载数据库的模块之前设置 ──────────────
const path = require('path');
const os = require('os');
const fs = require('fs');
const http = require('http');

const tmpDb = path.join(os.tmpdir(), `mp_integ_${process.pid}_${Date.now()}.db`);
process.env.DB_PATH = tmpDb;
process.env.NODE_ENV = 'test'; // 非 development，避免初始化脚本自动创建 admin 并关闭注册
process.env.JWT_SECRET = 'integration-test-secret'; // 固定密钥，令牌可确定性验证

const { test, before, after } = require('node:test');
const assert = require('node:assert');

// ── 注入渠道适配器 Mock：必须在 require 路由（间接加载 push.service）之前 ──
const channelsPath = require.resolve('../../src/services/channels');
const adapterState = { fail: false }; // 可控开关：模拟发送失败
require.cache[channelsPath] = {
  id: channelsPath,
  filename: channelsPath,
  loaded: true,
  exports: {
    getChannelAdapter: () => ({
      async send() {
        if (adapterState.fail) {
          throw new Error('模拟发送失败');
        }
        return { success: true, messageId: 'test-msg' };
      },
    }),
  },
};

// ── 真实模块（走临时数据库）──────────────────────────────────────
const express = require('express');
const initDatabase = require('../../src/database/init');
const db = require('../../src/config/database');
const { ChannelModel, EndpointModel } = require('../../src/models');
const AuthService = require('../../src/services/auth.service');
const RateLimitConfigService = require('../../src/services/rateLimitConfig.service');

const authRoutes = require('../../src/routes/auth.routes');
const pushRoutes = require('../../src/routes/push.routes');
const inboundRoutes = require('../../src/routes/inbound.routes');
const { globalLimiter } = require('../../src/middleware/rateLimit.middleware');
const { errorMiddleware, notFoundMiddleware } = require('../../src/middleware/error.middleware');

// ── 构建最小应用（镜像 app.js 的请求处理链路，不含 listen 与监控副作用）──
const app = express();
app.set('trust proxy', 1); // 与 app.js 一致：信任第一跳代理，X-Forwarded-For 生效
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(globalLimiter);
app.use('/api/auth', authRoutes);
app.use('/api/push', pushRoutes);
app.use('/api/inbound', inboundRoutes);
app.use(notFoundMiddleware);
app.use(errorMiddleware);

// ── 测试共享状态 ────────────────────────────────────────────────
let server;
let port;
let admin;                 // 注册返回：{ user, accessToken, refreshToken, expiresIn }
let userId;
let channelId;
let endpointId;
const ENDPOINT_TOKEN = 'testtoken123456';
const DISABLED_TOKEN = 'disabledtoken123';
const KEYWORD_TOKEN = 'kwtoken123456';
const INBOUND_TOKEN = 'inboundtoken1234';

// ── HTTP 请求辅助（内置 http，不依赖 fetch/supertest）──────────────
function api(method, pathname, { token, body, headers = {} } = {}) {
  return new Promise((resolve, reject) => {
    const h = { ...headers };
    let data = null;
    if (body !== undefined) {
      data = JSON.stringify(body);
      h['Content-Type'] = 'application/json';
      h['Content-Length'] = Buffer.byteLength(data);
    }
    if (token) h['Authorization'] = `Bearer ${token}`;

    const req = http.request(
      { hostname: '127.0.0.1', port, path: pathname, method, headers: h },
      (res) => {
        let raw = '';
        res.on('data', (c) => (raw += c));
        res.on('end', () => {
          let json = null;
          try {
            json = raw ? JSON.parse(raw) : null;
          } catch {
            json = raw;
          }
          resolve({ status: res.statusCode, body: json });
        });
      }
    );
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

before(async () => {
  await initDatabase();
  RateLimitConfigService.setEnabled(false); // 默认关闭限流，避免污染大多数用例

  // 注册管理员（首个用户 → admin；注册后自动关闭注册）
  admin = await AuthService.register({
    username: 'admin',
    email: 'admin@test.com',
    password: 'admin123',
  });
  userId = admin.user.id;

  // 一个可用的 webhook 渠道
  const ch = ChannelModel.create({
    user_id: userId,
    channel_type: 'webhook',
    name: 'WH',
    config: { url: 'https://hook.test/x' },
    is_active: true,
  });
  channelId = ch.id;

  // 正常接口（启用）+ 绑定渠道
  const ep = EndpointModel.create({ user_id: userId, name: 'EP', token: ENDPOINT_TOKEN, is_active: true });
  endpointId = ep.id;
  EndpointModel.bindChannel(endpointId, channelId);

  // 禁用接口 + 绑定渠道
  const epd = EndpointModel.create({ user_id: userId, name: 'EPD', token: DISABLED_TOKEN, is_active: false });
  EndpointModel.bindChannel(epd.id, channelId);

  // 关键词过滤接口（黑名单命中 spam）+ 绑定渠道
  const epk = EndpointModel.create({
    user_id: userId,
    name: 'EPK',
    token: KEYWORD_TOKEN,
    is_active: true,
    keyword_filter: { enabled: true, mode: 'blacklist', keywords: ['spam'] },
  });
  EndpointModel.bindChannel(epk.id, channelId);

  // 入站启用接口 + 绑定渠道
  const epi = EndpointModel.create({
    user_id: userId,
    name: 'EPI',
    token: INBOUND_TOKEN,
    is_active: true,
    inbound_config: { enabled: true, sourceType: 'generic', fieldMapping: { content: 'msg' } },
  });
  EndpointModel.bindChannel(epi.id, channelId);

  // 启动临时服务器（随机端口）
  server = http.createServer(app);
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  port = server.address().port;
});

after(async () => {
  if (server) await new Promise((r) => server.close(r));
  try {
    db.close();
  } catch { /* ignore */ }
  for (const f of [tmpDb, `${tmpDb}-wal`, `${tmpDb}-shm`]) {
    try {
      fs.unlinkSync(f);
    } catch { /* ignore */ }
  }
});

// ==================== 鉴权 ====================

test('鉴权：登录正确凭证返回令牌与用户信息', async () => {
  const res = await api('POST', '/api/auth/login', { body: { email: 'admin@test.com', password: 'admin123' } });
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.success, true);
  assert.ok(res.body.data.accessToken, '应返回 accessToken');
  assert.strictEqual(res.body.data.user.role, 'admin');
});

test('鉴权：登录密码错误 → 400', async () => {
  const res = await api('POST', '/api/auth/login', { body: { email: 'admin@test.com', password: 'wrong' } });
  assert.strictEqual(res.status, 400);
  assert.strictEqual(res.body.success, false);
  assert.strictEqual(res.body.message, '邮箱或密码错误');
});

test('鉴权：登录缺少邮箱 → 400 参数校验', async () => {
  const res = await api('POST', '/api/auth/login', { body: { password: 'x' } });
  assert.strictEqual(res.status, 400);
  assert.match(res.body.message, /邮箱不能为空/);
});

test('鉴权：注册已关闭 → 400', async () => {
  const res = await api('POST', '/api/auth/register', {
    body: { username: 'newbie', email: 'newbie@test.com', password: 'secret6' },
  });
  assert.strictEqual(res.status, 400);
  assert.match(res.body.message, /注册功能已关闭/);
});

test('鉴权：受保护路由缺少令牌 → 401', async () => {
  const res = await api('POST', `/api/push/by-channel/${channelId}`, { body: { content: 'x' } });
  assert.strictEqual(res.status, 401);
  assert.strictEqual(res.body.message, '缺少访问令牌');
});

test('鉴权：受保护路由无效令牌 → 401', async () => {
  const res = await api('POST', `/api/push/by-channel/${channelId}`, {
    token: 'invalid.jwt.token',
    body: { content: 'x' },
  });
  assert.strictEqual(res.status, 401);
  assert.strictEqual(res.body.message, '访问令牌无效或已过期');
});

// ==================== 推送全链路 ====================

test('推送：按令牌推送成功并落库', async () => {
  const res = await api('POST', `/api/push/${ENDPOINT_TOKEN}`, { body: { title: 'T', content: 'hello' } });
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.success, true);
  assert.strictEqual(res.body.data.success, true);
  assert.strictEqual(res.body.data.successCount, 1);
  assert.strictEqual(res.body.data.failedCount, 0);

  // 校验推送日志已写入且状态为 success
  const log = db
    .prepare("SELECT * FROM push_logs WHERE user_id = ? AND status = 'success' ORDER BY id DESC")
    .get(userId);
  assert.ok(log, '应存在成功的推送日志');
  assert.strictEqual(log.content, 'hello');
  assert.strictEqual(log.endpoint_id, endpointId);
});

test('推送：无效令牌 → 400', async () => {
  const res = await api('POST', '/api/push/nonexistenttoken', { body: { content: 'x' } });
  assert.strictEqual(res.status, 400);
  assert.strictEqual(res.body.message, '无效的接口令牌');
});

test('推送：接口已禁用 → 400', async () => {
  const res = await api('POST', `/api/push/${DISABLED_TOKEN}`, { body: { content: 'x' } });
  assert.strictEqual(res.status, 400);
  assert.strictEqual(res.body.message, '接口已禁用');
});

test('推送：关键词命中（黑名单）→ 400 拦截', async () => {
  const res = await api('POST', `/api/push/${KEYWORD_TOKEN}`, { body: { content: 'this is spam' } });
  assert.strictEqual(res.status, 400);
  assert.strictEqual(res.body.message, '包含不合法内容');
});

test('推送：内容为空 → 400 参数校验', async () => {
  const res = await api('POST', `/api/push/${ENDPOINT_TOKEN}`, { body: { content: '' } });
  assert.strictEqual(res.status, 400);
  assert.match(res.body.message, /消息内容不能为空/);
});

test('推送：渠道发送失败 → 400 部分推送失败', async () => {
  adapterState.fail = true;
  try {
    const res = await api('POST', `/api/push/${ENDPOINT_TOKEN}`, { body: { content: 'will fail' } });
    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.message, '部分推送失败');
    assert.strictEqual(res.body.data.success, false);
    assert.strictEqual(res.body.data.failedCount, 1);
  } finally {
    adapterState.fail = false;
  }
});

test('推送：按接口 ID 认证推送成功', async () => {
  const res = await api('POST', `/api/push/by-endpoint/${endpointId}`, {
    token: admin.accessToken,
    body: { content: 'via endpoint' },
  });
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.data.success, true);
});

// ==================== 入站接收 ====================

test('入站：无效令牌 → 404', async () => {
  const res = await api('POST', '/api/inbound/nope', { body: { msg: 'x' } });
  assert.strictEqual(res.status, 404);
  assert.strictEqual(res.body.message, '接口不存在');
});

test('入站：接口未启用入站 → 400', async () => {
  const res = await api('POST', `/api/inbound/${ENDPOINT_TOKEN}`, { body: { msg: 'x' } });
  assert.strictEqual(res.status, 400);
  assert.match(res.body.message, /未启用入站接收功能/);
});

test('入站：正常入站解析并推送 → 200', async () => {
  const res = await api('POST', `/api/inbound/${INBOUND_TOKEN}`, { body: { msg: 'hello inbound', title: 'IT' } });
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.data.success, true);
});

// ==================== 限流（置于最后，避免影响其他用例）====================

test('限流：登录超过阈值 → 429', async () => {
  RateLimitConfigService.set('rate_limit_login_max', 1); // 每分钟仅允许 1 次
  RateLimitConfigService.setEnabled(true);
  const headers = { 'X-Forwarded-For': '203.0.113.77' }; // 固定 IP，key 一致
  try {
    const first = await api('POST', '/api/auth/login', { body: { email: 'a@a.com', password: 'b' }, headers });
    assert.notStrictEqual(first.status, 429, '第 1 次不应被限流');

    const second = await api('POST', '/api/auth/login', { body: { email: 'a@a.com', password: 'b' }, headers });
    assert.strictEqual(second.status, 429, '第 2 次应被限流');
    assert.strictEqual(second.body.code, 429);
  } finally {
    RateLimitConfigService.setEnabled(false);
  }
});
