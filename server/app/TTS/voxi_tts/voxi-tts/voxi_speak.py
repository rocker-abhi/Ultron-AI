#!/usr/bin/env python3
"""
voxi_speak.py — inline [emotion] tags for the Voxi-TTS expressive Kokoro model.

The model itself has no SSML / tag parsing: emotion is chosen by *which voicepack*
you load. This wrapper lets you write tagged text and renders each span with the
matching voicepack, then stitches the audio together.

    from voxi_speak import VoxiSpeaker
    voxi  = VoxiSpeaker()                         # downloads from Joshuant/voxi-tts
    audio = voxi.speak("[happy] I'm so glad you came! [sad] But now you must go.")
    voxi.save("out.wav", audio)

Tags are case-insensitive, support aliases ([anger]→angry, [joy]→happy, ...), and
text before the first tag uses `default` (neutral). Unknown tags are ignored with a
warning and the current emotion continues.

CLI:
    python voxi_speak.py "[angry] Get out! [neutral] ...please." -o out.wav
    python voxi_speak.py --list                  # show available emotions
"""
from __future__ import annotations
import os, re, sys, argparse, warnings
import numpy as np
import torch

# Monkeypatch torch.load to bypass weights_only=True restriction and map weight_norm parametrizations under PyTorch 2.6+
original_load = torch.load
def patched_load(*args, **kwargs):
    kwargs['weights_only'] = False
    result = original_load(*args, **kwargs)
    if isinstance(result, dict):
        new_result = {}
        for key, value in result.items():
            if isinstance(value, dict):
                cleaned_val = {}
                for k, v in value.items():
                    if "parametrizations.weight.original0" in k:
                        new_k = k.replace("parametrizations.weight.original0", "weight_g")
                    elif "parametrizations.weight.original1" in k:
                        new_k = k.replace("parametrizations.weight.original1", "weight_v")
                    else:
                        new_k = k
                    cleaned_val[new_k] = v
                new_result[key] = cleaned_val
            else:
                new_result[key] = value
        return new_result
    return result
torch.load = patched_load

EMOTIONS = ["neutral", "happy", "sad", "angry",
            "excited", "disgust", "sarcastic", "surprised"]

ALIASES = {
    "anger": "angry", "mad": "angry", "furious": "angry",
    "normal": "neutral", "plain": "neutral", "default": "neutral", "calm": "neutral",
    "joy": "happy", "joyful": "happy", "glad": "happy", "cheerful": "happy",
    "sorrow": "sad", "unhappy": "sad", "down": "sad",
    "excite": "excited", "enthusiastic": "excited", "thrilled": "excited",
    "disgusted": "disgust", "revolted": "disgust",
    "sarcasm": "sarcastic", "sardonic": "sarcastic", "wry": "sarcastic",
    "surprise": "surprised", "shocked": "surprised", "astonished": "surprised",
}

TAG_RE = re.compile(r"\[\s*([A-Za-z]+)\s*\]")
SR = 24000


def normalize_emotion(tag: str) -> str | None:
    t = tag.strip().lower()
    t = ALIASES.get(t, t)
    return t if t in EMOTIONS else None


