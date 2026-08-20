/**
 * Establishes a WebSocket connection and registers callback events.
 * 
 * @param {string} url - The WebSocket endpoint URL
 * @param {Object} callbacks - Hook triggers
 * @param {Function} [callbacks.onOpen] - Connection success handler
 * @param {Function} [callbacks.onClose] - Connection termination handler
 * @param {Function} [callbacks.onError] - Network error handler
 * @param {Function} [callbacks.onMessage] - Received payload handler
 * @returns {WebSocket} Instantiated connection
 */
export const createWebSocketConnection = (url, callbacks = {}) => {
  const ws = new WebSocket(url);
  
  ws.onopen = () => {
    if (callbacks.onOpen) callbacks.onOpen();
  };
  
  ws.onclose = () => {
    if (callbacks.onClose) callbacks.onClose();
  };
  
  ws.onerror = () => {
    if (callbacks.onError) callbacks.onError();
  };
  
  ws.onmessage = (event) => {
    if (callbacks.onMessage) {
      try {
        const msg = JSON.parse(event.data);
        callbacks.onMessage(msg);
      } catch (err) {
        // Raw text message fallback
        callbacks.onMessage({
          id: `raw-${Date.now()}`,
          sender: "broadcast",
          text: event.data,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        });
      }
    }
  };
  
  return ws;
};

/**
 * Replaces console handlers to route warning/error logs over the active socket session.
 * 
 * @param {WebSocket} ws - Active WebSocket connection
 */
export const setupConsoleInterceptor = (ws) => {
  const originalError = console.error;
  const originalWarn = console.warn;
  
  console.error = (...args) => {
    originalError.apply(console, args);
    try {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          event: "log_error",
          text: args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(" ")
        }));
      }
    } catch (e) {}
  };
  
  console.warn = (...args) => {
    originalWarn.apply(console, args);
    try {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          event: "log_warn",
          text: args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(" ")
        }));
      }
    } catch (e) {}
  };
};
export const restoreConsoleHandlers = () => {
  // Can be used to unbind logging interceptors if needed
};
