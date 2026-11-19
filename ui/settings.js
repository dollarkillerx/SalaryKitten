/* 设置面板 */
(function () {
  const E = SalaryEngine;
  const T = window.__TAURI__ || null;
  const form = document.getElementById('form');
  const $ = (id) => document.getElementById(id);
  const DAY_NAMES = ['日', '一', '二', '三', '四', '五', '六'];
  const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

  // 角色图：优先 PNG，缺失用矢量兜底
  let svgSeq = 0;
  function charPic(box, id, state) {
    const img = new Image();
    img.onload = () => { box.innerHTML = ''; box.appendChild(img); };
    img.onerror = () => { box.innerHTML = KittenArt.svg(state).replace(/sk-/g, 'av' + (++svgSeq) + '-'); };
    img.src = SkCharacters.sprite(id, state);
  }

  // 角色选择卡片
  $('chars').innerHTML = SkCharacters.list.map((c) =>
    `<label><input type="radio" name="character" value="${c.id}" />
       <div class="pic" data-pic="${c.id}"></div><b>${c.name}</b><small>${c.desc}</small></label>`).join('');
  document.querySelectorAll('[data-pic]').forEach((box) => charPic(box, box.dataset.pic, 'idle'));

  // 头部头像/标题跟随当前选中的角色
  let shownChar = null;
  function showCharacter(id) {
    const c = SkCharacters.get(id);
    if (c.id === shownChar) return;
    shownChar = c.id;
    SkCharacters.applyTheme(c.id, { soft: false });
    charPic($('avatar'), c.id, 'happy');
    $('title').textContent = '薪水小猫 · ' + c.name;
    $('subtitle').textContent = c.desc + '，会实时帮你数钱钱~';
  }

  $('days').innerHTML = DAY_ORDER.map((d) =>
    `<label title="周${DAY_NAMES[d]}"><input type="checkbox" name="day" value="${d}" />${DAY_NAMES[d]}</label>`).join('');

  function fill(s) {
    for (const el of form.elements) {
      if (!el.name || el.name === 'day') continue;
      if (!(el.name in s)) continue;
      if (el.type === 'checkbox') el.checked = !!s[el.name];
      else if (el.type === 'radio') el.checked = el.value === s[el.name];
      else el.value = s[el.name];
    }
    form.querySelectorAll('input[name="day"]').forEach((el) => { el.checked = s.workDays.includes(Number(el.value)); });
    update();
  }

  function read() {
    const out = {};
    for (const el of form.elements) {
      if (!el.name || el.name === 'day') continue;
      if (el.type === 'checkbox') out[el.name] = el.checked;
      else if (el.type === 'radio') { if (el.checked) out[el.name] = el.value; }
      else if (el.type === 'number' || el.tagName === 'SELECT') out[el.name] = Number(el.value);
      else out[el.name] = el.value.trim();
    }
    out.workDays = [...form.querySelectorAll('input[name="day"]:checked')].map((el) => Number(el.value));
    if (!out.currency) out.currency = '¥';
    return out;
  }

  function update() {
    const raw = read();
    const s = E.normalize(raw);
    $('cur-prefix').textContent = $('cur-prefix2').textContent = s.currency;
    $('lunch-fields').classList.toggle('disabled', !s.lunchEnabled);
    showCharacter(raw.character);
    const errs = E.validate(raw);
    const box = $('errors');
    box.classList.toggle('hidden', !errs.length);
    box.innerHTML = errs.map((e) => '⚠️ ' + e).join('<br>');
    const rate = E.ratePerSecond(s);
    const fmt = (v, d) => s.currency + v.toFixed(d);
    $('p-day').textContent = errs.length ? '-' : fmt(rate * E.workdaySeconds(s), 2);
    $('p-hour').textContent = errs.length ? '-' : fmt(rate * 3600, 2);
    $('p-sec').textContent = errs.length ? '-' : fmt(rate, 4);
    return errs;
  }

  async function syncAutostart(want) {
    if (!T || !T.autostart) return;
    try {
      const on = await T.autostart.isEnabled();
      if (want && !on) await T.autostart.enable();
      if (!want && on) await T.autostart.disable();
    } catch (err) { console.error('autostart', err); }
  }

  let toastTimer;
  function toast(text) {
    const t = $('toast');
    t.textContent = text;
    t.classList.remove('hidden');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.add('hidden'), 1800);
  }

  form.addEventListener('input', update);

  // 选角色立即生效（只改角色，不动其它未保存的输入）
  $('chars').addEventListener('change', async (e) => {
    if (e.target.name !== 'character') return;
    const next = Object.assign(SkStore.load(), { character: e.target.value });
    SkStore.save(next);
    if (T) await T.event.emit('settings-changed', next);
    toast('换成 ' + SkCharacters.get(e.target.value).name + ' 啦~');
  });

  // 桌宠右键菜单里切换角色时，同步这里的选中状态
  if (T) T.event.listen('settings-changed', (e) => {
    const id = e.payload && e.payload.character;
    const radio = id && form.querySelector(`input[name="character"][value="${id}"]`);
    if (radio && !radio.checked) { radio.checked = true; update(); }
  });
  form.addEventListener('change', update);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (update().length) return;
    const s = Object.assign(SkStore.load(), read());
    SkStore.save(s);
    await syncAutostart(!!s.autostart);
    if (T) await T.event.emit('settings-changed', s);
    toast('已保存，欧鲸鲸~');
  });

  $('reset').addEventListener('click', () => {
    fill(E.normalize(Object.assign({ trayTitle: true, autostart: false }, E.DEFAULTS)));
    toast('已恢复默认，记得点保存哦');
  });

  document.querySelectorAll('[data-preview]').forEach((b) =>
    b.addEventListener('click', () => {
      if (T) T.event.emit('sk-preview', b.dataset.preview);
      else toast('在 App 里才能预览哦');
    }));

  // ---------- 更新（参考 MySSH：检查 → 下载 → 重启更新） ----------
  let updatePhase = 'idle';
  function renderUpdate(st) {
    updatePhase = st.phase;
    $('u-current').textContent = '当前版本 v' + st.current;
    const text = {
      idle: '',
      checking: '正在检查更新…',
      upToDate: '已经是最新版本啦~',
      downloading: `正在下载 v${st.version}… ${st.progress}%`,
      ready: `v${st.version} 已下载好，重启即可更新`,
      failed: '检查更新失败：' + (st.error || ''),
    }[st.phase] || '';
    $('u-status').textContent = text;
    $('u-bar-wrap').classList.toggle('hidden', st.phase !== 'downloading');
    $('u-bar').style.width = (st.progress || 0) + '%';
    const btn = $('u-btn');
    btn.disabled = st.phase === 'checking' || st.phase === 'downloading';
    btn.classList.toggle('ready', st.phase === 'ready');
    btn.textContent = st.phase === 'ready' ? '重启并更新' : '检查更新';
  }
  $('u-btn').addEventListener('click', () => {
    if (!T) { toast('在 App 里才能检查更新哦'); return; }
    if (updatePhase === 'ready') T.core.invoke('update_install').catch((e) => toast('更新失败：' + e));
    else T.core.invoke('update_check', { background: false }).catch(() => {});
  });
  if (T) {
    T.core.invoke('update_status').then(renderUpdate).catch(() => {});
    T.event.listen('update-state', (e) => renderUpdate(e.payload));
  } else {
    $('u-current').textContent = '当前版本';
  }

  // ---------- 关于：外部链接用系统浏览器打开 ----------
  document.querySelectorAll('a[data-ext]').forEach((a) => a.addEventListener('click', (e) => {
    if (!T || !T.opener) return; // 浏览器预览里按普通链接处理
    e.preventDefault();
    T.opener.openUrl(a.href).catch((err) => toast('打不开链接：' + err));
  }));
  if (T && T.app) T.app.getVersion().then((v) => { $('about-version').textContent = 'v' + v; }).catch(() => {});

  // 初始化：开机自启以系统实际状态为准
  (async () => {
    const s = SkStore.load();
    if (T && T.autostart) {
      try { s.autostart = await T.autostart.isEnabled(); } catch (_) {}
    }
    fill(s);
  })();
})();
