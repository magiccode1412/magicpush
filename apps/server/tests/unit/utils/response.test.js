/**
 * ResponseUtil 单元测试（基于 Node 内置 node:test，无第三方依赖）
 *
 * 通过普通对象自建轻量 mock res，断言各响应方法的状态码与 JSON 结构。
 */
const { test } = require('node:test');
const assert = require('node:assert');
const ResponseUtil = require('../../../src/utils/response');

// 自建轻量 res mock：捕获 status / json 调用结果
function createMockRes() {
  const captured = { statusCode: null, body: null };
  const res = {
    status(code) {
      captured.statusCode = code;
      return res;
    },
    json(payload) {
      captured.body = payload;
      return res;
    },
  };
  return { res, captured };
}

test('success 返回 200 与标准结构', () => {
  const { res, captured } = createMockRes();
  ResponseUtil.success(res, { id: 1 }, 'ok');
  assert.strictEqual(captured.statusCode, 200);
  assert.deepStrictEqual(captured.body, {
    success: true,
    code: 200,
    message: 'ok',
    data: { id: 1 },
    timestamp: captured.body.timestamp,
  });
  assert.strictEqual(typeof captured.body.timestamp, 'string');
});

test('created 返回 201', () => {
  const { res, captured } = createMockRes();
  ResponseUtil.created(res);
  assert.strictEqual(captured.statusCode, 201);
  assert.strictEqual(captured.body.code, 201);
  assert.strictEqual(captured.body.success, true);
});

test('error 默认 500 并可自定义 code/statusCode', () => {
  const { res, captured } = createMockRes();
  ResponseUtil.error(res, '失败', 500, 500);
  assert.strictEqual(captured.statusCode, 500);
  assert.strictEqual(captured.body.success, false);
  assert.strictEqual(captured.body.message, '失败');
  assert.strictEqual(captured.body.code, 500);
});

test('badRequest 返回 400', () => {
  const { res, captured } = createMockRes();
  ResponseUtil.badRequest(res, '参数错误');
  assert.strictEqual(captured.statusCode, 400);
  assert.strictEqual(captured.body.code, 400);
});

test('unauthorized 返回 401', () => {
  const { res, captured } = createMockRes();
  ResponseUtil.unauthorized(res);
  assert.strictEqual(captured.statusCode, 401);
  assert.strictEqual(captured.body.code, 401);
});

test('forbidden 返回 403', () => {
  const { res, captured } = createMockRes();
  ResponseUtil.forbidden(res);
  assert.strictEqual(captured.statusCode, 403);
});

test('notFound 返回 404', () => {
  const { res, captured } = createMockRes();
  ResponseUtil.notFound(res);
  assert.strictEqual(captured.statusCode, 404);
});

test('tooManyRequests 返回 429', () => {
  const { res, captured } = createMockRes();
  ResponseUtil.tooManyRequests(res);
  assert.strictEqual(captured.statusCode, 429);
});

test('serverError 返回 500', () => {
  const { res, captured } = createMockRes();
  ResponseUtil.serverError(res);
  assert.strictEqual(captured.statusCode, 500);
});
