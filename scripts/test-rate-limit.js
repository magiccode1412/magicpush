#!/usr/bin/env node

/**
 * 限流中间件测试脚本
 *
 * 验证各接口的请求频率限制是否正常工作，包括：
 *   - 全局限流、登录/注册/刷新/健康检查接口限流
 *   - 推送接口（IP + Token 双重限流）、入站接口（Token 限流）
 *   - 429 响应格式、RateLimit-* 标准头
 *
 * 用法:
 *   node scripts/test-rate-limit.js                         # 测试默认地址 http://localhost:3000
 *   node scripts/test-rate-limit.js http://192.168.1.1:3000  # 测试指定地址
 *   node scripts/test-rate-limit.js --only health           # 仅运行指定测试
 */

const BASE_URL = process.argv[2] && !process.argv[2].startsWith('--')
  ? process.argv[2]
  : 'http://localhost:3000';

const FILTER = process.argv.find((a) => a.startsWith('--only='));
const ONLY = FILTER ? FILTER.replace('--only=', '') : null;

// ── 配置（与 server 默认值一致） ─────────────────────────────────
const LIMITS = {
  global: 200,
  login: 5,
  register: 3,
  refresh: 10,
  health: 10,
  pushIP: 30,
  pushToken: 60,
  inbound: 60,
};

// ── 颜色工具 ─────────────────────────────────────────────────────
const C = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  dim: '\x1b[2m',
  bold: '\x1b[1m',
};

const ok = (t) => `${C.green}✓${C.reset} ${t}`;
const fail = (t) => `${C.red}✗${C.reset} ${t}`;
const info = (t) => `${C.cyan}ℹ${C.reset} ${t}`;
const warn = (t) => `${C.yellow}!${C.reset} ${t}`;

// ── 统计 ─────────────────────────────────────────────────────────
let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

// ── HTTP 请求 ────────────────────────────────────────────────────
async function request(path, opts = {}) {
  const url = path.startsWith('http') ? path : `${BASE_URL}${path}`;
  const res = await fetch(url, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      ...opts.headers,
    },
  });
  let body = null;
  const ct = res.headers.get('content-type') || '';
  if (ct.includes('application/json')) {
    body = await res.json();
  }
  return { status: res.status, headers: Object.fromEntries(res.headers.entries()), body };
}