class VoxiSpeaker:
    def __init__(self, repo: str = "Joshuant/voxi-tts",
                 base: str = "hexgrad/Kokoro-82M",
                 lang_code: str = "b",          # b = British English
                 device: str | None = None,
                 local_dir: str | None = None,
                 voice_prefix: str = "bf_"):
        import torch
        from kokoro import KModel, KPipeline
        self.torch = torch
        self.repo = repo
        self.local_dir = local_dir
        self.voice_prefix = voice_prefix
        self.device = device or ("cuda" if torch.cuda.is_available() else "cpu")

        cfg = self._path("config.json")
        model = self._path("kokoro_voxi_v1.pth")
        self.km = KModel(config=cfg, model=model).to(self.device).eval()
        self.pipe = KPipeline(lang_code=lang_code, model=self.km)
        self._voice_cache: dict[str, object] = {}

    # ---- asset resolution (local dir or HF hub) ----
    def _path(self, rel: str) -> str:
        if self.local_dir:
            return os.path.join(self.local_dir, rel)
        from huggingface_hub import hf_hub_download
        return hf_hub_download(self.repo, rel)

    def _voice(self, emotion: str):
        if emotion not in self._voice_cache:
            path = self._path(f"voices/{self.voice_prefix}{emotion}.pt")
            self._voice_cache[emotion] = self.torch.load(
                path, map_location="cpu", weights_only=True)
        return self._voice_cache[emotion]

    # ---- text -> [(emotion, span)] ----
    def parse(self, text: str, default: str = "neutral") -> list[tuple[str, str]]:
        if normalize_emotion(default) is None:
            raise ValueError(f"default emotion {default!r} is not valid")
        default = normalize_emotion(default)

        segments: list[tuple[str, str]] = []
        current = default
        last = 0
        for m in TAG_RE.finditer(text):
            span = text[last:m.start()].strip()
            if span:
                segments.append((current, span))
            emo = normalize_emotion(m.group(1))
            if emo is None:
                warnings.warn(f"unknown emotion tag [{m.group(1)}] ignored; "
                              f"keeping '{current}'")
            else:
                current = emo
            last = m.end()
        tail = text[last:].strip()
        if tail:
            segments.append((current, tail))
        if not segments:                       # text was only tags / empty
            segments = [(current, text.strip())] if text.strip() else []
        return segments

    # ---- render ----
    def _to_np(self, a):
        if hasattr(a, "detach"):
            a = a.detach().cpu().numpy()
        return np.asarray(a, dtype=np.float32)

    def speak(self, text: str, default: str = "neutral",
              speed: float = 1.0, gap_ms: int = 120) -> np.ndarray:
        """Render tagged text to a single waveform (float32, 24 kHz)."""
        segments = self.parse(text, default=default)
        if not segments:
            return np.zeros(1, dtype=np.float32)
        gap = np.zeros(int(SR * gap_ms / 1000), dtype=np.float32)
        out: list[np.ndarray] = []
        for i, (emo, span) in enumerate(segments):
            voice = self._voice(emo)
            chunks = [self._to_np(a) for _, _, a in self.pipe(span, voice=voice, speed=speed)]
            if chunks:
                out.append(np.concatenate(chunks))
                if i < len(segments) - 1:
                    out.append(gap)
        return np.concatenate(out) if out else np.zeros(1, dtype=np.float32)

    def save(self, path: str, audio: np.ndarray, sr: int = SR):
        import soundfile as sf
        sf.write(path, audio, sr)


def _cli():
    ap = argparse.ArgumentParser(description="Voxi-TTS expressive synthesis with [emotion] tags")
    ap.add_argument("text", nargs="?", help="text, may contain [emotion] tags")
    ap.add_argument("-o", "--out", default="voxi_out.wav")
    ap.add_argument("--default", default="neutral", help="emotion for untagged text")
    ap.add_argument("--speed", type=float, default=1.0)
    ap.add_argument("--gap-ms", type=int, default=120, help="silence between emotion spans")
    ap.add_argument("--local-dir", default=None, help="use local model dir instead of HF")
    ap.add_argument("--repo", default="Joshuant/voxi-tts")
    ap.add_argument("--list", action="store_true", help="list emotions and exit")
    args = ap.parse_args()

    if args.list:
        print("emotions:", ", ".join(EMOTIONS))
        print("aliases :", ", ".join(f"{k}->{v}" for k, v in ALIASES.items()))
        return
    if not args.text:
        ap.error("provide text, or use --list")

    voxi = VoxiSpeaker(repo=args.repo, local_dir=args.local_dir)
    segs = voxi.parse(args.text, default=args.default)
    print("plan:", " | ".join(f"[{e}] {s[:30]}" for e, s in segs))
    audio = voxi.speak(args.text, default=args.default, speed=args.speed, gap_ms=args.gap_ms)
    voxi.save(args.out, audio)
    print(f"wrote {args.out}  ({len(audio)/SR:.2f}s)")


if __name__ == "__main__":
    _cli()
