import sys
from pathlib import Path

# Add server root to sys.path to support direct execution as a script
server_root = Path(__file__).resolve().parent.parent.parent
if str(server_root) not in sys.path:
    sys.path.insert(0, str(server_root))

from app.TTS.tts_base import TTS_BASE
from app.TTS.kokoro_tts.kokoro_plugin import convert_to_sample, samples_to_wav


class KokoroClient(TTS_BASE):

    def convert_to_audio_bytes(self, text: str):
        samples, sample_rate = convert_to_sample(text)
        return samples_to_wav(samples, sample_rate)


if __name__ == "__main__":
    kl = KokoroClient()
    audio_data = kl.convert_to_audio_bytes("hello world how are you buddy ?")
    print(f"Generated {len(audio_data)} bytes of WAV audio data.")