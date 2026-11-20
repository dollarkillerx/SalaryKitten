"""用本地 Whisper 听写每句配音，和台词对比（检查有没有漏字、多字）。"""
import difflib, json, re
from pathlib import Path
import mlx_whisper

HERE = Path(__file__).parent
script = json.loads((HERE / "script.json").read_text())
norm = lambda s: re.sub(r"[\s，。！？：、,.!?:;；“”\"'()（）-]", "", s).lower()
for i, s in enumerate(script["scenes"]):
    f = HERE / "audio" / f"{i + 1:02d}-{s['id']}.wav"
    heard = mlx_whisper.transcribe(str(f), path_or_hf_repo="mlx-community/whisper-large-v3-turbo", language="zh", initial_prompt="以下是普通话的句子。")["text"].strip()
    ratio = difflib.SequenceMatcher(None, norm(s["text"]), norm(heard)).ratio()
    print(f"{'✓' if ratio > 0.85 else '⚠'} {s['id']:<11} {ratio:.2f}  {heard}")
