/*
 * 薪水计算引擎 —— 纯函数，无 DOM 依赖。
 * 浏览器里挂在 window.SalaryEngine；Node 里通过 module.exports 导出（用于测试）。
 */
(function (root) {
  const DEFAULTS = {
    monthlySalary: 10000,      // 月薪
    payDaysPerMonth: 21.75,    // 每月计薪天数（国内法定 21.75）
    workDays: [1, 2, 3, 4, 5], // 工作日：0=周日 … 6=周六
    workStart: '09:00',
    workEnd: '18:00',
    lunchEnabled: true,
    lunchStart: '12:00',
    lunchEnd: '13:00',
    lunchReminderMin: 5,       // 午休前 N 分钟提醒，0 = 不提醒
    goal: 100,                 // 今日目标金额，0 = 不设目标
    currency: '¥',
    decimals: 2,
    notify: true,              // 系统通知
  };

  function toSec(hhmm) {
    const m = /^(\d{1,2}):(\d{2})$/.exec(String(hhmm || '').trim());
    if (!m) return NaN;
    return (Number(m[1]) * 60 + Number(m[2])) * 60;
  }

  function normalize(s) {
    const out = Object.assign({}, DEFAULTS, s || {});
    out.monthlySalary = Math.max(0, Number(out.monthlySalary) || 0);
    out.payDaysPerMonth = Number(out.payDaysPerMonth) > 0 ? Number(out.payDaysPerMonth) : DEFAULTS.payDaysPerMonth;
    out.goal = Math.max(0, Number(out.goal) || 0);
    out.decimals = Math.min(4, Math.max(0, Math.round(Number(out.decimals))));
    if (!Number.isFinite(out.decimals)) out.decimals = 2;
    out.lunchReminderMin = Math.max(0, Number(out.lunchReminderMin) || 0);
    out.workDays = Array.isArray(out.workDays) ? out.workDays.map(Number) : DEFAULTS.workDays.slice();
    return out;
  }

  /** 返回当天日程（秒）。午休会被裁剪到工作时段内。 */
  function schedule(s) {
    const start = toSec(s.workStart);
    const end = toSec(s.workEnd);
    let ls = toSec(s.lunchStart);
    let le = toSec(s.lunchEnd);
    let lunch = !!s.lunchEnabled && ls < le;
    if (lunch) {
      ls = Math.max(ls, start);
      le = Math.min(le, end);
      if (ls >= le) lunch = false;
    }
    return { start, end, lunch, lunchStart: lunch ? ls : null, lunchEnd: lunch ? le : null };
  }

  /** 校验设置，返回错误信息数组（空 = 合法）。 */
  function validate(raw) {
    const s = normalize(raw);
    const errs = [];
    const r = raw || {};
    const num = (v) => (v === '' || v == null ? NaN : Number(v));
    if (!(num(r.monthlySalary) > 0)) errs.push('请填写月薪（要大于 0）');
    if ('payDaysPerMonth' in r && !(num(r.payDaysPerMonth) >= 1 && num(r.payDaysPerMonth) <= 31)) errs.push('每月计薪天数要在 1 到 31 之间');
    if ('goal' in r && num(r.goal) < 0) errs.push('目标金额不能是负数');
    if ('lunchReminderMin' in r && !(num(r.lunchReminderMin) >= 0 && num(r.lunchReminderMin) <= 120)) errs.push('午休提前提醒要在 0 到 120 分钟之间');
    const start = toSec(s.workStart), end = toSec(s.workEnd);
    if (!Number.isFinite(start) || !Number.isFinite(end)) errs.push('上下班时间格式不对');
    else if (end <= start) errs.push('下班时间要晚于上班时间（暂不支持跨夜班）');
    if (s.lunchEnabled) {
      const ls = toSec(s.lunchStart), le = toSec(s.lunchEnd);
      if (!Number.isFinite(ls) || !Number.isFinite(le)) errs.push('午休时间格式不对');
      else if (le <= ls) errs.push('午休结束要晚于午休开始');
    }
    if (!s.workDays.length) errs.push('至少选择一个工作日');
    if (workdaySecondsOf(s) <= 0 && !errs.length) errs.push('有效工作时长为 0');
    return errs;
  }

  function workdaySecondsOf(s) {
    const d = schedule(s);
    if (!(d.end > d.start)) return 0;
    let secs = d.end - d.start;
    if (d.lunch) secs -= d.lunchEnd - d.lunchStart;
    return Math.max(0, secs);
  }

  function ratePerSecond(s) {
    const secs = workdaySecondsOf(s);
    if (!secs) return 0;
    return s.monthlySalary / s.payDaysPerMonth / secs;
  }

  function secOfDay(date) {
    return date.getHours() * 3600 + date.getMinutes() * 60 + date.getSeconds() + date.getMilliseconds() / 1000;
  }

  function isWorkday(s, date) {
    return s.workDays.indexOf(date.getDay()) !== -1;
  }

  /** 'dayoff' | 'before' | 'working' | 'lunch' | 'after' */
  function phaseAt(s, date) {
    if (!isWorkday(s, date)) return 'dayoff';
    const d = schedule(s);
    const t = secOfDay(date);
    if (t < d.start) return 'before';
    if (t >= d.end) return 'after';
    if (d.lunch && t >= d.lunchStart && t < d.lunchEnd) return 'lunch';
    return 'working';
  }

  function workedSeconds(s, date) {
    if (!isWorkday(s, date)) return 0;
    const d = schedule(s);
    const t = Math.min(Math.max(secOfDay(date), d.start), d.end);
    let worked = t - d.start;
    if (d.lunch) {
      const overlap = Math.min(t, d.lunchEnd) - d.lunchStart;
      if (overlap > 0) worked -= overlap;
    }
    return Math.max(0, worked);
  }

  function earnedAt(s, date) {
    return workedSeconds(s, date) * ratePerSecond(s);
  }

  /** 距离某个时刻（当天秒数）还有多少秒；已过则返回 null。 */
  function secondsUntil(target, date) {
    if (target == null) return null;
    const diff = target - secOfDay(date);
    return diff > 0 ? diff : null;
  }

  function info(raw, date) {
    const s = normalize(raw);
    const d = schedule(s);
    const rate = ratePerSecond(s);
    const workdaySecs = workdaySecondsOf(s);
    return {
      settings: s,
      phase: phaseAt(s, date),
      earned: earnedAt(s, date),
      rate,
      perHour: rate * 3600,
      perDay: rate * workdaySecs,
      toLunch: d.lunch ? secondsUntil(d.lunchStart, date) : null,
      toLunchEnd: d.lunch ? secondsUntil(d.lunchEnd, date) : null,
      toStart: secondsUntil(d.start, date),
      toEnd: secondsUntil(d.end, date),
    };
  }

  /** s 通常是已 normalize 过的设置；这里只做最小兜底，避免高频调用时反复 normalize */
  function formatMoney(v, s) {
    const cur = (s && s.currency) || DEFAULTS.currency;
    const d = Math.min(4, Math.max(0, Math.round(Number(s && s.decimals))));
    return cur + Number(v || 0).toFixed(Number.isFinite(d) ? d : DEFAULTS.decimals);
  }

  function formatDuration(sec) {
    sec = Math.max(0, Math.round(sec));
    const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), x = sec % 60;
    if (h) return h + ' 小时 ' + m + ' 分';
    if (m) return m + ' 分 ' + x + ' 秒';
    return x + ' 秒';
  }

  function dayKey(date) {
    const p = (n) => String(n).padStart(2, '0');
    return date.getFullYear() + '-' + p(date.getMonth() + 1) + '-' + p(date.getDate());
  }

  const api = {
    DEFAULTS, normalize, validate, schedule, toSec,
    workdaySeconds: workdaySecondsOf, ratePerSecond, phaseAt, workedSeconds, earnedAt,
    info, formatMoney, formatDuration, dayKey,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.SalaryEngine = api;
})(typeof window !== 'undefined' ? window : globalThis);
