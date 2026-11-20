// 用通义千问 TTS（qwen3-tts-flash）给每句台词配音 → audio/NN-<id>.wav
//   API Key：环境变量 DASHSCOPE_API_KEY，或文件 ~/.config/dashscope/api_key（只放 key 一行）
//   国际站（新加坡）Key：DASHSCOPE_BASE=https://dashscope-intl.aliyuncs.com
//   node tts.mjs            只生成还没有的句子
//   node tts.mjs --force    全部重新生成；node tts.mjs hook goal   只生成指定场景
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { audioPath } from './timeline.mjs';

const keyFile = `${homedir()}/.config/dashscope/api_key`;
const KEY = process.env.DASHSCOPE_API_KEY || (existsSync(keyFile) ? readFileSync(keyFile, 'utf8').trim() : '');
if (!KEY) { console.error(`缺少 API Key：设置 DASHSCOPE_API_KEY 或写入 ${keyFile}`); process.exit(1); }
const BASE = (process.env.DASHSCOPE_BASE || 'https://dashscope.aliyuncs.com').replace(/\/$/, '');
const script = JSON.parse(readFileSync(new URL('./script.json', import.meta.url), 'utf8'));
const force = process.argv.includes('--force');
const only = process.argv.slice(2).filter((a) => !a.startsWith('--'));
mkdirSync(new URL('./audio/', import.meta.url).pathname, { recursive: true });

for (const [i, s] of script.scenes.entries()) {
  const out = audioPath(i, s);
  if (only.length && !only.includes(s.id)) continue;
  if (existsSync(out) && !force && !only.length) { console.log(`skip ${s.id}`); continue; }
  const res = await fetch(`${BASE}/api/v1/services/aigc/multimodal-generation/generation`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: s.model || script.model, input: { text: s.text, voice: s.voice || script.voice, language_type: 'Chinese' } }),
  });
  const json = await res.json().catch(() => ({}));
  const url = json?.output?.audio?.url;
  if (!res.ok || !url) { console.error(`✗ ${s.id}: HTTP ${res.status} ${json.code || ''} ${json.message || ''}`); process.exit(1); }
  const wav = Buffer.from(await (await fetch(url)).arrayBuffer());
  writeFileSync(out, wav);
  console.log(`✓ ${s.id} (${(wav.length / 1024).toFixed(0)} KB)`);
}
