/*
 * 矢量版「蓝色女仆小猫」—— 作为 PNG 切图缺失时的兜底素材。
 * KittenArt.svg(state) 返回 SVG 字符串。state 见 STATES。
 */
(function (root) {
  const C = {
    line: '#1B2C66',
    furTop: '#7FB2FF',
    furBottom: '#3A66CC',
    bangs: '#2E56B8',
    dress: '#22397F',
    sleeve: '#2B4FA8',
    paw: '#EAF2FF',
    inner: '#FFB8D0',
    gold: '#FFD45C',
    goldDark: '#E0A21B',
    blush: '#FF9EC0',
    mouth: '#C2405F',
    white: '#FFFFFF',
  };

  // 每个状态的表情/动作配置
  const STATES = {
    idle:      { eyes: 'open',  mouth: 'cat',  arms: 'down' },
    working:   { eyes: 'open',  mouth: 'cat',  arms: 'coin' },
    happy:     { eyes: 'star',  mouth: 'open', arms: 'up',   extras: ['coins'] },
    rest:      { eyes: 'closed', mouth: 'small', arms: 'down', extras: ['zzz'], tilt: -6 },
    bye:       { eyes: 'wink',  mouth: 'open', arms: 'wave' },
    celebrate: { eyes: 'happy', mouth: 'open', arms: 'up',   extras: ['confetti', 'flag'] },
    hello:     { eyes: 'happy', mouth: 'cat',  arms: 'down', extras: ['sweat'] },
    offwork:   { eyes: 'half',  mouth: 'yawn', arms: 'down' },
    hungry:    { eyes: 'open',  mouth: 'open', arms: 'coin', extras: ['sweat'] },
  };

  const SHOULDER_L = [96, 176], SHOULDER_R = [144, 176];
  const ARMS = {
    down: [[80, 204], [160, 204]],
    coin: [[108, 196], [132, 196]],
    up:   [[62, 140], [178, 140]],
    wave: [[80, 204], [184, 132]],
  };

  function eye(cx, cy, kind) {
    const L = C.line;
    switch (kind) {
      case 'happy':
        return `<path d="M${cx - 13} ${cy + 5} Q${cx} ${cy - 13} ${cx + 13} ${cy + 5}" fill="none" stroke="${L}" stroke-width="5" stroke-linecap="round"/>`;
      case 'closed':
        return `<path d="M${cx - 13} ${cy} Q${cx} ${cy + 10} ${cx + 13} ${cy}" fill="none" stroke="${L}" stroke-width="5" stroke-linecap="round"/>`;
      case 'half':
        return `<path d="M${cx - 15} ${cy} A15 15 0 0 0 ${cx + 15} ${cy} Z" fill="${L}"/>
                <path d="M${cx - 11} ${cy + 2} A11 10 0 0 0 ${cx + 11} ${cy + 2} Z" fill="url(#sk-iris)"/>
                <path d="M${cx - 17} ${cy - 1} L${cx + 17} ${cy - 1}" stroke="${L}" stroke-width="4.5" stroke-linecap="round"/>`;
      case 'star': {
        const pts = [];
        for (let i = 0; i < 10; i++) {
          const r = i % 2 ? 7 : 17, a = -Math.PI / 2 + (i * Math.PI) / 5;
          pts.push((cx + r * Math.cos(a)).toFixed(1) + ',' + (cy + r * Math.sin(a)).toFixed(1));
        }
        return `<polygon points="${pts.join(' ')}" fill="${C.gold}" stroke="${L}" stroke-width="3" stroke-linejoin="round"/>`;
      }
      default: // open
        return `<ellipse cx="${cx}" cy="${cy}" rx="15" ry="18" fill="${L}"/>
                <ellipse cx="${cx}" cy="${cy + 3}" rx="11.5" ry="13.5" fill="url(#sk-iris)"/>
                <circle cx="${cx - 5}" cy="${cy - 7}" r="5.5" fill="#fff"/>
                <circle cx="${cx + 5}" cy="${cy + 7}" r="2.6" fill="#fff"/>`;
    }
  }

  function mouth(kind) {
    const L = C.line;
    switch (kind) {
      case 'open':
        return `<path d="M109 121 Q120 142 131 121 Z" fill="${C.mouth}" stroke="${L}" stroke-width="3" stroke-linejoin="round"/>
                <path d="M114 131 Q120 127 126 131 Q123 136 120 136 Q117 136 114 131Z" fill="#FF8FA8"/>`;
      case 'yawn':
        return `<ellipse cx="120" cy="127" rx="7" ry="9" fill="${C.mouth}" stroke="${L}" stroke-width="3"/>`;
      case 'small':
        return `<path d="M115 124 Q120 128 125 124" fill="none" stroke="${L}" stroke-width="3" stroke-linecap="round"/>`;
      default: // cat ω
        return `<path d="M108 121 Q114 129 120 121 Q126 129 132 121" fill="none" stroke="${L}" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/>`;
    }
  }

  function coin(cx, cy, r) {
    return `<g><circle cx="${cx}" cy="${cy}" r="${r}" fill="${C.gold}" stroke="${C.goldDark}" stroke-width="${Math.max(2, r / 5)}"/>
      <text x="${cx}" y="${cy + r * 0.38}" font-size="${r * 1.1}" font-weight="900" text-anchor="middle" fill="${C.goldDark}" font-family="Arial, sans-serif">¥</text></g>`;
  }

  function arms(kind) {
    const [l, r] = ARMS[kind] || ARMS.down;
    const seg = (s, p) =>
      `<path d="M${s[0]} ${s[1]} L${p[0]} ${p[1]}" stroke="${C.line}" stroke-width="21" stroke-linecap="round"/>
       <path d="M${s[0]} ${s[1]} L${p[0]} ${p[1]}" stroke="${C.sleeve}" stroke-width="15" stroke-linecap="round"/>
       <circle cx="${p[0]}" cy="${p[1]}" r="10" fill="${C.paw}" stroke="${C.line}" stroke-width="3"/>`;
    const out = seg(SHOULDER_L, l) + seg(SHOULDER_R, r);
    // 抱金币：金币画在手臂后面、爪子之间
    return kind === 'coin' ? coin(120, 188, 16) + out : out;
  }

  function extras(list) {
    let s = '';
    for (const x of list || []) {
      if (x === 'zzz') {
        s += `<g class="sk-zzz" font-family="Arial Rounded MT Bold, Arial, sans-serif" font-weight="900" fill="#6FA8FF" stroke="${C.line}" stroke-width="1.5">
                <text x="178" y="52" font-size="18">z</text><text x="194" y="34" font-size="24">Z</text><text x="212" y="14" font-size="28">Z</text></g>`;
      } else if (x === 'sweat') {
        s += `<path d="M184 56 Q192 70 184 76 Q176 70 184 56Z" fill="#BFE0FF" stroke="${C.line}" stroke-width="2.5"/>`;
      } else if (x === 'coins') {
        s += `<g class="sk-float">${coin(30, 92, 11)}${coin(212, 86, 12)}${coin(42, 40, 8)}${coin(200, 30, 9)}</g>`;
      } else if (x === 'confetti') {
        const bits = [[24, 40, '#FF7AA8', 20], [46, 18, '#FFD45C', -30], [196, 20, '#6FA8FF', 15], [216, 60, '#7BE0B0', 40],
          [30, 110, '#6FA8FF', 60], [208, 112, '#FF7AA8', -20], [70, 8, '#7BE0B0', 10], [168, 6, '#FFD45C', 70]];
        s += `<g class="sk-float">` + bits.map(([x1, y1, c, a]) =>
          `<rect x="${x1}" y="${y1}" width="9" height="5" rx="1.5" fill="${c}" transform="rotate(${a} ${x1 + 4} ${y1 + 2})"/>`).join('') + `</g>`;
      } else if (x === 'flag') {
        s += `<path d="M178 140 L178 70" stroke="${C.line}" stroke-width="4" stroke-linecap="round"/>
              <path d="M178 72 L226 80 L178 100 Z" fill="${C.gold}" stroke="${C.line}" stroke-width="3" stroke-linejoin="round"/>
              <text x="196" y="91" font-size="11" font-weight="900" text-anchor="middle" fill="${C.line}">达成</text>
              <circle cx="178" cy="140" r="10" fill="${C.paw}" stroke="${C.line}" stroke-width="3"/>`;
      }
    }
    return s;
  }

  function svg(state) {
    const st = STATES[state] || STATES.idle;
    const L = C.line;
    const leftEye = st.eyes === 'wink' ? 'open' : st.eyes;
    const rightEye = st.eyes === 'wink' ? 'happy' : st.eyes;
    const frills = [];
    for (let x = 80; x <= 160; x += 13) {
      const y = 36 + Math.pow((x - 120) / 40, 2) * 10;
      frills.push(`<circle cx="${x}" cy="${y.toFixed(1)}" r="9" fill="#fff" stroke="#BFD0EE" stroke-width="2"/>`);
    }

    return `<svg viewBox="0 0 240 240" xmlns="http://www.w3.org/2000/svg" class="sk-svg sk-${state}">
  <defs>
    <linearGradient id="sk-fur" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${C.furTop}"/><stop offset="1" stop-color="${C.furBottom}"/>
    </linearGradient>
    <linearGradient id="sk-iris" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#1B3D9E"/><stop offset="1" stop-color="#6FB0FF"/>
    </linearGradient>
    <filter id="sk-sticker" x="-15%" y="-15%" width="130%" height="130%">
      <feMorphology in="SourceAlpha" operator="dilate" radius="6" result="w"/>
      <feFlood flood-color="#ffffff"/><feComposite in2="w" operator="in" result="white"/>
      <feGaussianBlur in="w" stdDeviation="3" result="b"/>
      <feOffset in="b" dy="3" result="ob"/>
      <feFlood flood-color="#1B2C66" flood-opacity="0.25"/><feComposite in2="ob" operator="in" result="shadow"/>
      <feMerge><feMergeNode in="shadow"/><feMergeNode in="white"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>
  <g filter="url(#sk-sticker)">
    <!-- 尾巴 -->
    <g class="sk-tail">
      <path d="M150 210 C200 214 222 176 204 142 C198 130 184 136 190 150 C202 176 186 198 150 198 Z"
            fill="url(#sk-fur)" stroke="${L}" stroke-width="3.5" stroke-linejoin="round"/>
      <path d="M196 146 C192 136 186 138 190 150 C192 154 197 152 196 146Z" fill="${C.paw}"/>
    </g>
    <!-- 身体 / 裙子 -->
    <ellipse cx="100" cy="230" rx="14" ry="8" fill="url(#sk-fur)" stroke="${L}" stroke-width="3"/>
    <ellipse cx="140" cy="230" rx="14" ry="8" fill="url(#sk-fur)" stroke="${L}" stroke-width="3"/>
    <path d="M88 166 Q120 156 152 166 L172 222 Q120 236 68 222 Z" fill="${C.dress}" stroke="${L}" stroke-width="3.5" stroke-linejoin="round"/>
    <path d="M99 172 Q120 167 141 172 L150 220 Q120 228 90 220 Z" fill="#fff" stroke="#BFD0EE" stroke-width="2"/>
    <path d="M90 220 Q96 226 102 222 Q108 228 114 223 Q120 229 126 223 Q132 228 138 222 Q144 226 150 220" fill="none" stroke="#BFD0EE" stroke-width="2"/>
    ${coin(120, 204, 8)}
    <path d="M108 166 L120 172 L132 166 L132 178 L120 172 L108 178 Z" fill="#6FA8FF" stroke="${L}" stroke-width="2.5" stroke-linejoin="round"/>
    <circle cx="120" cy="172" r="3.5" fill="${C.gold}" stroke="${L}" stroke-width="1.5"/>
    <!-- 头 -->
    <g class="sk-head" transform="rotate(${st.tilt || 0} 120 100)">
      <path d="M50 76 L58 12 L106 46 Z" fill="url(#sk-fur)" stroke="${L}" stroke-width="3.5" stroke-linejoin="round"/>
      <path d="M62 60 L66 28 L92 48 Z" fill="${C.inner}"/>
      <path d="M190 76 L182 12 L134 46 Z" fill="url(#sk-fur)" stroke="${L}" stroke-width="3.5" stroke-linejoin="round"/>
      <path d="M178 60 L174 28 L148 48 Z" fill="${C.inner}"/>
      <ellipse cx="120" cy="96" rx="80" ry="66" fill="url(#sk-fur)" stroke="${L}" stroke-width="3.5"/>
      <path d="M58 70 Q76 98 90 64 Q104 96 120 62 Q136 96 150 64 Q164 98 182 70 Q160 38 120 36 Q80 38 58 70 Z" fill="${C.bangs}" opacity="0.85"/>
      ${frills.join('')}
      <path d="M150 40 L166 30 L166 50 Z M150 40 L134 30 L134 50 Z" fill="#6FA8FF" stroke="${L}" stroke-width="2.5" stroke-linejoin="round" transform="translate(16 -2)"/>
      <circle cx="166" cy="38" r="4" fill="${C.gold}" stroke="${L}" stroke-width="1.5"/>
      <ellipse cx="120" cy="124" rx="36" ry="22" fill="${C.paw}" opacity="0.92"/>
      <ellipse cx="70" cy="122" rx="13" ry="7" fill="${C.blush}" opacity="0.6"/>
      <ellipse cx="170" cy="122" rx="13" ry="7" fill="${C.blush}" opacity="0.6"/>
      <path d="M48 116 L68 118 M48 128 L68 125 M192 116 L172 118 M192 128 L172 125" stroke="${L}" stroke-width="2" stroke-linecap="round" opacity="0.7"/>
      ${eye(86, 100, leftEye)}
      ${eye(154, 100, rightEye)}
      <path d="M116 113 L124 113 L120 118 Z" fill="${C.inner}" stroke="${L}" stroke-width="1.8" stroke-linejoin="round"/>
      ${mouth(st.mouth)}
    </g>
    ${arms(st.arms)}
    ${extras(st.extras)}
  </g>
</svg>`;
  }

  const api = { svg, STATES: Object.keys(STATES) };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.KittenArt = api;
})(typeof window !== 'undefined' ? window : globalThis);
