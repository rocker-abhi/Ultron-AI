import os
import sys
import ctypes
import site

script_dir = os.path.dirname(os.path.abspath(__file__))
# Add parent directory containing the 'app' module to sys.path to enable absolute imports when run directly
sys.path.insert(0, os.path.abspath(os.path.join(script_dir, "..", "..")))

def preload_cuda_libraries():
    proj_root = os.path.abspath(os.path.join(script_dir, "..", ".."))
    
    # Locate site-packages candidates
    candidate_paths = [
        os.path.join(proj_root, ".venv", "lib", "python3.14", "site-packages", "nvidia", "cu13", "lib")
    ]
    try:
        for sp in site.getsitepackages():
            candidate_paths.append(os.path.join(sp, "nvidia", "cu13", "lib"))
    except Exception:
        pass
        
    nvidia_lib_dir = None
    for path in candidate_paths:
        if os.path.isdir(path):
            nvidia_lib_dir = path
            break
            
    if nvidia_lib_dir:
        # Preload essential libraries in topological dependency order
        libs_to_load = [
            "libcudart.so.12",
            "libcublasLt.so.12",
            "libcublas.so.12",
            "libcufft.so.12",
            "libcusolver.so.12",
            "libcusparse.so.12"
        ]
        for lib in libs_to_load:
            lib_path = os.path.join(nvidia_lib_dir, lib)
            if os.path.exists(lib_path):
                try:
                    ctypes.CDLL(lib_path, mode=ctypes.RTLD_GLOBAL)
                except Exception:
                    pass

preload_cuda_libraries()

from faster_whisper import WhisperModel
from app.SST.base_sst import BaseSST

class WisperBase(BaseSST):

    __instance = None

    def __new__(cls):
        if cls.__instance is None:
            cls.__instance = super().__new__(cls)
        return cls.__instance

    def __init__(self):
        self.__model_name = "base"
        self.__device = "cuda"
        self.__compute_type = "float16"
        self.__model = WhisperModel(
            self.__model_name,
            device=self.__device,
            compute_type=self.__compute_type
        )
    
    def transcribe(self, audio):
        segments, info = self.__model.transcribe(
            audio,
            language=None,
            vad_filter=True
        )
        return segments, info

if __name__ == "__main__":
    # execute code for  the testing purpose
    wisper = WisperBase()
    audio_path = os.path.join(script_dir, "voice-sample.wav")
    
    # Method 1: Loading raw file bytes into an in-memory BytesIO buffer (simulating dynamic web bytes stream)
    import io
    with open(audio_path, "rb") as f:
        audio_bytes = f.read()
    audio_buffer = io.BytesIO(audio_bytes)
    
    segments, info = wisper.transcribe(audio_buffer)
    print("Detected language:", info.language)
    print("Probability:", info.language_probability)

    for segment in segments:
        print(
            f"[{segment.start:.2f}s -> {segment.end:.2f}s] "
            f"{segment.text}"
        )

    # Method 2: If streaming raw PCM float32 arrays (e.g. from WebSockets/Mic),
    # faster-whisper natively accepts a 1D float32 numpy array normalized to [-1, 1] at 16kHz:
    #
    # import soundfile as sf
    # audio_samples, sample_rate = sf.read(audio_path)
    # # If stereo, average down to mono
    # if len(audio_samples.shape) > 1:
    #     audio_samples = audio_samples.mean(axis=1)
    # segments, info = wisper.transcribe(audio_samples)
