import React from "react";

/**
 * Banner component showing when client disconnects from the backend WebSocket server.
 * 
 * @param {Object} props - Component properties
 * @param {boolean} props.isOnline - Current connection status
 */
function OfflineBanner({ isOnline }) {
  return (
    <div className={`offline-banner ${isOnline ? "hide" : "show"}`}>
      Server offline
    </div>
  );
}

export default OfflineBanner;