// ── 断言 ─────────────────────────────────────────────────────────
function assert(condition, label) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ${ok(label)}`);
  } else {
    failedTests++;
    console.log(`  ${fail(label)}`);
  }
}

// ── 睡眠 ─────────────────────────────────────────────────────────
function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// ── 测试：连通性 ─────────────────────────────────────────────────
async function testConnectivity() {
  console.log(`\n${C.bold}${C.cyan}━━ 测试连通性 ━━${C.reset}`);
  try {
    const { status, body } = await request('/api/health');
    assert(status === 200, '服务器可达，/api/health 返回 200');
    if (body && body.success) {
      console.log(`  ${info(`版本: ${body.data?.version || 'N/A'}`)}`);
    }
  } catch (e) {
    assert(false, `无法连接 ${BASE_URL}，请确认服务已启动`);
    process.exit(1);
  }
}

// ── 测试：429 响应格式 ───────────────────────────────────────────
async function test429ResponseFormat() {
  console.log(`\n${C.bold}${C.cyan}━━ 测试 429 响应格式 ━━${C.reset}`);

  // 连续请求健康检查直到触发限流（health 限制为 10 次/分钟）
  console.log(`  ${C.dim}发送 ${LIMITS.health + 1} 次健康检查请求以触发限流...${C.reset}`);
  let last429 = null;
  for (let i = 0; i <= LIMITS.health; i++) {
    const res = await request('/api/health');
    if (res.status === 429) {
      last429 = res;
      break;
    }
  }

  if (!last429) {
    assert(false, '未能触发 429 限流');
    return;
  }

  assert(true, `健康检查第 ${LIMITS.health + 1} 次请求返回 429`);

  // 验证响应体格式
  const body = last429.body;
  assert(body !== null, '响应体为 JSON 格式');
  assert(body.success === false, '响应体 success === false');
  assert(body.code === 429, `响应体 code === 429 (实际: ${body.code})`);
  assert(typeof body.message === 'string' && body.message.length > 0, '响应体包含 message 字段');
  assert(body.timestamp !== undefined, '响应体包含 timestamp 字段');

  console.log(`  ${info(`限流消息: "${body.message}"`)}`);

  // 验证标准头
  const h = last429.headers;
  const hasLimit = 'ratelimit-limit' in h;
  const hasRemaining = 'ratelimit-remaining' in h;
  const hasReset = 'ratelimit-reset' in h;
  assert(hasLimit, `响应头包含 RateLimit-Limit (${h['ratelimit-limit']})`);
  assert(hasRemaining, `响应头包含 RateLimit-Remaining (${h['ratelimit-remaining']})`);
  assert(hasReset, `响应头包含 RateLimit-Reset (${h['ratelimit-reset']})`);
  assert(parseInt(h['ratelimit-remaining'] || '0') === 0, 'RateLimit-Remaining === 0');
}

// ── 测试：登录限流 ───────────────────────────────────────────────
async function testLoginLimiter() {
  console.log(`\n${C.bold}${C.cyan}━━ 测试登录限流 ━━${C.reset}`);
  console.log(`  ${C.dim}限制: ${LIMITS.login} 次/分钟/IP${C.reset}`);

  let rateLimitedAt = -1;
  const payload = { email: 'rate-limit-test@example.com', password: 'wrong_password' };

  for (let i = 1; i <= LIMITS.login + 2; i++) {
    const { status } = await request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    if (status === 429 && rateLimitedAt === -1) {
      rateLimitedAt = i;
    }
  }

  assert(rateLimitedAt === LIMITS.login + 1, `第 ${rateLimitedAt} 次请求被限流（预期第 ${LIMITS.login + 1} 次）`);
}

// ── 测试：注册限流 ───────────────────────────────────────────────
async function testRegisterLimiter() {
  console.log(`\n${C.bold}${C.cyan}━━ 测试注册限流 ━━${C.reset}`);
  console.log(`  ${C.dim}限制: ${LIMITS.register} 次/分钟/IP${C.reset}`);

  let rateLimitedAt = -1;
  for (let i = 1; i <= LIMITS.register + 2; i++) {
    const { status } = await request('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        username: `rl_test_${Date.now()}_${i}`,
        email: `rl_test_${i}_${Date.now()}@example.com`,
        password: 'Test123456!',
      }),
    });
    if (status === 429 && rateLimitedAt === -1) {
      rateLimitedAt = i;
    }
  }

  assert(rateLimitedAt === LIMITS.register + 1, `第 ${rateLimitedAt} 次请求被限流（预期第 ${LIMITS.register + 1} 次）`);
}

// ── 测试：Token 刷新限流 ────────────────────────────────────────
async function testRefreshLimiter() {
  console.log(`\n${C.bold}${C.cyan}━━ 测试 Token 刷新限流 ━━${C.reset}`);
  console.log(`  ${C.dim}限制: ${LIMITS.refresh} 次/分钟/IP${C.reset}`);

  let rateLimitedAt = -1;
  for (let i = 1; i <= LIMITS.refresh + 2; i++) {
    const { status } = await request('/api/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken: 'invalid-token' }),
    });
    if (status === 429 && rateLimitedAt === -1) {
      rateLimitedAt = i;
    }
  }

  assert(rateLimitedAt === LIMITS.refresh + 1, `第 ${rateLimitedAt} 次请求被限流（预期第 ${LIMITS.refresh + 1} 次）`);
}

// ── 测试：推送接口 IP 限流 ───────────────────────────────────────
async function testPushIPLimiter() {
  console.log(`\n${C.bold}${C.cyan}━━ 测试推送接口 IP 限流 ━━${C.reset}`);
  console.log(`  ${C.dim}限制: ${LIMITS.pushIP} 次/分钟/IP（Token 限制: ${LIMITS.pushToken} 次/分钟）${C.reset}`);

  const testToken = `rate-limit-test-token-${Date.now()}`;
  let rateLimitedAt = -1;

  for (let i = 1; i <= LIMITS.pushIP + 2; i++) {
    const { status } = await request(`/api/push/${testToken}`, {
      method: 'POST',
      body: JSON.stringify({ title: 'Rate Limit Test', content: `test #${i}` }),
    });
    if (status === 429 && rateLimitedAt === -1) {
      rateLimitedAt = i;
    }
  }

  // IP 限流 (30) 先于 Token 限流 (60) 触发
  assert(
    rateLimitedAt === LIMITS.pushIP + 1,
    `第 ${rateLimitedAt} 次请求被限流（预期第 ${LIMITS.pushIP + 1} 次，IP 限流先于 Token 限流触发）`
  );
}

