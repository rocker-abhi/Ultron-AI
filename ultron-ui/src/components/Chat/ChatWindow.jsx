import React, { useState } from "react";
import MessageList from "./MessageList";
import sendIcon from "../../assets/icons/send-white.svg";
import stopIcon from "../../assets/icons/stop-white.svg";

/**
 * Message log feed wrapper combined with bottom message inputs.
 * 
 * @param {Object} props - Component properties
 * @param {boolean} props.isOnline - Server connection status
 * @param {Array} props.messages - Active message payload list
 * @param {Function} props.onSendMessage - Dispatch text handler callback
 */
function ChatWindow({ isOnline, messages, onSendMessage, isProcessing, onStopProcessing }) {
  const [inputText, setInputText] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!isOnline) return;
    
    if (isProcessing) {
      if (onStopProcessing) {
        onStopProcessing();
      }
    } else if (inputText.trim()) {
      onSendMessage(inputText);
      setInputText("");
    }
  };

  return (
    <div className="chatbox-wrapper">
      {/* Scrollable messages history */}
      <MessageList messages={messages} />

      {/* Bottom keyboard entry bar */}
      <form onSubmit={handleSubmit} className="chat-input-row">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Type a message..."
          disabled={!isOnline}
          className="chat-input"
        />
        <button 
          type="submit" 
          disabled={!isOnline} 
          className={`chat-send-btn ${isProcessing ? "stop-btn" : ""}`}
          title={isProcessing ? "Stop processing" : "Send message"}
        >
          <img 
            src={isProcessing ? stopIcon : sendIcon} 
            alt={isProcessing ? "Stop" : "Send"} 
            className="btn-icon"
          />
        </button>
      </form>
    </div>
  );
}

export default ChatWindow;
