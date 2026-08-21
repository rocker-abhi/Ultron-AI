import React, { useState, useCallback, useEffect } from "react";
import { useWebSocket } from "../hooks/useWebSocket";
import { useAudio } from "../hooks/useAudio";
import { useVAD } from "../hooks/useVAD";
import { utils } from "@ricky0123/vad-react";
import Orb from "../components/Voice/Orb";
import AudioVisualizer from "../components/Voice/AudioVisualizer";
import ChatWindow from "../components/Chat/ChatWindow";
import OfflineBanner from "../components/common/OfflineBanner";
import { WS_URL, chatboxConfig } from "../constants/chatConfig";

/**
 * Main application orchestrator page.
 * Sets up hooks, aggregates state, and constructs split visualizer panels.
 */
function ChatPage() {
  const [messages, setMessages] = useState([]);
  const [isWaitingForText, setIsWaitingForText] = useState(false);
  const { queueAudioSegment, unlockAudioContext, stopAudio, isAudioActive, analyser } = useAudio();

  // Process message stream frames. useCallback prevents resetting WebSocket loops.
  const handleMessageReceived = useCallback((msg) => {
    if (msg.audio) {
      // Decode base64 to byte buffer
      const binaryString = atob(msg.audio);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      queueAudioSegment(msg.audio, bytes.buffer);
    } else {
      setMessages((prev) => [...prev, msg]);
      // The final accumulated text message from the AI will have sender: "ai"
      if (msg.sender === "ai") {
        setIsWaitingForText(false);
      }
    }
  }, [queueAudioSegment]);

  const { isOnline, sendMessage } = useWebSocket(WS_URL, handleMessageReceived);

  const handleStopProcessing = useCallback(() => {
    // 1. Stop local audio player & clear queue
    stopAudio();
    
    // 2. Send interrupt signal to backend
    sendMessage({ event: "interrupt" });
    
    // 3. Reset processing state
    setIsWaitingForText(false);
  }, [stopAudio, sendMessage]);

  const handleSpeechStart = useCallback(() => {
    console.log("VAD: Speech start detected. Auto-interrupting current processing...");
    stopAudio();
    sendMessage({ event: "interrupt" });
    setIsWaitingForText(false);
  }, [stopAudio, sendMessage]);

  const handleSpeechEnd = useCallback((audio) => {
    // Encode Float32Array speech to standard 16-bit PCM WAV (format = 1, sampleRate = 16000)
    const wavBuffer = utils.encodeWAV(audio, 1, 16000, 1, 16);
    const base64Audio = utils.arrayBufferToBase64(wavBuffer);
    
    sendMessage({
      event: "audio",
      audio: base64Audio
    });
    
    setIsWaitingForText(true);
    unlockAudioContext();
  }, [sendMessage, unlockAudioContext]);

  const { probabilityRef, pause, start } = useVAD(handleSpeechEnd, handleSpeechStart);

  // Clear waiting state if we disconnect to prevent the indicator from being stuck
  useEffect(() => {
    if (!isOnline) {
      setIsWaitingForText(false);
    }
  }, [isOnline]);

  // Control VAD activity dynamically depending on connection online state
  useEffect(() => {
    if (isOnline) {
      if (start) {
        start();
        console.log("VAD: Connection established. Speech detection active.");
      }
    } else {
      if (pause) {
        pause();
        console.log("VAD: Connection offline. Speech detection suspended.");
      }
      if (probabilityRef) {
        probabilityRef.current = 0; // Keep the VAD telemetry graph flat at 0%
      }
    }
  }, [isOnline, start, pause, probabilityRef]);

  const handleSendMessage = (text) => {
    if (!text.trim() || !isOnline) return;

    // Explicit gesture-triggered AudioContext resume/initialization
    unlockAudioContext();
    setIsWaitingForText(true);

    const messageData = {
      id: `user-${Date.now()}`,
      sender: "user",
      text: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    sendMessage(messageData);
  };

  // Determine if the client is currently processing a backend request (either text or active audio playback)
  const isProcessing = isWaitingForText || isAudioActive;

  return (
    <>
      {/* Background Soft Glow */}
      <div className={`glow-effect ${isOnline ? "online" : "offline"}`}></div>

      {/* Network Status banner */}
      <OfflineBanner isOnline={isOnline} />

      {/* Main Split Interface Panels */}
      <div className="main-layout">
        
        {/* Left Side: Center Orb & Left-Aligned Telemetry Graphs */}
        <section className="left-panel">
          {/* Centered AI core */}
          <div className="agent-stage">
            <Orb isOnline={isOnline} isProcessing={isProcessing} />
          </div>

          {/* Far-left telemetry sidebar graphs */}
          <div className="telemetry-sidebar">
            <AudioVisualizer
              probabilityRef={probabilityRef}
              isAudioActive={true}
              isProcessing={isProcessing}
              type="input"
            />
            <AudioVisualizer
              analyser={analyser}
              isAudioActive={isAudioActive}
              isProcessing={isProcessing}
              type="output"
            />
          </div>
        </section>

        {/* Right Side: Chatbox Log */}
        <section className="right-panel" style={{ width: chatboxConfig.width }}>
          <ChatWindow
            isOnline={isOnline}
            messages={messages}
            onSendMessage={handleSendMessage}
            isProcessing={isProcessing}
            onStopProcessing={handleStopProcessing}
          />
        </section>

      </div>
    </>
  );
}

export default ChatPage;
