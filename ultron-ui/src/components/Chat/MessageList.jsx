import React, { useEffect, useRef } from "react";
import Message from "./Message";

/**
 * Scrollable list that renders Message bubbles and handles auto-scroll-to-bottom on updates.
 * 
 * @param {Object} props - Component properties
 * @param {Array} props.messages - List of messages
 */
function MessageList({ messages }) {
  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="chat-messages">
      {messages.map((msg) => (
        <Message key={msg.id} message={msg} />
      ))}
      <div ref={chatEndRef} />
    </div>
  );
}

export default MessageList;
