import React, { useState, useCallback, useEffect } from "react";
import { useWebSocket } from "../hooks/useWebSocket";
import { useAudio } from "../hooks/useAudio";
import { useVAD } from "../hooks/useVAD";
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
  const { queueAudioSegment, unlockAudioContext, isAudioActive, analyser } = useAudio();
  const { probabilityRef } = useVAD();

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

  // Clear waiting state if we disconnect to prevent the indicator from being stuck
  useEffect(() => {
    if (!isOnline) {
      setIsWaitingForText(false);
    }
  }, [isOnline]);

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
          />
        </section>

      </div>
    </>
  );
}

export default ChatPage;
