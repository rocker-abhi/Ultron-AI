---
license: apache-2.0
language:
- en
library_name: kokoro
pipeline_tag: text-to-speech
base_model: hexgrad/Kokoro-82M
tags:
- text-to-speech
- tts
- kokoro
- styletts2
- expressive
- emotional-tts
- british-english
---

# Voxi-TTS — Expressive Kokoro (British English, 8 emotions)

An expressive fine-tune of [**Kokoro-82M**](https://huggingface.co/hexgrad/Kokoro-82M) that speaks British English in **8 selectable emotional styles**, each exposed as its own voicepack.

| Emotion voicepacks |
|---|
| `bf_neutral` · `bf_happy` · `bf_sad` · `bf_angry` · `bf_excited` · `bf_disgust` · `bf_sarcastic` · `bf_surprised` |

(`bf_` = British female, matching the source speaker.)

## How it was trained

- **Base:** Kokoro-82M (StyleTTS2 + ISTFTNet decoder, 82M params)
- **Recipe:** two-stage StyleTTS2 fine-tune via [`semidark/kikiri-tts`](https://github.com/semidark/kikiri-tts) (patched StyleTTS2)
- **Data:** [EMNS — Emotive Narrative Storytelling Corpus](https://www.openslr.org/136/) (OpenSLR 136, Apache-2.0), single British-English speaker, ~1.9h, 8 balanced emotions
- **Approach:** each emotion treated as a distinct speaker (`multispeaker`), so the style space separates per emotion; one voicepack extracted per emotion
- **Hardware:** NVIDIA A100-40GB, fp32, batch 4. Stage 1: 12 epochs (Mel 0.47→0.35). Stage 2: 24 epochs, adversarial SLM from epoch 3 (F0 10.0→3.6, Dur 1.5→0.83).

## Files

| Path | What |
|---|---|
| `kokoro_voxi_v1.pth` | Converted Kokoro-format **inference** weights (use this) |
| `voices/bf_*.pt` | The 8 emotion voicepacks |
| `config.json` | Kokoro model config |
| `speaker_map.json` | emotion ↔ training speaker-id map |
| `checkpoints/epoch_2nd_00022.pth` | Full Stage-2 training checkpoint (to resume) |
| `checkpoints/first_stage.pth` | Stage-1 checkpoint (also used as style-encoder source for voicepack extraction) |

## Usage

```python
import torch, numpy as np, soundfile as sf
from huggingface_hub import hf_hub_download
from kokoro import KModel, KPipeline

repo = "Joshuant/voxi-tts"
model_path = hf_hub_download(repo, "kokoro_voxi_v1.pth")
config_path = hf_hub_download(repo, "config.json")
voice_path = hf_hub_download(repo, "voices/bf_angry.pt")   # pick an emotion

km = KModel(repo_id="hexgrad/Kokoro-82M", config=config_path, model=model_path).eval()
pipe = KPipeline(lang_code="b", repo_id="hexgrad/Kokoro-82M", model=km)  # b = British English
voice = torch.load(voice_path, map_location="cpu", weights_only=True)

audio = np.concatenate([a for _, _, a in pipe("I can't believe you actually did that.", voice=voice)])
sf.write("out.wav", audio, 24000)
```

Switch emotion by loading a different `voices/bf_<emotion>.pt`.

## Expressive multi-emotion synthesis — inline `[emotion]` tags

The model has no SSML/tag parsing on its own (emotion = which voicepack you load). The included **`voxi_speak.py`** wrapper adds inline `[emotion]` tags by switching voicepacks per span and stitching the audio:

```python
from voxi_speak import VoxiSpeaker
voxi  = VoxiSpeaker()                 # auto-downloads this repo from the Hub
audio = voxi.speak("[happy] I'm so glad you came! [sad] But now you must go. [angry] And you didn't even tell me!")
voxi.save("out.wav", audio)
```

```bash
python voxi_speak.py "[angry] Get out! [neutral] ...please." -o out.wav
python voxi_speak.py --list           # emotions + aliases
```

- Tags are **case-insensitive** and support aliases: `[joy]`→happy, `[anger]`→angry, `[surprise]`→surprised, `[disgusted]`→disgust, `[sarcasm]`→sarcastic, etc.
- Text before the first tag uses `default` (neutral). Unknown tags are ignored with a warning (the current emotion continues).
- A small configurable silence (`gap_ms`) is inserted between emotion spans.

Available emotions: `neutral · happy · sad · angry · excited · disgust · sarcastic · surprised`.

## Notes & limitations

- Trained on ~1.9h from a **single speaker** — it's one expressive British voice, not multi-speaker.
- Emotion intensity varies; lower-resource emotions (e.g. `sarcastic`, `disgust`) may be subtler.
- Inference needs `misaki` with `phonemizer-fork` + `espeakng_loader`, and `lang_code="b"`.

## Credits & licenses

- Base model: [Kokoro-82M](https://huggingface.co/hexgrad/Kokoro-82M) (Apache-2.0)
- Training recipe: [kikiri-tts](https://github.com/semidark/kikiri-tts)
- Dataset: EMNS (OpenSLR 136, Apache-2.0) — Kari Noriy, Xiaosong Yang, Jian Zhang (2023)

Released under **Apache-2.0**.
