import sounddevice as sd
import numpy as np
import sys
from pathlib import Path

import io
import wave
import numpy as np

# Add voxi-tts directory to sys.path relative to the script location
CURRENT_DIR = Path(__file__).resolve().parent
VOXI_DIR = CURRENT_DIR / "voxi-tts"
if str(VOXI_DIR) not in sys.path:
    sys.path.append(str(VOXI_DIR))

from voxi_speak import VoxiSpeaker

# Initialize VoxiSpeaker at module level (cached Hugging Face download)
voxi = VoxiSpeaker()

# Global speed parameter to control speech pace
SPEED = 1.4

# Available voice models in Voxi-TTS:
# - neutral
# - happy
# - sad
# - angry
# - excited
# - disgust
# - sarcastic
# - surprised
# (You can also select these dynamically inside text using inline tags like [happy], [angry], etc.)


def convert_to_sample(text: str):
    """Generate emotion-tagged speech, normalize, and play it at native 24kHz."""
    # Generate speech audio (raw float32 array at 24000Hz)
    sample = voxi.speak(text, speed=SPEED)
    
    # # Peak normalization to prevent clipping and optimize volume
    # max_val = np.max(np.abs(audio))
    # if max_val > 0:
    #     audio = audio / max_val * 0.85
    # Play the audio array natively at 24000Hz
    return sample, 24000

def play(audio, sample_rate):
    sd.play(audio, sample_rate)
    sd.wait()

def samples_to_wav(samples, sample_rate=24000):
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
    text = """[happy] Wow! I'm so excited to see you today!

[excited] YES! We finally did it! This is absolutely amazing!

[sad] Oh... I really thought everything was going to work out.

[angry] What?! You did that without telling me? I can't believe you!

[scared] Wait... what was that sound? Is someone there?

[surprised] WHAT?! You're serious? I never expected that!

[confused] Hmm... wait a second. I don't understand what's happening.

[calm] Don't worry. Take a deep breath. Everything is going to be okay.

[laughing] Haha! Oh my god, that's actually hilarious!

[whispering] Come closer... I need to tell you something.

[excited] Come on! Let's go! We've got this!

[sad] Goodbye... I'll really miss you. """

    print("Running Voxi client test generation...")
    audio, sample_rate = convert_to_sample(text)
    # print(samples_to_wav(audio))
    play(audio,sample_rate)
    print("Voxi client generation and playback complete.")
