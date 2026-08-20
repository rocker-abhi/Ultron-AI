import { useState, useEffect, useRef } from "react";
import Orb from "../components/Orb";
import Chatbox from "../components/Chatbox";
import { chatboxConfig } from "../config";
import "../App.css";

function Homepage() {
  const [isOnline, setIsOnline] = useState(false); // Default to false until connected
  const [messages, setMessages] = useState([]);
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);

  useEffect(() => {
    let isMounted = true;

    const connectWS = () => {
      // 1. Clean up any existing socket connection to prevent leaks
      if (wsRef.current) {
        wsRef.current.onopen = null;
        wsRef.current.onclose = null;
        wsRef.current.onerror = null;
        wsRef.current.close();
        wsRef.current = null;
      }

      // 2. Clear any pending reconnect timeouts
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }

      // 3. Establish a new WebSocket connection to the FastAPI server
      const ws = new WebSocket("ws://127.0.0.1:8000/ws");
      wsRef.current = ws;

      ws.onopen = () => {
        if (isMounted) {
          setIsOnline(true);
        }
      };

      ws.onclose = () => {
        if (isMounted) {
          setIsOnline(false);
          wsRef.current = null;
          // Attempt to reconnect in exactly 3 seconds
          reconnectTimeoutRef.current = setTimeout(connectWS, 3000);
        }
      };

      ws.onerror = () => {
        if (isMounted) {
          setIsOnline(false);
        }
        if (wsRef.current) {
          wsRef.current.close();
        }
      };

      ws.onmessage = (event) => {
        if (!isMounted) return;
        try {
          // Parse received JSON payload and append to messages history
          const msg = JSON.parse(event.data);
          setMessages((prev) => [...prev, msg]);
        } catch (e) {
          // Fallback if data is raw string format
          setMessages((prev) => [
            ...prev,
            {
              id: `raw-${Date.now()}`,
              sender: "broadcast",
              text: event.data,
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            }
          ]);
        }
      };
    };

    connectWS();

    return () => {
      isMounted = false;
      if (wsRef.current) {
        wsRef.current.onopen = null;
        wsRef.current.onclose = null;
        wsRef.current.onerror = null;
        wsRef.current.onmessage = null;
        wsRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, []);

  const handleSendMessage = (text) => {
    if (!text.trim() || !isOnline || !wsRef.current) return;

    const messageData = {
      id: `user-${Date.now()}`,
      sender: "user",
      text: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    // Serialize message and transmit over WebSocket
    wsRef.current.send(JSON.stringify(messageData));
  };

  return (
    <>
      {/* Background Soft Glow */}
      <div className={`glow-effect ${isOnline ? "online" : "offline"}`}></div>

      {/* Reconnecting Status Banner */}
      <div className={`offline-banner ${isOnline ? "hide" : "show"}`}>
        Server offline
      </div>

      {/* Split Screen Layout */}
      <div className="main-layout">

        {/* Left Section: Centered AI Agent Visualizer Component */}
        <section className="left-panel">
          <div className="agent-stage">
            <Orb isOnline={isOnline} />
          </div>
        </section>

        {/* Right Section: Modular Chatbox Component */}
        <section className="right-panel" style={{ width: chatboxConfig.width }}>
          <Chatbox
            isOnline={isOnline}
            messages={messages}
            onSendMessage={handleSendMessage}
          />
        </section>

      </div>
    </>
  );
}

export default Homepage;
