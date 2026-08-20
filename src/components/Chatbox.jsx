import { useState, useEffect, useRef } from "react";
import sendIcon from "../assets/icons/send-white.svg";
import stopIcon from "../assets/icons/stop-white.svg";

function Chatbox({ isOnline, messages, onSendMessage }) {
  const [inputText, setInputText] = useState("");
  const chatEndRef = useRef(null);

  // Auto-scroll chat window when new messages arrive
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!isOnline) return;
    
    if (inputText.trim()) {
      // Call parent send handler with the text payload
      onSendMessage(inputText);
      setInputText("");
    } else {
      // Optional: Handle "Stop" action if required by backend, currently a no-op
      console.log("Stop action triggered.");
    }
  };

  return (
    <div className="chatbox-wrapper">
      
      {/* Scrollable messages list */}
      <div className="chat-messages">
        {messages.map((msg) => (
          <div 
            key={msg.id} 
            className={`chat-message-wrapper ${msg.sender}`}
          >
            <div className="chat-message">
              <p className="message-text">{msg.text}</p>
            </div>
          </div>
        ))}
        <div ref={chatEndRef} />
      </div>

      {/* Bottom input section */}
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
          className="chat-send-btn"
          title={inputText.trim() ? "Send message" : "Stop processing"}
        >
          <img 
            src={inputText.trim() ? sendIcon : stopIcon} 
            alt={inputText.trim() ? "Send" : "Stop"} 
            className="btn-icon"
          />
        </button>
      </form>
    </div>
  );
}

export default Chatbox;
