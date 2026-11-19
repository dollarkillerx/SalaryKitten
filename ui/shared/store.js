/* 设置 & 本地状态存储（localStorage，各窗口同源共享） */
(function (root) {
  const KEY = 'sk.settings.v1';
  const Store = {
    load() {
      let saved = {};
      try { saved = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (_) {}
      return SalaryEngine.normalize(Object.assign({ trayTitle: true, autostart: false, autoUpdate: true, character: 'bluefish' }, saved));
    },
    save(s) {
      try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (_) {}
    },
    get(k, dflt) {
      try { const v = localStorage.getItem('sk.' + k); return v == null ? dflt : JSON.parse(v); } catch (_) { return dflt; }
    },
    set(k, v) {
      try { localStorage.setItem('sk.' + k, JSON.stringify(v)); } catch (_) {}
    },
  };
  root.SkStore = Store;
})(window);
