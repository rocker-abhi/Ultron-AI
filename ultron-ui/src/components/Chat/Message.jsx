import React from "react";

/**
 * Message bubble container.
 * 
 * @param {Object} props - Component properties
 * @param {Object} props.message - Message data
 * @param {string} props.message.sender - Sender role ('user' | 'ai' | 'broadcast')
 * @param {string} props.message.text - Message textual content
 */
function Message({ message }) {
  return (
    <div className={`chat-message-wrapper ${message.sender}`}>
      <div className="chat-message">
        <p className="message-text">{message.text}</p>
      </div>
    </div>
  );
}

export default Message;
