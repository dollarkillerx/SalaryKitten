// 渲染宣传片：headless Chrome 逐帧截图 → ffmpeg 编码，再把配音按时间线铺进去
//   node render.mjs                 完整渲染 → out/salarykitten-promo.mp4
//   node render.mjs --preview       每个场景截一张图 → out/preview/*.png
import puppeteer from 'puppeteer-core';
import { spawn, execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { buildTimeline, FPS } from './timeline.mjs';

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const here = (p) => new URL(p, import.meta.url).pathname;
const preview = process.argv.includes('--preview');
const tl = buildTimeline();
console.log(`timeline ${tl.total.toFixed(1)}s, ${tl.scenes.length} scenes${tl.estimated ? ' (estimated: no voiceover yet)' : ''}`);

const browser = await puppeteer.launch({ executablePath: CHROME, headless: true,
  args: ['--allow-file-access-from-files', '--force-device-scale-factor=1', '--hide-scrollbars'] });
const page = await browser.newPage();
await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 });
await page.goto('file://' + here('./stage.html'));
await page.evaluate((t) => window.setup(t), tl);
// 预加载所有角色切图，避免第一次切表情时出现空白帧
await page.evaluate(async () => {
  const chars = ['bluefish', 'winterfish', 'claude', 'fishclaude', 'gpt'];
  const states = ['idle', 'working', 'happy', 'rest', 'bye', 'celebrate', 'hello', 'offwork', 'hungry'];
  const imgs = chars.flatMap((c) => states.map((s) => { const i = new Image(); i.src = `../ui/assets/characters/${c}/${s}.png`; return i; }));
  await Promise.all([...imgs, ...document.images].map((i) => i.complete ? 0 : new Promise((r) => { i.onload = i.onerror = r; })));
  await document.fonts.ready;
});
const shot = async (t) => { await page.evaluate((x) => window.seek(x), t); return page.screenshot({ type: preview ? 'png' : 'jpeg', quality: preview ? undefined : 92 }); };

if (preview) {
  mkdirSync(here('./out/preview'), { recursive: true });
  for (const [i, s] of tl.scenes.entries()) {
    for (const f of [0.45, 0.85]) {
      const name = `${String(i + 1).padStart(2, '0')}-${s.id}-${Math.round(f * 100)}.png`;
      writeFileSync(here(`./out/preview/${name}`), await shot(s.start + s.dur * f));
    }
  }
  console.log('preview → out/preview/');
  await browser.close();
  process.exit(0);
}

mkdirSync(here('./out'), { recursive: true });
const video = here('./out/video-only.mp4');
const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-i', '-',
  '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '18', '-preset', 'medium', '-r', String(FPS), video], { stdio: ['pipe', 'inherit', 'inherit'] });
const frames = Math.ceil(tl.total * FPS);
const t0 = Date.now();
for (let n = 0; n < frames; n++) {
  const buf = await shot(n / FPS);
  if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r));
  if (n % 150 === 0) process.stdout.write(`\r  frame ${n}/${frames} (${((Date.now() - t0) / 1000).toFixed(0)}s)`);
}
ff.stdin.end();
await new Promise((r, j) => ff.on('close', (c) => (c === 0 ? r() : j(new Error('ffmpeg ' + c)))));
await browser.close();
console.log(`\nvideo → ${video}`);

// 配音：每句放在自己场景的开头
const voiced = tl.scenes.filter((s) => s.audio);
const final = here('./out/salarykitten-promo.mp4');
if (!voiced.length) { console.log('no voiceover yet: run `npm run tts` then render again'); process.exit(0); }
const args = ['-y', '-loglevel', 'error', '-i', video];
voiced.forEach((s) => args.push('-i', s.audio));
const delays = voiced.map((s, i) => `[${i + 1}:a]aresample=48000,adelay=${Math.round(s.start * 1000)}:all=1[a${i}]`).join(';');
const mix = voiced.map((_, i) => `[a${i}]`).join('') + `amix=inputs=${voiced.length}:normalize=0,loudnorm=I=-16:TP=-1.5:LRA=11[aout]`;
args.push('-filter_complex', `${delays};${mix}`, '-map', '0:v', '-map', '[aout]', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-shortest', '-movflags', '+faststart', final);
execFileSync('ffmpeg', args, { stdio: 'inherit' });
console.log(`final → ${final}`);
