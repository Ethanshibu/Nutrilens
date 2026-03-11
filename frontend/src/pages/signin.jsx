import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./signin.css";

const API_BASE_URL = "http://localhost:8000";

export default function SignIn() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!username.trim() || !password) {
      setError("Please enter both username and password.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/auth/signin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), password }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.detail || data.message || "Sign in failed");
        setLoading(false);
        return;
      }

      // Success: store user data and redirect to home
      localStorage.setItem("username", data.username);
      localStorage.setItem("name", data.name);
      localStorage.setItem("allergens", JSON.stringify(data.allergens || []));
      
      setLoading(false);
      navigate("/");
    } catch (err) {
      setError("Network error. Check backend and try again.");
      setLoading(false);
    }
  }

  return (
    <div className="sw-container">
      <div className="sw-card" role="region" aria-labelledby="signin-heading">
        <div className="sw-brand">
          <div className="sw-logo">S</div>
          <h1 id="signin-heading" className="sw-title">Sign In</h1>
          <p className="sw-sub">Welcome back — sign in to continue.</p>
        </div>

        <form className="sw-form" onSubmit={handleSubmit} noValidate>
          {error && (
            <div className="sw-alert" role="alert" aria-live="polite">
              {error}
            </div>
          )}

          <label className="sw-label" htmlFor="username">Username</label>
          <input
            id="username"
            name="username"
            className="sw-input"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="your.username"
            autoComplete="username"
            disabled={loading}
          />

          <label className="sw-label" htmlFor="password">Password</label>
          <input
            id="password"
            name="password"
            type="password"
            className="sw-input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            autoComplete="current-password"
            disabled={loading}
          />

          <div className="sw-row">
            <label className="sw-remember">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                disabled={loading}
              />
              <span>Remember me</span>
            </label>

            <a className="sw-link" href="/forgot">Forgot?</a>
          </div>

          <button
            type="submit"
            className={"sw-button " + (loading ? "sw-button--loading" : "")}
            disabled={loading}
            aria-disabled={loading}
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <div className="sw-footer">
          New here? <a className="sw-link sw-link--bold" href="/signup">Create an account</a>
        </div>
      </div>
    </div>
  );
}
