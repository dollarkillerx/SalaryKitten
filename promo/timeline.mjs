// 时间线：每个场景时长 = 配音时长 + 间隔；还没生成配音时按字数估算
import { readFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

export const FPS = 30;
export const audioPath = (i, s) => new URL(`./audio/${String(i + 1).padStart(2, '0')}-${s.id}.wav`, import.meta.url).pathname;

export function buildTimeline() {
  const script = JSON.parse(readFileSync(new URL('./script.json', import.meta.url), 'utf8'));
  let t = 0.4; // 开头留一点空
  const scenes = script.scenes.map((s, i) => {
    const file = audioPath(i, s);
    const hasAudio = existsSync(file);
    const voice = hasAudio
      ? Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file]).toString())
      : s.text.length / 4.3;
    const tail = i === script.scenes.length - 1 ? 2.2 : script.gap;
    const scene = { ...s, start: t, voice, dur: voice + tail, audio: hasAudio ? file : null };
    t += scene.dur;
    return scene;
  });
  return { fps: FPS, scenes, total: t, estimated: scenes.some((s) => !s.audio) };
}
