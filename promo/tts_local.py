"""本地配音：Qwen3-TTS 1.7B CustomVoice（MLX，Apple 芯片本地运行，不需要 API Key）

    .venv/bin/python tts_local.py                      # 生成还没有的句子 → audio/NN-<id>.wav
    .venv/bin/python tts_local.py --force              # 全部重新生成
    .venv/bin/python tts_local.py hook goal            # 只生成指定场景
    .venv/bin/python tts_local.py --audition           # 用开场白试听几个音色 → out/audition/

script.json 里可以设置 local.speaker / local.instruct（整体风格），每个场景也可以单独写 instruct。
"""
import json
import sys
from pathlib import Path

import numpy as np
import soundfile as sf
from mlx_audio.tts.utils import load_model

HERE = Path(__file__).parent
MODEL = "mlx-community/Qwen3-TTS-12Hz-1.7B-CustomVoice-bf16"
script = json.loads((HERE / "script.json").read_text())
local = script.get("local", {})
SPEAKER = local.get("speaker", "vivian")
INSTRUCT = local.get("instruct", "用活泼可爱、充满元气的语气说，语速稍快")


def synth(model, text, speaker, instruct, seed=7):
    import mlx.core as mx
    mx.random.seed(seed)  # 固定随机种子，重新生成时声音一致
    parts = list(model.generate_custom_voice(text=text, speaker=speaker, language="chinese", instruct=instruct))
    audio = np.concatenate([np.array(r.audio, dtype=np.float32) for r in parts])
    return audio, parts[0].sample_rate


def main():
    args = sys.argv[1:]
    model = load_model(MODEL)
    print("speakers:", ", ".join(model.get_supported_speakers()))

    if "--audition" in args:
        out = HERE / "out" / "audition"
        out.mkdir(parents=True, exist_ok=True)
        text = script["scenes"][0]["text"]
        for spk in ["vivian", "serena"]:
            for k, ins in enumerate([INSTRUCT, "用温柔亲切、带点俏皮的语气说"]):
                audio, sr = synth(model, text, spk, ins)
                f = out / f"{spk}-{k + 1}.wav"
                sf.write(f, audio, sr)
                print(f"✓ {f.name} {len(audio) / sr:.1f}s  [{ins}]")
        return

    force = "--force" in args
    only = [a for a in args if not a.startswith("--")]
    (HERE / "audio").mkdir(exist_ok=True)
    for i, s in enumerate(script["scenes"]):
        f = HERE / "audio" / f"{i + 1:02d}-{s['id']}.wav"
        if only and s["id"] not in only:
            continue
        if f.exists() and not force and not only:
            print(f"skip {s['id']}")
            continue
        audio, sr = synth(model, s["text"], s.get("speaker", SPEAKER), s.get("instruct", INSTRUCT), s.get("seed", 7))
        sf.write(f, audio, sr)
        print(f"✓ {s['id']} {len(audio) / sr:.1f}s")


if __name__ == "__main__":
    main()
