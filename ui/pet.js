/* 桌宠主逻辑：实时金额、阶段切换提醒、目标达成、拖动、右键菜单、托盘同步 */
(function () {
  const E = SalaryEngine;
  const T = window.__TAURI__ || null; // 在普通浏览器里预览时为 null
  const win = T ? T.window.getCurrentWindow() : null;
  const dpi = T ? (T.dpi || T.window) : null;
  const invoke = T ? T.core.invoke : async () => {};

  const $ = (id) => document.getElementById(id);
  const el = {
    pet: $('pet'), sprite: $('sprite'), svg: $('sprite-svg'), coins: $('coins'),
    bubble: $('bubble'), bubbleText: $('bubble-text'), details: $('details'),
    counter: $('counter'), amount: $('amount'), goalBar: $('goal-bar'),
    phaseDot: $('phase-dot'), phaseText: $('phase-text'),
  };

  // ---------- 调试 URL 参数（截图/测试用）：?now=2026-11-18T11:58&speed=30 模拟时间，?details 展开详情，
  //            ?character=gpt 临时换角色（不保存），?settings 启动即打开设置窗口 ----------
  const params = new URLSearchParams(location.search);
  const realStart = Date.now();
  const fakeStart = params.get('now') ? new Date(params.get('now')).getTime() : realStart;
  const speed = Number(params.get('speed')) || 1;
  const clock = () => new Date(fakeStart + (Date.now() - realStart) * speed);

  let settings = SkStore.load();
  if (params.get('character')) settings.character = params.get('character');
  let masked = !!SkStore.get('masked', false);

  // ---------- 角色切图：优先 PNG（ui/assets/characters/<角色>/*.png），缺失则用矢量兜底 ----------
  const STATES = ['idle', 'working', 'happy', 'rest', 'bye', 'celebrate', 'hello', 'offwork', 'hungry'];
  const charId = () => SkCharacters.get(settings.character).id;

  // 预热浏览器缓存，切换表情时几乎瞬间完成
  function preloadCharacter(id) {
    STATES.forEach((s) => { new Image().src = SkCharacters.sprite(id, s); });
  }

  function useCharacter(id) {
    SkLines.use(id);
    SkCharacters.applyTheme(id);
    preloadCharacter(id);
    if (currentSprite) renderSprite(currentSprite, true);
  }

  // 新图加载完成才替换（旧图一直显示到那一刻，不会闪出别的角色）；
  // 当前角色缺图时借用默认角色的图，再不行才用矢量小猫
  let currentSprite = null;
  let spriteToken = 0;
  function renderSprite(state, force) {
    if (state === currentSprite && !force) return;
    currentSprite = state;
    el.pet.className = 'anim-' + state;
    const token = ++spriteToken;
    const candidates = [charId(), 'bluefish'].filter((v, i, a) => a.indexOf(v) === i);
    (function tryNext() {
      const id = candidates.shift();
      if (!id) {
        el.svg.innerHTML = KittenArt.svg(KittenArt.STATES.includes(state) ? state : 'idle');
        el.svg.classList.remove('hidden');
        el.sprite.classList.add('hidden');
        return;
      }
      const src = SkCharacters.sprite(id, state);
      const img = new Image();
      img.onload = () => {
        if (token !== spriteToken) return; // 已经有更新的表情了
        el.sprite.src = src;
        el.sprite.classList.remove('hidden');
        el.svg.classList.add('hidden');
      };
      img.onerror = () => { if (token === spriteToken) tryNext(); };
      img.src = src;
    })();
  }

  // 临时动作（例如问候 8 秒）覆盖基础状态
  let temp = null; // { state, until }
  function setTemp(state, ms) {
    temp = { state, until: Date.now() + ms };
    refreshSprite();
  }
  let lunchSoon = false;
  function baseSprite(phase) {
    switch (phase) {
      case 'working': return lunchSoon ? 'hungry' : 'working';
      case 'lunch': return 'rest';
      case 'after':
      case 'dayoff': return 'offwork';
      default: return 'idle';
    }
  }
  function refreshSprite() {
    if (temp && Date.now() > temp.until) temp = null;
    renderSprite(temp ? temp.state : baseSprite(lastPhase || 'before'));
  }

  // ---------- 气泡 ----------
  let bubbleTimer = null;
  function say(text, ms = 6500, big = false) {
    el.details.classList.add('hidden');
    el.bubbleText.textContent = text;
    el.bubble.classList.toggle('big', big);
    el.bubble.classList.remove('hidden');
    clearTimeout(bubbleTimer);
    bubbleTimer = setTimeout(() => el.bubble.classList.add('hidden'), ms);
  }

  // ---------- 系统通知 ----------
  let notifyGranted = false, notifyAsked = false;
  async function notify(body) {
    if (!settings.notify || !T || !T.notification) return;
    try {
      const N = T.notification;
      // 只缓存“已允许”：用户之后在系统设置里打开通知，也能马上生效
      if (!notifyGranted) notifyGranted = await N.isPermissionGranted();
      if (!notifyGranted && !notifyAsked) {
        notifyAsked = true;
        notifyGranted = (await N.requestPermission()) === 'granted';
      }
      if (notifyGranted) N.sendNotification({ title: '薪水小猫', body });
    } catch (_) { /* 通知失败不影响桌宠 */ }
  }

  const money = (v) => E.formatMoney(v, settings);
  const maskText = () => settings.currency + '***' + (settings.decimals > 0 ? '.' + '*'.repeat(settings.decimals) : '');
  // 对外展示的金额（气泡、通知、托盘）：隐藏模式下一律打码
  const shown = (v) => (masked ? maskText() : money(v));

  // ---------- 阶段 & 事件 ----------
  let lastPhase = null;
  let lastDay = null;
  let info = null;

  function greet(i) {
    switch (i.phase) {
      case 'working': say(SkLines.greetWorking(shown(i.earned))); setTemp('hello', 6000); break;
      case 'before': say(SkLines.greetBefore(E.formatDuration(i.toStart))); break;
      case 'lunch': say(SkLines.greetLunch()); break;
      case 'after': say(SkLines.greetAfter(shown(i.earned))); break;
      default: say(SkLines.greetDayoff());
    }
  }

  function onPhaseChange(prev, next, i) {
    if (next === 'working' && prev === 'lunch') {
      const t = SkLines.lunchEnd(); say(t); setTemp('hello', 5000); notify(t);
    } else if (next === 'working') {
      const t = SkLines.startWork(); say(t, 8000); setTemp('hello', 8000); notify(t);
    } else if (next === 'lunch') {
      const t = SkLines.lunchStart(); say(t, 9000); setTemp('hungry', 5000); notify(t);
    } else if (next === 'after') {
      const t = SkLines.offWork(shown(i.earned)); say(t, 12000, true); setTemp('bye', 60000); notify(t);
    } else if (next === 'dayoff') {
      say(SkLines.greetDayoff());
    }
  }

  function goalKey(day) { return day + '|' + settings.goal; }

  function checkGoal(i, day) {
    if (!settings.goal || i.earned < settings.goal) return;
    if (SkStore.get('goalHit') === goalKey(day)) return;
    SkStore.set('goalHit', goalKey(day));
    const t = SkLines.goal(shown(settings.goal));
    say(t, 10000, true);
    setTemp('celebrate', 10000);
    popCoin('🎉 ' + shown(settings.goal));
    notify(t);
  }

  function checkLunchSoon(i, day) {
    const mins = settings.lunchReminderMin;
    lunchSoon = i.phase === 'working' && mins > 0 && i.toLunch != null && i.toLunch <= mins * 60;
    const key = `${day}|${settings.lunchStart}|${mins}`;
    if (lunchSoon && SkStore.get('lunchWarned') !== key) {
      SkStore.set('lunchWarned', key);
      const t = SkLines.lunchSoon(Math.max(1, Math.round(i.toLunch / 60)));
      say(t, 8000);
      notify(t);
    }
  }

  // 每 15 秒冒一个 “+¥x.xx” 金币
  let lastPopEarned = null, lastPopAt = 0;
  function maybePop(i) {
    if (i.phase !== 'working') { lastPopEarned = null; return; }
    if (lastPopEarned === null) { lastPopEarned = i.earned; lastPopAt = Date.now(); return; }
    if (Date.now() - lastPopAt < 15000) return;
    const gain = i.earned - lastPopEarned;
    lastPopEarned = i.earned; lastPopAt = Date.now();
    if (gain > 0 && !masked) popCoin('+' + money(gain));
  }

  function popCoin(text) {
    const c = document.createElement('div');
    c.className = 'coin-pop';
    c.textContent = text;
    c.style.marginLeft = (Math.random() * 60 - 30) + 'px';
    el.coins.appendChild(c);
    setTimeout(() => c.remove(), 1700);
  }

  function tick() {
    const now = clock();
    const day = E.dayKey(now);
    info = E.info(settings, now);

    if (lastPhase === null) greet(info);
    else if (info.phase !== lastPhase) onPhaseChange(lastPhase, info.phase, info);
    if (lastDay && day !== lastDay) lastPopEarned = null;

    lastPhase = info.phase;
    lastDay = day;

    checkLunchSoon(info, day);
    checkGoal(info, day);
    maybePop(info);
    refreshSprite();
    renderStatus(info);
    syncTray(info);
  }

  // ---------- 渲染 ----------
  const PHASE_TEXT = { before: '还没上班', working: '今日已赚', lunch: '午休中 · 今日已赚', after: '已下班 · 今日共赚', dayoff: '休息日' };

  function renderStatus(i) {
    el.phaseDot.className = i.phase;
    el.phaseText.textContent = PHASE_TEXT[i.phase];
    el.counter.classList.toggle('no-goal', !settings.goal);
    el.counter.classList.toggle('masked', masked);
    const pct = settings.goal ? Math.min(100, (i.earned / settings.goal) * 100) : 0;
    el.goalBar.style.width = pct + '%';

    $('d-monthly').textContent = masked ? maskText() : money(settings.monthlySalary);
    $('d-daily').textContent = masked ? maskText() : money(i.perDay);
    $('d-hourly').textContent = masked ? maskText() : money(i.perHour);
    let label = '距离下班', val = '—';
    if (i.phase === 'before') { label = '距离上班'; val = E.formatDuration(i.toStart); }
    else if (i.phase === 'working' && i.toLunch != null) { label = '距离午休'; val = E.formatDuration(i.toLunch); }
    else if (i.phase === 'working') { val = E.formatDuration(i.toEnd); }
    else if (i.phase === 'lunch') { label = '午休剩余'; val = E.formatDuration(i.toLunchEnd); }
    else if (i.phase === 'after') { label = '状态'; val = '下班啦~'; }
    else { label = '状态'; val = '休息日'; }
    $('d-next-label').textContent = label;
    $('d-next').textContent = val;
    $('d-goal').textContent = settings.goal ? (masked ? `${pct.toFixed(0)}%` : `${money(i.earned)} / ${money(settings.goal)}`) : '未设置';
    $('d-goal-bar').style.width = pct + '%';
  }

  // 金额数字高频刷新，看起来在“流动”
  function renderAmount() {
    if (masked) { el.amount.textContent = maskText(); return; }
    el.amount.textContent = money(E.earnedAt(settings, clock()));
  }

  let lastTrayText = '';
  function syncTray(i) {
    if (!T) return;
    const m = shown(i.earned);
    const title = settings.trayTitle ? m : '';
    const tooltip = `薪水小猫 · ${PHASE_TEXT[i.phase]} ${m}`;
    const key = title + '|' + tooltip;
    if (key === lastTrayText) return;
    lastTrayText = key;
    invoke('update_tray', { title, tooltip }).catch(() => {});
  }

  // ---------- 交互：拖动 / 点击 / 右键 ----------
  let down = null;
  function onDown(e) {
    if (e.button !== 0) return;
    down = { x: e.screenX, y: e.screenY, target: e.currentTarget };
  }
  window.addEventListener('mousemove', (e) => {
    if (!down) return;
    if (Math.hypot(e.screenX - down.x, e.screenY - down.y) > 4) {
      down = null;
      if (win) win.startDragging().catch(() => {});
    }
  });
  window.addEventListener('mouseup', () => {
    if (!down) return;
    const t = down.target;
    down = null;
    if (t === el.pet) poke();
    else if (t === el.counter) toggleDetails();
  });
  el.pet.addEventListener('mousedown', onDown);
  el.counter.addEventListener('mousedown', onDown);

  function poke() {
    el.pet.classList.remove('poke');
    void el.pet.offsetWidth;
    el.pet.classList.add('poke');
    setTimeout(() => el.pet.classList.remove('poke'), 400);
    if (!info) return;
    const r = SkLines.poke(info.phase, {
      earnedText: shown(info.earned),
      perSecondText: masked ? '***' : settings.currency + info.rate.toFixed(4),
      toEndText: info.toEnd != null ? E.formatDuration(info.toEnd) : '',
      toStartText: info.toStart != null ? E.formatDuration(info.toStart) : '',
      toLunchEndText: info.toLunchEnd != null ? E.formatDuration(info.toLunchEnd) : '',
    });
    say(r.text, 4500);
    setTemp(r.sprite, 3500); // 每句台词配一张对应的表情
  }

  function toggleDetails() {
    const hidden = el.details.classList.toggle('hidden');
    if (!hidden) el.bubble.classList.add('hidden');
  }

  async function openSettings() { invoke('open_settings').catch(() => {}); }
  function toggleMask() {
    masked = !masked;
    SkStore.set('masked', masked);
    lastTrayText = '';
    tick(); renderAmount();
    say(masked ? SkLines.maskOn() : SkLines.maskOff(), 2500);
  }

  // 右键菜单切换角色：写入设置并广播（设置窗口开着的话也会同步）
  function switchCharacter(id) {
    if (id === charId()) return;
    const next = Object.assign(SkStore.load(), { character: id });
    SkStore.save(next);
    if (T) T.event.emit('settings-changed', next);
    else applySettings(next);
  }

  // ---------- 自动更新（状态在 Rust 里，这里只负责提醒和菜单） ----------
  let update = { phase: 'idle' };
  let manualCheck = false;
  let announced = null;
  function onUpdateState(st) {
    update = st;
    if (st.phase === 'ready' && announced !== st.version) {
      announced = st.version;
      const t = `新版本 v${st.version} 已经下载好啦！右键 →「重启并更新」`;
      say(t, 12000, true);
      notify(t);
    } else if (manualCheck && st.phase === 'upToDate') {
      manualCheck = false;
      say(`已经是最新版本 v${st.current} 啦~`, 4000);
    } else if (manualCheck && st.phase === 'failed') {
      manualCheck = false;
      say('检查更新失败了…等会儿再试试吧', 4000);
    }
  }
  function updateMenuText() {
    switch (update.phase) {
      case 'ready': return `🎉 重启并更新到 v${update.version}`;
      case 'downloading': return `正在下载更新… ${update.progress}%`;
      case 'checking': return '正在检查更新…';
      default: return '检查更新';
    }
  }
  function onUpdateMenu() {
    if (update.phase === 'ready') { invoke('update_install').catch(() => {}); return; }
    if (update.phase === 'checking' || update.phase === 'downloading') return;
    manualCheck = true;
    say('正在检查更新…', 3000);
    invoke('update_check', { background: false }).catch(() => {});
  }
  function autoCheckUpdate() {
    if (settings.autoUpdate !== false) invoke('update_check', { background: true }).catch(() => {});
  }

  let ctx = null; // { menu, maskItem, charItems, updateItem }
  async function buildMenu() {
    const M = T.menu;
    const charItems = await Promise.all(SkCharacters.list.map((c) =>
      M.CheckMenuItem.new({ id: 'char-' + c.id, text: c.name, checked: false, action: () => switchCharacter(c.id) })));
    const maskItem = await M.MenuItem.new({ id: 'mask', text: '', action: toggleMask });
    const updateItem = await M.MenuItem.new({ id: 'update', text: '检查更新', action: onUpdateMenu });
    const menu = await M.Menu.new({
      items: [
        await M.MenuItem.new({ id: 'settings', text: '设置…', action: openSettings }),
        await M.Submenu.new({ text: '切换角色', items: charItems }),
        maskItem,
        await M.MenuItem.new({ id: 'details', text: '查看详情', action: toggleDetails }),
        await M.PredefinedMenuItem.new({ item: 'Separator' }),
        updateItem,
        await M.MenuItem.new({ id: 'hide', text: '隐藏桌宠（托盘可唤回）', action: hidePet }),
        await M.MenuItem.new({ id: 'quit', text: '退出', action: () => invoke('quit_app') }),
      ],
    });
    return { menu, maskItem, charItems, updateItem };
  }

  window.addEventListener('contextmenu', async (e) => {
    e.preventDefault();
    if (!T || !T.menu) { openSettings(); return; }
    try {
      if (!ctx) ctx = await buildMenu();
      await ctx.maskItem.setText(masked ? '显示金额' : '隐藏金额（老板来了）');
      await ctx.updateItem.setText(updateMenuText());
      await Promise.all(ctx.charItems.map((item, k) => item.setChecked(SkCharacters.list[k].id === charId())));
      await ctx.menu.popup();
    } catch (err) { console.error(err); openSettings(); }
  });

  // ---------- 透明区域点击穿透 ----------
  // 鼠标不在角色/计数器/气泡上时，让点击穿透到桌面
  let ignoring = false, winPos = null, scale = 1;
  let petVisible = true; // 隐藏时暂停轮询（托盘切换由 Rust 发 pet-visibility 事件）
  function hidePet() { petVisible = false; if (win) win.hide(); }
  async function setupClickThrough() {
    if (!win || typeof T.window.cursorPosition !== 'function') return;
    try {
      winPos = await win.outerPosition();
      scale = await win.scaleFactor();
      win.onMoved(({ payload }) => { winPos = payload; savePos(payload); });
      win.onScaleChanged(({ payload }) => { scale = payload.scaleFactor; });
    } catch (_) { return; }

    const hitEls = [el.pet, el.counter, el.bubble, el.details];
    setInterval(async () => {
      if (down || !petVisible) return;
      let p;
      try { p = await T.window.cursorPosition(); } catch (_) { return; }
      const x = (p.x - winPos.x) / scale, y = (p.y - winPos.y) / scale;
      const hit = hitEls.some((n) => {
        if (n.classList.contains('hidden')) return false;
        const r = n.getBoundingClientRect();
        return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
      });
      if (hit === !ignoring) return;
      ignoring = !hit;
      win.setIgnoreCursorEvents(ignoring).catch(() => {});
    }, 100);
  }

  // ---------- 位置记忆 ----------
  let saveTimer = null;
  function savePos(p) {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => SkStore.set('pos', { x: p.x, y: p.y }), 400);
  }
  async function restorePos() {
    if (!win) return;
    try {
      const saved = SkStore.get('pos', null);
      const mons = await T.window.availableMonitors();
      const size = await win.outerSize();
      const areaOf = (m) => m.workArea || { position: m.position, size: m.size };
      const home = mons.find((m) => {
        const a = areaOf(m);
        return saved && saved.x >= a.position.x && saved.y >= a.position.y &&
          saved.x < a.position.x + a.size.width && saved.y < a.position.y + a.size.height;
      });
      let x, y, a;
      if (home) {
        a = areaOf(home);
        x = saved.x; y = saved.y;
      } else {
        const m = (await T.window.currentMonitor()) || mons[0];
        if (!m) return;
        a = areaOf(m);
        const s = m.scaleFactor || 1;
        x = a.position.x + a.size.width - size.width - 20 * s;
        y = a.position.y + a.size.height - size.height;
      }
      // 整个窗口都要在屏幕工作区里（窗口变高后旧位置可能会掉到屏幕外）
      x = Math.min(Math.max(x, a.position.x), a.position.x + a.size.width - size.width);
      y = Math.min(Math.max(y, a.position.y), a.position.y + a.size.height - size.height);
      await win.setPosition(new dpi.PhysicalPosition(Math.round(x), Math.round(y)));
    } catch (err) { console.error(err); }
  }

  // ---------- 设置变更 / 预览 ----------
  function applySettings(next) {
    const prevChar = charId();
    settings = E.normalize(next);
    lastTrayText = '';
    lunchSoon = false;
    if (charId() !== prevChar) {
      useCharacter(charId());
      temp = null;
      tick();
      greet(info); // 新角色上场打个招呼
      setTemp('hello', 4000);
    } else {
      tick();
    }
    renderAmount();
  }

  const PREVIEW = {
    start: () => { say(SkLines.startWork(), 6000); setTemp('hello', 6000); },
    lunchSoon: () => { say(SkLines.lunchSoon(settings.lunchReminderMin || 5), 6000); setTemp('hungry', 6000); },
    lunch: () => { say(SkLines.lunchStart(), 6000); setTemp('rest', 6000); },
    lunchEnd: () => { say(SkLines.lunchEnd(), 6000); setTemp('hello', 6000); },
    off: () => { say(SkLines.offWork(shown(info ? info.earned : 0)), 6000, true); setTemp('bye', 6000); },
    goal: () => { say(SkLines.goal(shown(settings.goal || 100)), 6000, true); setTemp('celebrate', 6000); popCoin('🎉'); },
  };

  async function init() {
    useCharacter(charId());
    tick();
    renderAmount();
    setInterval(tick, 1000);
    setInterval(renderAmount, 100);
    if (!T) return;
    T.event.listen('settings-changed', (e) => applySettings(e.payload));
    T.event.listen('sk-preview', (e) => PREVIEW[e.payload] && PREVIEW[e.payload]());
    T.event.listen('pet-visibility', (e) => { petVisible = !!e.payload; });
    T.event.listen('update-state', (e) => onUpdateState(e.payload));
    invoke('update_status').then(onUpdateState).catch(() => {});
    setTimeout(autoCheckUpdate, 20000);            // 启动后后台检查一次
    setInterval(autoCheckUpdate, 12 * 3600 * 1000); // 桌宠常驻，之后每 12 小时再查一次
    await restorePos();
    setupClickThrough();
    if (params.has('details')) toggleDetails(); // 调试：启动即展开详情卡片
    if (params.has('settings')) openSettings();
  }

  init();
})();
