import sounddevice as sd
from kokoro_onnx import Kokoro
import os
from pathlib import Path

import io
import wave
import numpy as np

# Resolve absolute paths to model files relative to the script location
CURRENT_DIR = Path(__file__).resolve().parent
ONNX_PATH = CURRENT_DIR / "files" / "kokoro-v1.0.onnx"
VOICES_PATH = CURRENT_DIR / "files" / "voices-v1.0.bin"

# Available voice models in Kokoro-82M:
# American Female: af_heart, af_alloy, af_aoede, af_bella, af_jessica, af_kore, af_nicole, af_nova, af_river, af_sarah
# American Male:   am_adam, am_echo, am_eric, am_fenrir, am_liam, am_michael, am_onyx, am_puck, am_santa
# British Female:  bf_alice, bf_emma, bf_isabella, bf_lily
# British Male:    bm_george, bm_lewis, bm_daniel, bm_fable
# Japanese Female: jf_alpha, jf_glowing, jf_nene, jf_writer
# Japanese Male:   jm_kudo
# Chinese Female:  zf_xiaotian, zf_xiaoyi, zf_xiaoxian, zf_xiaorong
# Chinese Male:    zm_yunjian, zm_yunxi, zm_yunxia, zm_yunyang
# Spanish Female:  ef_dora
# Spanish Male:    em_alex, em_santa
# Italian Female:  if_sara
# Italian Male:    im_nicola
# French Female:   ff_siwis
# Hindi Female:    hf_alpha, hf_beta
# Hindi Male:      hm_omega, hm_psi
# Portuguese Female: pf_dora
# Portuguese Male:   pm_alex, pm_santa

# Global speed parameter to control speech pace
VOICE = "af_heart"
SPEED = 1.0

kokoro = Kokoro(
    str(ONNX_PATH),
    str(VOICES_PATH)
)

def convert_to_sample(text: str):
    samples, sample_rate = kokoro.create(
        text,
        voice=VOICE,
        speed=SPEED,
        lang="en-us"
    )
    return samples, sample_rate

def play(samples, sample_rate):
    sd.play(samples, sample_rate)
    sd.wait()


def samples_to_wav(samples, sample_rate):
    buffer = io.BytesIO()

    samples = np.asarray(samples)

    # Convert float32 [-1, 1] → int16
    samples_int16 = (samples * 32767).astype(np.int16)

    with wave.open(buffer, "wb") as wav:
        wav.setnchannels(1)
        wav.setsampwidth(2)  # int16 = 2 bytes
        wav.setframerate(sample_rate)
        wav.writeframes(samples_int16.tobytes())

    buffer.seek(0)

    return buffer.read()

if __name__ == "__main__":
    text = """
            [happy] Wow! I'm so excited to see you today!
            [excited] YES! We finally did it! This is absolutely amazing!
            [sad] Oh... I really thought everything was going to work out.
            [angry] What?! You did that without telling me? I can't believe you!
            [scared] Wait... what was that sound? Is someone there?
            [surprised] WHAT?! You're serious? I never expected that!
            [confused] Hmm... wait a second. I don't understand what's happening.
            [calm] Don't worry. Take a deep breath. Everything is going to be okay.
            [laughing] Haha! Oh my god, that's actually hilarious
            [whispering] Come closer... I need to tell you something.
            [excited] Come on! Let's go! We've got this!
            [sad] Goodbye... I'll really miss you.
        """
    samples, sample_rate = convert_to_sample(text)
    # print(samples_to_wav(samples, sample_rate))
    play(samples, sample_rate)
    