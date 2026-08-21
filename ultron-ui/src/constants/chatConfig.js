// Global configuration for the AI Agent Orb Animation
export const orbConfig = {
  // Zoom / Scale factor of the AI orb animation (1.0 is default size)
  scale: 0.75,

  // Position adjustments relative to its centered layout container
  offsetX: "0px",
  offsetY: "0px",
};

// Global configuration for the Chatbox UI
export const chatboxConfig = {
  // Dynamic width of the chatbox panel
  width: "20%",
};

// Network / Retry configuration constants
const getWsUrl = () => {
  const hostname = window.location.hostname;
  if (!hostname || hostname.includes("tauri")) {
    return "ws://localhost:8000/ws";
  }
  return `ws://${hostname}:8000/ws`;
};

export const WS_URL = getWsUrl();
export const RECONNECT_DELAY_MS = 3000;

// Silero VAD Configuration constants
export const vadConfig = {
  positiveSpeechThreshold: 0.7,
  negativeSpeechThreshold: 0.2,
  redemptionMs: 1000,
  preSpeechPadMs: 100,
  minSpeechMs: 250,
  submitUserSpeechOnPause: false
};
