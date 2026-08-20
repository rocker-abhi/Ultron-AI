# Tauri + React

This template should help get you started developing with Tauri and React in Vite.

## Recommended IDE Setup

- [VS Code](https://code.visualstudio.com/) + [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode) + [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)
# Ultron-AI

## Text-to-Speech (TTS) Setup

Due to their large file size, the base Kokoro-82M ONNX model files are excluded from the repository. You must download and paste them manually into the correct directory to run the TTS plugins.

### 1. Download Required Binaries
* **Model Weights**: Download [kokoro-v1.0.onnx](https://github.com/remsky/kokoro-onnx/releases/download/v1.0.0/kokoro-v1.0.onnx) (~311 MB)
* **Voices Embeddings**: Download [voices-v1.0.bin](https://github.com/remsky/kokoro-onnx/releases/download/v1.0.0/voices-v1.0.bin) (~27 MB)

### 2. Paste Location
Create the directory and paste both files here:
```bash
server/app/TTS/kokoro_tts/files/
```

The final directory structure must be:
```
server/app/TTS/kokoro_tts/files/
├── kokoro-v1.0.onnx
└── voices-v1.0.bin
```
