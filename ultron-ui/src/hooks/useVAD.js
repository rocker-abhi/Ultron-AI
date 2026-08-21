import { useEffect, useRef, useState } from "react";
import { useMicVAD } from "@ricky0123/vad-react";
import * as ort from "onnxruntime-web";
import { vadConfig } from "../constants/chatConfig";

// Configure WebAssembly binary paths globally to load locally from the public directory
// using window.location.origin to bypass Vite's strict local /public directory import blocking.
ort.env.wasm.wasmPaths = window.location.origin + "/";

/**
 * Custom React hook wrapping @ricky0123/vad-react (Silero VAD) to track real-time speech probability
 * and listener states with zero-render-overhead refs.
 * 
 * @returns {Object} VAD controllers, status flags, and the probability ref
 */
export const useVAD = (onSpeechEndCallback, onSpeechStartCallback) => {
  const probabilityRef = useRef(0);
  const [isListening, setIsListening] = useState(false);

  const vad = useMicVAD({
    startOnLoad: true,
    positiveSpeechThreshold: vadConfig.positiveSpeechThreshold,
    negativeSpeechThreshold: vadConfig.negativeSpeechThreshold,
    redemptionMs: vadConfig.redemptionMs,
    preSpeechPadMs: vadConfig.preSpeechPadMs,
    minSpeechMs: vadConfig.minSpeechMs,
    submitUserSpeechOnPause: vadConfig.submitUserSpeechOnPause,
    onnxWASMBasePath: window.location.origin + "/",
    baseAssetPath: window.location.origin + "/",
    onFrameProcessed: (probs) => {
      // Safe type extraction: handle raw float number or structured probability object
      const p = typeof probs === "number" ? probs : (probs?.isSpeech || 0);
      probabilityRef.current = p;
    },
    onSpeechStart: () => {
      console.log("Silero VAD: Speech started");
      if (onSpeechStartCallback) {
        onSpeechStartCallback();
      }
    },
    onSpeechEnd: (audio) => {
      console.log("Silero VAD: Speech ended");
      if (onSpeechEndCallback) {
        onSpeechEndCallback(audio);
      }
    }
  });

  useEffect(() => {
    setIsListening(vad.listening);
  }, [vad.listening]);

  return {
    probabilityRef,
    loading: vad.loading,
    errored: vad.errored,
    listening: isListening,
    userSpeaking: vad.userSpeaking,
    pause: vad.pause,
    start: vad.start
  };
};
