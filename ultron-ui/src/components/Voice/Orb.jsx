import React from "react";
import { orbConfig } from "../../constants/chatConfig";

/**
 * Pulsing concentric animation representing the AI core visualizer states.
 * 
 * @param {Object} props - Component properties
 * @param {boolean} props.isOnline - Current connection status
 */
function Orb({ isOnline }) {
  const orbStyle = {
    transform: `scale3d(${orbConfig.scale}, ${orbConfig.scale}, 1) translate3d(${orbConfig.offsetX}, ${orbConfig.offsetY}, 0)`,
  };

  return (
    <div 
      className={`agent-visualizer ${isOnline ? "online" : "offline"}`}
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
  );
}

export default Orb;
