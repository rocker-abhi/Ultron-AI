import React from "react";
import { orbConfig } from "../../constants/chatConfig";

/**
 * Pulsing concentric animation representing the AI core visualizer states.
 * 
 * @param {Object} props - Component properties
 * @param {boolean} props.isOnline - Current connection status
 * @param {boolean} props.isProcessing - Active processing state
 */
function Orb({ isOnline, isProcessing }) {
  const orbStyle = {
    transform: `scale3d(${orbConfig.scale}, ${orbConfig.scale}, 1) translate3d(${orbConfig.offsetX}, ${orbConfig.offsetY}, 0)`,
  };

  const status = isOnline ? (isProcessing ? "processing" : "online") : "offline";

  return (
    <div className="orb-wrapper">
      {isProcessing && <div className="orb-processing-text">Processing...</div>}
      <div 
        className={`agent-visualizer ${status}`}
        style={orbStyle}
      >
        {/* Single Slow Orbital Ring */}
        <div className="orbital-ring ring-inner"></div>

        {/* AI Central Orb Core */}
        <div className="core-orb">
          <div className="core-orb-inner"></div>
          <div className="core-orb-nucleus"></div>
        </div>
      </div>
    </div>
  );
}

export default Orb;
