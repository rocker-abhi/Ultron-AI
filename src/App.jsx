import { useState, useEffect } from "react";
import "./App.css";

function App() {
  const [isOnline, setIsOnline] = useState(false); // Default to false until connected

  useEffect(() => {
    let ws = null;
    let reconnectTimeout = null;
    let isMounted = true;

    const connectWS = () => {
      // 1. Clean up any existing socket and listeners to prevent connection leaks
      if (ws) {
        ws.onopen = null;
        ws.onclose = null;
        ws.onerror = null;
        ws.close();
        ws = null;
      }
      
      // 2. Clear any pending reconnect timeouts
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
        reconnectTimeout = null;
      }

      // 3. Establish a new WebSocket connection to the FastAPI server
      ws = new WebSocket("ws://127.0.0.1:8000/ws");

      ws.onopen = () => {
        if (isMounted) {
          setIsOnline(true);
        }
      };

      ws.onclose = () => {
        if (isMounted) {
          setIsOnline(false);
          // Clean up reference
          ws = null;
          // Attempt to reconnect in exactly 3 seconds
          reconnectTimeout = setTimeout(connectWS, 3000);
        }
      };

      ws.onerror = () => {
        if (isMounted) {
          setIsOnline(false);
        }
        // Triggers onclose event handler automatically
        if (ws) {
          ws.close();
        }
      };
    };

    connectWS();

    return () => {
      isMounted = false;
      if (ws) {
        ws.onopen = null;
        ws.onclose = null;
        ws.onerror = null;
        ws.close();
      }
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
    };
  }, []);

  return (
    <main className="app-container">
      {/* Background Soft Glow - Class handles the smooth transitions */}
      <div className={`glow-effect ${isOnline ? "online" : "offline"}`}></div>

      {/* Server Status Banner - Rendered with state classes for smooth slide & fade transitions */}
      <div className={`offline-banner ${isOnline ? "hide" : "show"}`}>
        Server offline
      </div>

      {/* Main Agent Orb Area */}
      <div className="agent-stage">
        <div className={`agent-visualizer ${isOnline ? "online" : "offline"}`}>
          {/* Single Slow Orbital Ring */}
          <div className="orbital-ring ring-inner"></div>

          {/* AI Central Orb Core */}
          <div className="core-orb">
            <div className="core-orb-inner"></div>
            <div className="core-orb-nucleus"></div>
          </div>
        </div>
      </div>
    </main>
  );
}

export default App;
