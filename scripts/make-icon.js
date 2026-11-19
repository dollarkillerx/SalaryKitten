// 生成一个简单的小猫头像 PNG（不依赖第三方库），用作应用图标源文件。
// 用法: node scripts/make-icon.js assets/icon-source.png
const fs = require('fs'), zlib = require('zlib');
const N = 1024, px = Buffer.alloc(N * N * 4);
const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
function blend(i, c, a) {
  if (a <= 0) return; a = Math.min(1, a);
  const o = i * 4, da = px[o + 3] / 255, na = a + da * (1 - a);
  for (let k = 0; k < 3; k++) px[o + k] = Math.round((c[k] * a + px[o + k] * da * (1 - a)) / (na || 1));
  px[o + 3] = Math.round(na * 255);
}
// 形状 = 有符号距离函数（负数在内部）
const ellipse = (cx, cy, rx, ry) => (x, y) => (Math.hypot((x - cx) / rx, (y - cy) / ry) - 1) * Math.min(rx, ry);
function tri(a, b, c) {
  return (x, y) => {
    const e = [[a, b], [b, c], [c, a]].map(([p, q]) => {
      const nx = q[1] - p[1], ny = p[0] - q[0], l = Math.hypot(nx, ny);
      return ((x - p[0]) * nx + (y - p[1]) * ny) / l;
    });
    // e 是 -cross(边, 点)；按三角形朝向统一成“内部为正”，SDF 取负的最小值
    const orient = ((b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])) > 0 ? -1 : 1;
    return -Math.min(...e.map((v) => v * orient));
  };
}
const union = (...fs) => (x, y) => Math.min(...fs.map((f) => f(x, y)));
const grow = (f, r) => (x, y) => f(x, y) - r;
function fill(f, color, gradTo) {
  const c1 = hex(color), c2 = gradTo ? hex(gradTo) : c1;
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const d = f(x + 0.5, y + 0.5); if (d > 1) continue;
    const t = y / N, c = c1.map((v, k) => v + (c2[k] - v) * t);
    blend(y * N + x, c, 0.5 - d);
  }
}
const head = union(ellipse(512, 590, 400, 330), tri([170, 420], [210, 90], [450, 270]), tri([854, 420], [814, 90], [574, 270]));
fill(grow(head, 40), '#FFFFFF');
fill(grow(head, 16), '#1B2C66');
fill(head, '#7FB2FF', '#2E56B8');
fill(tri([240, 360], [262, 170], [400, 280]), '#FFB8D0');
fill(tri([784, 360], [762, 170], [624, 280]), '#FFB8D0');
fill(ellipse(512, 720, 180, 110), '#EAF2FF');
for (const cx of [350, 674]) {
  fill(ellipse(cx, 560, 78, 94), '#1B2C66');
  fill(ellipse(cx, 576, 60, 72), '#4F8DFF', '#1B3D9E');
  fill(ellipse(cx - 24, 524, 26, 26), '#FFFFFF');
  fill(ellipse(cx + 26, 610, 13, 13), '#FFFFFF');
}
fill(ellipse(240, 690, 60, 34), '#FF9EC0');
fill(ellipse(784, 690, 60, 34), '#FF9EC0');
fill(ellipse(512, 680, 22, 16), '#FF8FB0');
// 金币
fill(ellipse(512, 805, 74, 74), '#E0A21B');
fill(ellipse(512, 805, 58, 58), '#FFD45C');

const raw = Buffer.alloc((N * 4 + 1) * N);
for (let y = 0; y < N; y++) { raw[y * (N * 4 + 1)] = 0; px.copy(raw, y * (N * 4 + 1) + 1, y * N * 4, (y + 1) * N * 4); }
const crcT = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
const crc = (b) => { let c = 0xffffffff; for (const v of b) c = crcT[(c ^ v) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
const chunk = (t, d) => { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(t), d]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([l, td, c]); };
const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(N, 0); ihdr.writeUInt32BE(N, 4); ihdr[8] = 8; ihdr[9] = 6;
fs.writeFileSync(process.argv[2] || 'icon.png', Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]));
