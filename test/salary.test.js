const test = require('node:test');
const assert = require('node:assert');
const E = require('../ui/shared/salary.js');

// 2026-11-18 是周三
const at = (hh, mm, ss = 0) => new Date(2026, 10, 18, hh, mm, ss);
const S = { monthlySalary: 21750, payDaysPerMonth: 21.75 }; // 日薪 1000，8 小时有效

test('daily wage = monthly / payDays, lunch excluded', () => {
  const s = E.normalize(S);
  assert.strictEqual(E.workdaySeconds(s), 8 * 3600);
  assert.ok(Math.abs(E.ratePerSecond(s) * 8 * 3600 - 1000) < 1e-9);
});

test('phases across the day', () => {
  const s = E.normalize(S);
  assert.strictEqual(E.phaseAt(s, at(8, 59)), 'before');
  assert.strictEqual(E.phaseAt(s, at(9, 0)), 'working');
  assert.strictEqual(E.phaseAt(s, at(12, 30)), 'lunch');
  assert.strictEqual(E.phaseAt(s, at(13, 0)), 'working');
  assert.strictEqual(E.phaseAt(s, at(18, 0)), 'after');
  assert.strictEqual(E.phaseAt(s, new Date(2026, 10, 22, 10, 0)), 'dayoff'); // 周日
});

test('earnings freeze during lunch and after work', () => {
  const s = E.normalize(S);
  assert.strictEqual(E.earnedAt(s, at(8, 0)), 0);
  assert.ok(Math.abs(E.earnedAt(s, at(12, 0)) - 375) < 1e-6);
  assert.ok(Math.abs(E.earnedAt(s, at(12, 45)) - 375) < 1e-6);
  assert.ok(Math.abs(E.earnedAt(s, at(14, 0)) - 500) < 1e-6);
  assert.ok(Math.abs(E.earnedAt(s, at(23, 0)) - 1000) < 1e-6);
  assert.strictEqual(E.earnedAt(s, new Date(2026, 10, 22, 12, 0)), 0);
});

test('no lunch break', () => {
  const s = E.normalize({ ...S, lunchEnabled: false });
  assert.strictEqual(E.workdaySeconds(s), 9 * 3600);
  assert.strictEqual(E.phaseAt(s, at(12, 30)), 'working');
});

test('validation', () => {
  assert.deepStrictEqual(E.validate(S), []);
  assert.ok(E.validate({ workStart: '18:00', workEnd: '09:00' }).length);
  assert.ok(E.validate({ lunchStart: '13:00', lunchEnd: '12:00' }).length);
  assert.ok(E.validate({ workDays: [] }).length);
});

test('countdowns', () => {
  const i = E.info(S, at(11, 55));
  assert.strictEqual(Math.round(i.toLunch), 300);
  assert.strictEqual(i.phase, 'working');
  assert.strictEqual(E.info(S, at(12, 10)).toLunch, null);
});

test('formatMoney uses currency/decimals without full normalize', () => {
  assert.strictEqual(E.formatMoney(1.234, { currency: '$', decimals: 3 }), '$1.234');
  assert.strictEqual(E.formatMoney(5, {}), '¥5.00');
  assert.strictEqual(E.formatMoney(5, { currency: '¥', decimals: 0 }), '¥5');
  assert.strictEqual(E.formatMoney(5, { decimals: 9 }), '¥5.0000');
});

test('validation accepts any positive salary and decimal goals', () => {
  assert.deepStrictEqual(E.validate({ ...S, monthlySalary: 2156564, payDaysPerMonth: 22, goal: 99.5 }), []);
  assert.deepStrictEqual(E.validate({ ...S, monthlySalary: 8888.88 }), []);
});

test('validation rejects empty or invalid numbers with Chinese messages', () => {
  assert.ok(E.validate({ ...S, monthlySalary: 0 }).some((e) => e.includes('月薪')));
  assert.ok(E.validate({ ...S, monthlySalary: '' }).some((e) => e.includes('月薪')));
  assert.ok(E.validate({ ...S, payDaysPerMonth: 0 }).some((e) => e.includes('计薪天数')));
  assert.ok(E.validate({ ...S, payDaysPerMonth: 40 }).some((e) => e.includes('计薪天数')));
  assert.ok(E.validate({ ...S, goal: -1 }).some((e) => e.includes('目标')));
  assert.ok(E.validate({ ...S, lunchReminderMin: 500 }).some((e) => e.includes('提醒')));
});
