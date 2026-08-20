import { invoke } from "@tauri-apps/api/core";

/**
 * Invokes the native Tauri blocking audio playback command.
 * 
 * @param {string} audioBase64 - Base64 encoded WAV string
 * @returns {Promise<void>} Resolves when audio finishes playing
 */
export const playAudioTauri = async (audioBase64) => {
  if (window.__TAURI_INTERNALS__) {
    return await invoke("play_audio", { audioBase64 });
  }
  throw new Error("Tauri context not available (running in browser)");
};
