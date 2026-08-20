import { useEffect, useRef } from "react";
import { playWavBuffer } from "../utils/audio";
import { playAudioTauri } from "../services/audioService";

/**
 * Custom React hook to manage native and browser audio playback queuing,
 * along with AudioContext unlock gestures.
 * 
 * @returns {Object} Helper routines to enqueue audio chunks
 */
export const useAudio = () => {
  const audioCtxRef = useRef(null);
  const audioQueueRef = useRef([]);
  const isAudioPlayingRef = useRef(false);

  const unlockAudioContext = () => {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      try {
        if (!audioCtxRef.current) {
          audioCtxRef.current = new AudioContextClass();
        }
        if (audioCtxRef.current.state === "suspended") {
          audioCtxRef.current.resume();
        }
      } catch (err) {
        console.warn("Failed to initialize or resume AudioContext:", err);
      }
    }
  };

  useEffect(() => {
    // Setup window-level raw event listener to bypass Webview autoplay policy constraints
    window.addEventListener("click", unlockAudioContext);
    window.addEventListener("keydown", unlockAudioContext);

    return () => {
      window.removeEventListener("click", unlockAudioContext);
      window.removeEventListener("keydown", unlockAudioContext);
    };
  }, []);

  const processAudioQueue = async () => {
    if (isAudioPlayingRef.current) return;
    if (audioQueueRef.current.length === 0) {
      isAudioPlayingRef.current = false;
      return;
    }

    isAudioPlayingRef.current = true;
    const nextItem = audioQueueRef.current.shift();

    try {
      if (window.__TAURI_INTERNALS__) {
        // Native Tauri path (calls blocking Rust play_audio command)
        await playAudioTauri(nextItem.audio);
        isAudioPlayingRef.current = false;
        processAudioQueue();
      } else {
        // Browser Web Audio path (uses custom linear PCM resampler)
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (!audioCtxRef.current && AudioContextClass) {
          audioCtxRef.current = new AudioContextClass();
        }
        const ctx = audioCtxRef.current;
        if (ctx) {
          playWavBuffer(nextItem.bytesBuffer, ctx, () => {
            isAudioPlayingRef.current = false;
            processAudioQueue();
          });
        } else {
          isAudioPlayingRef.current = false;
          processAudioQueue();
        }
      }
    } catch (err) {
      console.error("Audio playback queue error:", err);
      isAudioPlayingRef.current = false;
      processAudioQueue();
    }
  };

  const queueAudioSegment = (audioBase64, bytesBuffer) => {
    audioQueueRef.current.push({
      audio: audioBase64,
      bytesBuffer: bytesBuffer
    });
    processAudioQueue();
  };

  return { queueAudioSegment, unlockAudioContext };
};
