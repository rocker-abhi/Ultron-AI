import React, { useState, useCallback } from "react";
import { useWebSocket } from "../hooks/useWebSocket";
import { useAudio } from "../hooks/useAudio";
import Orb from "../components/Voice/Orb";
import ChatWindow from "../components/Chat/ChatWindow";
import OfflineBanner from "../components/common/OfflineBanner";
import { WS_URL, chatboxConfig } from "../constants/chatConfig";

/**
 * Main application orchestrator page.
 * Sets up hooks, aggregates state, and constructs split visualizer panels.
 */
function ChatPage() {
  const [messages, setMessages] = useState([]);
  const { queueAudioSegment, unlockAudioContext } = useAudio();

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
    }
  }, [queueAudioSegment]);

  const { isOnline, sendMessage } = useWebSocket(WS_URL, handleMessageReceived);

  const handleSendMessage = (text) => {
    if (!text.trim() || !isOnline) return;

    // Explicit gesture-triggered AudioContext resume/initialization
    unlockAudioContext();

    const messageData = {
      id: `user-${Date.now()}`,
      sender: "user",
      text: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    sendMessage(messageData);
  };

  return (
    <>
      {/* Background Soft Glow */}
      <div className={`glow-effect ${isOnline ? "online" : "offline"}`}></div>

      {/* Network Status banner */}
      <OfflineBanner isOnline={isOnline} />

      {/* Main Split Interface Panels */}
      <div className="main-layout">
        
        {/* Left Side: Orb Visualizer */}
        <section className="left-panel">
          <div className="agent-stage">
            <Orb isOnline={isOnline} />
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
