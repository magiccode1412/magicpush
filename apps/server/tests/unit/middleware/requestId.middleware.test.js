/**
 * requestId 中间件单元测试
 */
const { test } = require('node:test');
const assert = require('node:assert');
const requestIdMiddleware = require('../../../src/middleware/requestId.middleware');

test('未提供 X-Request-Id 时自动生成并写入响应头', () => {
  const req = { headers: {} };
  const headers = {};
  const res = { setHeader: (k, v) => { headers[k] = v; } };
  let nextCalled = false;

  requestIdMiddleware(req, res, () => { nextCalled = true; });

  assert.ok(req.requestId, '应生成 requestId');
  assert.match(req.requestId, /^[0-9a-f-]{36}$/, '应为 UUID 格式');
  assert.strictEqual(headers['X-Request-Id'], req.requestId);
  assert.strictEqual(nextCalled, true);
});

test('复用客户端传入的 X-Request-Id', () => {
  const req = { headers: { 'x-request-id': 'client-provided-123' } };
  const res = { setHeader: () => {} };

  requestIdMiddleware(req, res, () => {});

  assert.strictEqual(req.requestId, 'client-provided-123');
});
