/* 角色清单：新增角色 = 在这里加一项 + 放 9 张切图到 ui/assets/characters/<id>/ + 在 lines.js 写台词 */
(function (root) {
  const list = [
    {
      id: 'bluefish',
      name: '蓝色大肥鱼',
      desc: '吃不饱的鲸鱼女仆，欧鲸鲸',
      // line=描边/文字  main=主色  soft=浅底  accent=辅色
      theme: { line: '#1b2c66', main: '#2b4fa8', soft: '#eaf2ff', accent: '#6fa8ff' },
    },
    {
      id: 'winterfish',
      name: '冬装大肥鱼',
      desc: '戴鲸鱼帽的冬天限定款',
      theme: { line: '#1b2c66', main: '#3b5bb5', soft: '#eef5ff', accent: '#9cc8ff' },
    },
    {
      id: 'claude',
      name: 'Claude娘',
      desc: '爱喝茶的温柔小助手',
      theme: { line: '#5a2a12', main: '#d4682a', soft: '#fff3e6', accent: '#f2a65a' },
    },
    {
      id: 'fishclaude',
      name: '冒牌 Claude',
      desc: '挂上工牌混进公司的大肥鱼',
      theme: { line: '#1b2c66', main: '#d4682a', soft: '#fff4e8', accent: '#6fa8ff' },
    },
    {
      id: 'gpt',
      name: 'GPT娘',
      desc: '嘴硬心软的白龙',
      theme: { line: '#3d3566', main: '#7b6cc9', soft: '#f3f0ff', accent: '#b9adf0' },
    },
  ];

  const byId = Object.fromEntries(list.map((c) => [c.id, c]));

  root.SkCharacters = {
    list,
    get: (id) => byId[id] || list[0],
    sprite: (id, state) => `assets/characters/${id}/${state}.png`,
    /** 把角色配色写进 CSS 变量；soft=false 时不覆盖浅底色（设置页暗色模式用） */
    applyTheme(id, { soft = true } = {}) {
      const t = (byId[id] || list[0]).theme;
      const s = document.documentElement.style;
      s.setProperty('--navy', t.line);
      s.setProperty('--blue', t.main);
      s.setProperty('--sky', t.accent);
      if (soft) s.setProperty('--ice', t.soft);
      document.documentElement.dataset.character = id;
    },
  };
})(window);
