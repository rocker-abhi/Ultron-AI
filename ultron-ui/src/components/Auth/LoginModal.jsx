import React, { useState } from "react";

/**
 * Glassmorphism Login Modal popover window.
 * Authenticates credentials with backend and establishes session.
 * 
 * @param {Object} props - Component properties
 * @param {Function} props.onLoginSuccess - Callback when session starts
 */
function LoginModal({ onLoginSuccess }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [showForceConfirm, setShowForceConfirm] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError("Please fill in both fields.");
      return;
    }

    // Generate or fetch a persistent unique tab identification identifier
    let tabId = sessionStorage.getItem("ultron_tab_id");
    if (!tabId) {
      tabId = "tab_" + Math.random().toString(36).substring(2, 15);
      sessionStorage.setItem("ultron_tab_id", tabId);
    }

    try {
      const response = await fetch("http://localhost:8000/auth/v1/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: username.trim(),
          password: password,
          tab_id: tabId,
          force: false,
        }),
      });

      const result = await response.json();
      if (response.ok && result.success) {
        localStorage.setItem("ultron_session", result.data.username);
        localStorage.setItem("ultron_session_id", result.data.session_id);
        localStorage.setItem("ultron_session_tab_id", result.data.tab_id);
        onLoginSuccess();
      } else {
        if (response.status === 409 || (result.error && result.error.session_exists)) {
          setShowForceConfirm(true);
        } else {
          setError(result.message || "Invalid username or password.");
        }
      }
    } catch (err) {
      setError("Connection to login server failed.");
    }
  };

  const handleForceLogin = async () => {
    let tabId = sessionStorage.getItem("ultron_tab_id");
    try {
      const response = await fetch("http://localhost:8000/auth/v1/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: username.trim(),
          password: password,
          tab_id: tabId,
          force: true,
        }),
      });

      const result = await response.json();
      if (response.ok && result.success) {
        localStorage.setItem("ultron_session", result.data.username);
        localStorage.setItem("ultron_session_id", result.data.session_id);
        localStorage.setItem("ultron_session_tab_id", result.data.tab_id);
        onLoginSuccess();
      } else {
        setError(result.message || "Takeover failed.");
        setShowForceConfirm(false);
      }
    } catch (err) {
      setError("Connection to login server failed.");
      setShowForceConfirm(false);
    }
  };

  if (showForceConfirm) {
    return (
      <div className="login-modal-overlay">
        <div className="login-modal-content">
          <h2 className="login-title text-warning">Session Conflict</h2>
          <p className="login-subtitle">
            An active session is already running in another browser tab. Continuing will disconnect the other workspace.
          </p>
          <div className="button-group">
            <button onClick={handleForceLogin} className="login-submit-btn force-btn">
              Disconnect & Continue
            </button>
            <button onClick={() => { setShowForceConfirm(false); setError(""); }} className="login-submit-btn cancel-btn">
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="login-modal-overlay">
      <div className="login-modal-content">
        <h2 className="login-title">Access Ultron AI</h2>
        <p className="login-subtitle">Sign in to access your secure workspace console</p>
        
        <form onSubmit={handleSubmit} className="login-form">
          <div className="input-group">
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Username"
              autoComplete="username"
              className="login-input"
            />
          </div>

          <div className="input-group">
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              autoComplete="current-password"
              className="login-input"
            />
          </div>

          {error && <div className="login-error-message">{error}</div>}

          <button type="submit" className="login-submit-btn">
            Sign In
          </button>
        </form>
      </div>
    </div>
  );
}

export default LoginModal;
