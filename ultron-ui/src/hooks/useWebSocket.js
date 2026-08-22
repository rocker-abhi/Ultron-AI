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

let connectionTimeout = null;

const connect = (url) => {
  if (globalWs) return;

  if (reconnectTimeout) {
    clearTimeout(reconnectTimeout);
    reconnectTimeout = null;
  }

  const ws = new WebSocket(url);
  globalWs = ws;

  // Set active timeout: if server is down, avoid waiting for browser TCP timeout (which can take 10s+)
  connectionTimeout = setTimeout(() => {
    if (ws.readyState === WebSocket.CONNECTING) {
      console.warn("WebSocket connection attempt timed out. Retrying...");
      ws.close();
    }
  }, RECONNECT_DELAY_MS);

  ws.onopen = () => {
    if (connectionTimeout) {
      clearTimeout(connectionTimeout);
      connectionTimeout = null;
    }
    notifyListeners("onOpen");
    setupConsoleInterceptor(ws);
  };

  ws.onclose = (event) => {
    if (connectionTimeout) {
      clearTimeout(connectionTimeout);
      connectionTimeout = null;
    }
    globalWs = null;
    notifyListeners("onClose");
    
    // Intercept session invalidation or tab lock collision close code
    if (event && event.code === 4001) {
      console.warn("WebSocket closed due to session invalidation or tab ID mismatch. Suppressing reconnect.");
      window.dispatchEvent(new Event("ultron_session_invalid"));
      return;
    }
    
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
    // Explicitly call close to force immediate onclose retry loop execution
    try {
      ws.close();
    } catch (e) {}
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

const disconnect = () => {
  if (globalWs) {
    globalWs.onclose = null;
    globalWs.onerror = null;
    globalWs.onmessage = null;
    globalWs.onopen = null;
    try {
      globalWs.close();
    } catch (e) {}
    globalWs = null;
  }
  if (reconnectTimeout) {
    clearTimeout(reconnectTimeout);
    reconnectTimeout = null;
  }
  if (connectionTimeout) {
    clearTimeout(connectionTimeout);
    connectionTimeout = null;
  }
  notifyListeners("onClose");
};

/**
 * Custom React hook to manage WebSocket connection, reconnect cycles,
 * and console log forwarding.
 * 
 * @param {string} url - Target connection endpoint
 * @param {Function} onMessageReceived - Callback when a payload arrives
 * @param {boolean} [enabled=true] - Flag to connect/disconnect socket conditionally
 * @returns {Object} Connection state and message dispatch trigger
 */
export const useWebSocket = (url, onMessageReceived, enabled = true) => {
  const [isOnline, setIsOnline] = useState(
    globalWs !== null && globalWs.readyState === WebSocket.OPEN
  );

  // Store message callback in a ref to avoid resetting socket connection on wrapper updates
  const onMessageRef = useRef(onMessageReceived);
  useEffect(() => {
    onMessageRef.current = onMessageReceived;
  }, [onMessageReceived]);

  useEffect(() => {
    if (!enabled) {
      setIsOnline(false);
      disconnect();
      return;
    }

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
    } else {
      connect(url);
    }

    return () => {
      listeners.delete(callbacks);
    };
  }, [url, enabled]);

  const sendMessage = (payload) => {
    if (globalWs && globalWs.readyState === WebSocket.OPEN) {
      globalWs.send(JSON.stringify(payload));
      return true;
    }
    return false;
  };

  return { isOnline, sendMessage };
};
