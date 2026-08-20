import { orbConfig } from "../config";

function Orb({ isOnline }) {
  // Compile inline style transformations from global configuration file
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