// ── 测试：推送接口 GET 方法限流 ─────────────────────────────────
async function testPushGetLimiter() {
  console.log(`\n${C.bold}${C.cyan}━━ 测试推送接口 GET 方法限流 ━━${C.reset}`);
  console.log(`  ${C.dim}GET /:token 同样受 IP + Token 双重限流${C.reset}`);

  const testToken = `rate-limit-get-test-${Date.now()}`;
  let rateLimitedAt = -1;

  for (let i = 1; i <= LIMITS.pushIP + 2; i++) {
    const { status } = await request(`/api/push/${testToken}`);
    if (status === 429 && rateLimitedAt === -1) {
      rateLimitedAt = i;
    }
  }

  assert(rateLimitedAt === LIMITS.pushIP + 1, `GET 第 ${rateLimitedAt} 次请求被限流（预期第 ${LIMITS.pushIP + 1} 次）`);
}

// ── 测试：入站接口 Token 限流 ───────────────────────────────────
async function testInboundLimiter() {
  console.log(`\n${C.bold}${C.cyan}━━ 测试入站接口 Token 限流 ━━${C.reset}`);
  console.log(`  ${C.dim}限制: ${LIMITS.inbound} 次/分钟/Token（按 Token 限流，非 IP）${C.reset}`);

  const testToken = `rate-limit-inbound-${Date.now()}`;
  let rateLimitedAt = -1;

  for (let i = 1; i <= LIMITS.inbound + 2; i++) {
    const { status } = await request(`/api/inbound/${testToken}`, {
      method: 'POST',
      body: JSON.stringify({ data: `test #${i}` }),
    });
    if (status === 429 && rateLimitedAt === -1) {
      rateLimitedAt = i;
    }
  }

  // 注意：全局限流 (200) 和入站 Token 限流 (60)，Token 限流先触发
  assert(
    rateLimitedAt === LIMITS.inbound + 1,
    `第 ${rateLimitedAt} 次请求被限流（预期第 ${LIMITS.inbound + 1} 次）`
  );
}

// ── 测试：入站接口不同 Token 独立计数 ───────────────────────────
async function testInboundTokenIsolation() {
  console.log(`\n${C.bold}${C.cyan}━━ 测试入站接口不同 Token 独立计数 ━━${C.reset}`);
  console.log(`  ${C.dim}验证按 Token 限流，不同 Token 独立计数${C.reset}`);

  const tokenA = `inbound-isolation-a-${Date.now()}`;
  const tokenB = `inbound-isolation-b-${Date.now()}`;

  // 用 TokenA 发送少量请求
  for (let i = 0; i < 3; i++) {
    await request(`/api/inbound/${tokenA}`, { method: 'POST', body: JSON.stringify({ data: 'a' }) });
  }

  // 用 TokenB 发送，不应受到 TokenA 限流影响
  const { status } = await request(`/api/inbound/${tokenB}`, {
    method: 'POST',
    body: JSON.stringify({ data: 'b' }),
  });

  assert(status !== 429, `TokenB 请求未被限流 (HTTP ${status})，与 TokenA 独立`);
}

