import sys
from pathlib import Path

# Add server root to sys.path to support direct execution as a script
server_root = Path(__file__).resolve().parent.parent.parent
if str(server_root) not in sys.path:
    sys.path.insert(0, str(server_root))

from app.TTS.tts_base import TTS_BASE
from app.TTS.voxi_tts.voxi_plugin import convert_to_sample, samples_to_wav


class VoxiClient(TTS_BASE):

    def convert_to_audio_bytes(self, text: str):
        sample, sample_rate = convert_to_sample(text)
        return samples_to_wav(sample, sample_rate)


if __name__ == "__main__":
    vl = VoxiClient()
    audio_data = vl.convert_to_audio_bytes("[happy] hello world how are you buddy ?")
    print(f"Generated {len(audio_data)} bytes of WAV audio data.")