/**
 * DoNotDisturbService 单元测试（基于 Node 内置 node:test，无第三方依赖）
 *
 * 覆盖：_timeToMinutes / _getMinutesOfDay / validateConfig 纯函数，
 * 以及 shouldMute 在不同时段的命中判断（通过替换 _getMinutesOfDay 固定当前分钟）。
 */
const { test, afterEach } = require('node:test');
const assert = require('node:assert');
const DoNotDisturbService = require('../../../src/services/doNotDisturb.service');

const originalGet = DoNotDisturbService._getMinutesOfDay;
afterEach(() => {
  DoNotDisturbService._getMinutesOfDay = originalGet;
});

test('_timeToMinutes：标准时间转换', () => {
  assert.strictEqual(DoNotDisturbService._timeToMinutes('00:00'), 0);
  assert.strictEqual(DoNotDisturbService._timeToMinutes('09:00'), 540);
  assert.strictEqual(DoNotDisturbService._timeToMinutes('23:59'), 1439);
});

test('_timeToMinutes：非法格式返回 null', () => {
  assert.strictEqual(DoNotDisturbService._timeToMinutes('25:00'), null);
  assert.strictEqual(DoNotDisturbService._timeToMinutes('09:60'), null);
  assert.strictEqual(DoNotDisturbService._timeToMinutes('9:5'), null);
  assert.strictEqual(DoNotDisturbService._timeToMinutes('abc'), null);
  assert.strictEqual(DoNotDisturbService._timeToMinutes(null), null);
  assert.strictEqual(DoNotDisturbService._timeToMinutes(''), null);
});

test('_getMinutesOfDay：按 Date 计算当天分钟数', () => {
  const d = new Date(2024, 0, 1, 10, 30, 0);
  assert.strictEqual(DoNotDisturbService._getMinutesOfDay(d), 630);
});

test('validateConfig：null 配置合法（视为关闭）', () => {
  assert.deepStrictEqual(DoNotDisturbService.validateConfig(null), { valid: true, error: null });
});

test('validateConfig：空对象（缺 timeRanges）非法', () => {
  assert.deepStrictEqual(DoNotDisturbService.validateConfig({}), {
    valid: false,
    error: 'timeRanges 必须是数组',
  });
});

test('validateConfig：timeRanges 必须为数组', () => {
  assert.deepStrictEqual(DoNotDisturbService.validateConfig({ timeRanges: 'x' }), {
    valid: false,
    error: 'timeRanges 必须是数组',
  });
});

test('validateConfig：最多 5 个时间段', () => {
  const cfg = { timeRanges: Array(6).fill({ start: '00:00', end: '01:00' }) };
  assert.deepStrictEqual(DoNotDisturbService.validateConfig(cfg), {
    valid: false,
    error: '最多支持 5 个时间段',
  });
});

test('validateConfig：缺少 start/end 或格式错误', () => {
  assert.strictEqual(DoNotDisturbService.validateConfig({ timeRanges: [{ start: '00:00' }] }).valid, false);
  assert.strictEqual(
    DoNotDisturbService.validateConfig({ timeRanges: [{ start: '00:00', end: 'bad' }] }).valid,
    false
  );
});

test('validateConfig：合法配置', () => {
  assert.deepStrictEqual(
    DoNotDisturbService.validateConfig({ timeRanges: [{ start: '22:00', end: '08:00' }] }),
    { valid: true, error: null }
  );
});

test('shouldMute：未启用/无时间段 → 不放行', () => {
  assert.strictEqual(DoNotDisturbService.shouldMute(null), false);
  assert.strictEqual(
    DoNotDisturbService.shouldMute({ enabled: false, timeRanges: [{ start: '09:00', end: '18:00' }] }),
    false
  );
  assert.strictEqual(DoNotDisturbService.shouldMute({ enabled: true, timeRanges: [] }), false);
});

test('shouldMute：不跨天时间段命中', () => {
  const cfg = { enabled: true, timeRanges: [{ start: '09:00', end: '18:00' }] };
  DoNotDisturbService._getMinutesOfDay = () => 600; // 10:00
  assert.strictEqual(DoNotDisturbService.shouldMute(cfg), true);
  DoNotDisturbService._getMinutesOfDay = () => 1200; // 20:00
  assert.strictEqual(DoNotDisturbService.shouldMute(cfg), false);
});

test('shouldMute：跨天时间段命中', () => {
  const cfg = { enabled: true, timeRanges: [{ start: '22:00', end: '08:00' }] };
  DoNotDisturbService._getMinutesOfDay = () => 1380; // 23:00
  assert.strictEqual(DoNotDisturbService.shouldMute(cfg), true);
  DoNotDisturbService._getMinutesOfDay = () => 420; // 07:00
  assert.strictEqual(DoNotDisturbService.shouldMute(cfg), true);
  DoNotDisturbService._getMinutesOfDay = () => 720; // 12:00
  assert.strictEqual(DoNotDisturbService.shouldMute(cfg), false);
});

test('shouldMute：开始=结束视为无效配置，跳过', () => {
  DoNotDisturbService._getMinutesOfDay = () => 600; // 10:00
  const cfg = { enabled: true, timeRanges: [{ start: '10:00', end: '10:00' }] };
  assert.strictEqual(DoNotDisturbService.shouldMute(cfg), false);
});
