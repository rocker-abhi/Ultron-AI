import "./App.css";

function App() {
  return (
    <main className="app-container">
      {/* Background Soft Glow */}
      <div className="glow-effect"></div>

      {/* Main Agent Orb Area */}
      <div className="agent-stage">
        <div className="agent-visualizer">
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
