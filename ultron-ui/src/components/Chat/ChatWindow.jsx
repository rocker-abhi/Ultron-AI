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
function ChatWindow({ 
  isOnline, 
  messages, 
  onSendMessage, 
  isProcessing, 
  onStopProcessing,
  isVadEnabled,
  onToggleVad,
  isAudioEnabled,
  onToggleAudio,
  username,
  onLogout
}) {
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
      {/* Console settings and status header */}
      <div className="chatbox-header">
        <div className="header-title">Ultron Console</div>
        <div className="console-toggles">
          <div className="toggle-container" title="Toggle voice activity speech detection">
            <span className="toggle-label">VAD</span>
            <label className="switch">
              <input 
                type="checkbox" 
                checked={isVadEnabled} 
                onChange={(e) => onToggleVad(e.target.checked)} 
              />
              <span className="slider"></span>
            </label>
          </div>
          <div className="toggle-container" title="Toggle audio voice playback (Speaker)">
            <span className="toggle-label">AUDIO</span>
            <label className="switch">
              <input 
                type="checkbox" 
                checked={isAudioEnabled} 
                onChange={(e) => onToggleAudio(e.target.checked)} 
              />
              <span className="slider"></span>
            </label>
          </div>
          {username && (
            <div className="toggle-container" title={`Logged in as ${username}`}>
              <span className="user-badge">@{username}</span>
              <button 
                type="button" 
                className="logout-btn" 
                onClick={onLogout}
                title="Sign out of current session"
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </div>

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
