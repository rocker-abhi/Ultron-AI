import { useState, useEffect, useRef } from "react";
import { setupConsoleInterceptor } from "../services/websocketService";
import { RECONNECT_DELAY_MS } from "../constants/chatConfig";

// Module-level WebSocket singleton and listener collection to survive React StrictMode double-mounting
let globalWs = null;
const listeners = new Set();
let reconnectTimeout = null;

const notifyListeners = (event, ...args) => {
  listeners.forEach(cb => {
    if (cb[event]) {
      cb[event](...args);
    }
  });
};

const connect = (url) => {
  if (globalWs) return;

  const ws = new WebSocket(url);
  globalWs = ws;

  ws.onopen = () => {
    notifyListeners("onOpen");
    setupConsoleInterceptor(ws);
  };

  ws.onclose = () => {
    globalWs = null;
    notifyListeners("onClose");
    
    // Clear any pending timeout and reschedule
    if (reconnectTimeout) {
      clearTimeout(reconnectTimeout);
    }
    reconnectTimeout = setTimeout(() => {
      reconnectTimeout = null;
      connect(url);
    }, RECONNECT_DELAY_MS);
  };

  ws.onerror = () => {
    notifyListeners("onError");
  };

  ws.onmessage = (event) => {
    let msg;
    try {
      msg = JSON.parse(event.data);
    } catch (err) {
      // Raw text fallback
      msg = {
        id: `raw-${Date.now()}`,
        sender: "broadcast",
        text: event.data,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
    }
    notifyListeners("onMessage", msg);
  };
};

/**
 * Custom React hook to manage WebSocket connection, reconnect cycles,
 * and console log forwarding.
 * 
 * @param {string} url - Target connection endpoint
 * @param {Function} onMessageReceived - Callback when a payload arrives
 * @returns {Object} Connection state and message dispatch trigger
 */
export const useWebSocket = (url, onMessageReceived) => {
  const [isOnline, setIsOnline] = useState(
    globalWs !== null && globalWs.readyState === WebSocket.OPEN
  );

  // Store message callback in a ref to avoid resetting socket connection on wrapper updates
  const onMessageRef = useRef(onMessageReceived);
  useEffect(() => {
    onMessageRef.current = onMessageReceived;
  }, [onMessageReceived]);

  useEffect(() => {
    const callbacks = {
      onOpen: () => setIsOnline(true),
      onClose: () => setIsOnline(false),
      onError: () => setIsOnline(false),
      onMessage: (msg) => {
        if (onMessageRef.current) {
          onMessageRef.current(msg);
        }
      }
    };

    listeners.add(callbacks);

    // Sync initial state if connection is already open
    if (globalWs && globalWs.readyState === WebSocket.OPEN) {
      setIsOnline(true);
    }

    // Initialize connection
    connect(url);

    return () => {
      listeners.delete(callbacks);
    };
  }, [url]);

  const sendMessage = (payload) => {
    if (globalWs && globalWs.readyState === WebSocket.OPEN) {
      globalWs.send(JSON.stringify(payload));
      return true;
    }
    return false;
  };

  return { isOnline, sendMessage };
};
