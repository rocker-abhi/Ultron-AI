import { useEffect, useRef, useState } from "react";
import { playWavBuffer } from "../utils/audio";
import { playAudioTauri } from "../services/audioService";

/**
 * Custom React hook to manage native and browser audio playback queuing,
 * along with AudioContext unlock gestures.
 * 
 * @returns {Object} Helper routines and state to track queue/playback status
 */
export const useAudio = () => {
  const audioCtxRef = useRef(null);
  const audioQueueRef = useRef([]);
  const isAudioPlayingRef = useRef(false);
  const [isAudioActive, setIsAudioActive] = useState(false);
  const analyserRef = useRef(null);

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

        // Initialize AnalyserNode on first click gesture so visualizer has data immediately
        if (!analyserRef.current) {
          const analyser = audioCtxRef.current.createAnalyser();
          analyser.fftSize = 64;
          analyser.connect(audioCtxRef.current.destination);
          analyserRef.current = analyser;
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
      setIsAudioActive(false);
      return;
    }

    isAudioPlayingRef.current = true;
    setIsAudioActive(true);
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
          // Initialize Analyser if not already done
          if (!analyserRef.current) {
            const analyser = ctx.createAnalyser();
            analyser.fftSize = 64;
            analyser.connect(ctx.destination);
            analyserRef.current = analyser;
          }

          playWavBuffer(nextItem.bytesBuffer, ctx, analyserRef.current, () => {
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
    setIsAudioActive(true);
    audioQueueRef.current.push({
      audio: audioBase64,
      bytesBuffer: bytesBuffer
    });
    processAudioQueue();
  };

  return {
    queueAudioSegment,
    unlockAudioContext,
    isAudioActive,
    analyser: analyserRef.current
  };
};