// ── 测试：限流恢复（窗口过期后计数重置）──────────────────────────
async function testRateLimitReset() {
  console.log(`\n${C.bold}${C.cyan}━━ 测试限流恢复 ━━${C.reset}`);
  console.log(`  ${C.dim}限流窗口过期后请求应恢复（等待 61 秒）${C.reset}`);
  console.log(`  ${C.dim}该测试耗时较长，可通过 --only 参数单独跳过${C.reset}`);

  const waitSeconds = 61;
  console.log(`  ${warn(`等待 ${waitSeconds} 秒以使限流窗口过期...`)}`);
  for (let s = waitSeconds; s > 0; s--) {
    process.stdout.write(`\r  ${C.dim}剩余 ${s}s...${C.reset}                `);
    await sleep(1000);
  }
  process.stdout.write('\r');
  console.log(`  ${info('限流窗口已过期，发送测试请求...')}`);

  const { status, headers } = await request('/api/health');
  const remaining = parseInt(headers['ratelimit-remaining'] || '-1', 10);

  assert(status === 200, `请求恢复正常，返回 200`);
  assert(remaining > 0, `RateLimit-Remaining > 0（实际: ${remaining}），计数已重置`);
}

// ── 主函数 ───────────────────────────────────────────────────────
async function main() {
  console.log(`\n${C.bold}════════════════════════════════════════════════`);
  console.log(`${C.bold}  API 限流中间件测试`);
  console.log(`${C.bold}  目标: ${BASE_URL}`);
  console.log(`${C.bold}════════════════════════════════════════════════`);

  const tests = [
    { name: 'connectivity', label: '连通性', fn: testConnectivity, always: true },
    { name: '429-format', label: '429 响应格式', fn: test429ResponseFormat },
    { name: 'login', label: '登录限流', fn: testLoginLimiter },
    { name: 'register', label: '注册限流', fn: testRegisterLimiter },
    { name: 'refresh', label: 'Token 刷新限流', fn: testRefreshLimiter },
    { name: 'push-ip', label: '推送接口 IP 限流', fn: testPushIPLimiter },
    { name: 'push-get', label: '推送接口 GET 限流', fn: testPushGetLimiter },
    { name: 'inbound', label: '入站接口 Token 限流', fn: testInboundLimiter },
    { name: 'inbound-isolation', label: '入站 Token 隔离', fn: testInboundTokenIsolation },
    { name: 'reset', label: '限流恢复', fn: testRateLimitReset },
  ];

  if (ONLY) {
    console.log(`${C.dim}  筛选: --only=${ONLY}${C.reset}`);
  }

  for (const test of tests) {
    if (test.always || !ONLY || ONLY === test.name) {
      await test.fn();
    }
  }

  // ── 汇总 ───────────────────────────────────────────────────────
  console.log(`\n${C.bold}════════════════════════════════════════════════`);
  console.log(`${C.bold}  测试结果汇总`);
  console.log(`${C.bold}════════════════════════════════════════════════`);
  console.log(`  ${C.green}通过: ${passedTests}${C.reset}`);
  console.log(`  ${C.red}失败: ${failedTests}${C.reset}`);
  console.log(`  ${C.dim}总计: ${totalTests}${C.reset}`);

  if (failedTests > 0) {
    console.log(`\n  ${C.red}${C.bold}存在失败的测试，请检查限流配置和服务状态${C.reset}\n`);
    process.exit(1);
  } else {
    console.log(`\n  ${C.green}${C.bold}所有限流测试通过！${C.reset}\n`);
  }
}

main().catch((e) => {
  console.error(`\n${C.red}脚本执行出错: ${e.message}${C.reset}\n`);
  process.exit(1);
});
