/**
 * mapWithConcurrency 单元测试（基于 Node 内置 node:test）
 * 验证：结果顺序与输入一致、并发度上限生效、空数组处理。
 */
const { test } = require('node:test');
const assert = require('node:assert');
const { mapWithConcurrency } = require('../../../src/utils/concurrency');

const delay = (ms) => new Promise((r) => setTimeout(r, ms));

test('结果顺序与输入一致（即使完成时间乱序）', async () => {
  const items = [30, 10, 20, 5];
  const results = await mapWithConcurrency(items, 2, async (ms, i) => {
    await delay(ms);
    return `${i}:${ms}`;
  });
  assert.deepStrictEqual(results, ['0:30', '1:10', '2:20', '3:5']);
});

test('并发度不超过 limit', async () => {
  let running = 0;
  let peak = 0;
  const items = Array.from({ length: 10 }, (_, i) => i);
  await mapWithConcurrency(items, 3, async () => {
    running++;
    peak = Math.max(peak, running);
    await delay(5);
    running--;
  });
  assert.ok(peak <= 3, `峰值并发 ${peak} 应 <= 3`);
});

test('空数组返回空结果', async () => {
  const results = await mapWithConcurrency([], 5, async () => 1);
  assert.deepStrictEqual(results, []);
});

test('limit 小于 1 时按 1 处理', async () => {
  const results = await mapWithConcurrency([1, 2, 3], 0, async (x) => x * 2);
  assert.deepStrictEqual(results, [2, 4, 6]);
});
