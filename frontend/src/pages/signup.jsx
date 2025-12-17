import React, { useState } from "react";
import "./SignUp.css"; // separate CSS file

export default function SignUp({ onSuccess }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setMessage("");

    if (!username.trim() || !password || !confirm) {
      setError("All fields are required.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), password }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.detail || data.message || "Signup failed");
        setLoading(false);
        return;
      }

      setMessage("Signup successful! You can now sign in.");
      setUsername("");
      setPassword("");
      setConfirm("");
      setLoading(false);

      if (onSuccess) onSuccess({ username });
    } catch (err) {
      setError("Network error. Check backend and try again.",err);
      setLoading(false);
    }
  }

  return (
    <div className="su-container">
      <div className="su-card" role="region" aria-labelledby="signup-heading">
        <div className="su-brand">
          <div className="su-logo">S</div>
          <h1 id="signup-heading" className="su-title">Sign Up</h1>
          <p className="su-sub">Create your account to get started.</p>
        </div>

        <form className="su-form" onSubmit={handleSubmit} noValidate>
          {error && (
            <div className="su-alert su-alert--error" role="alert">
              {error}
            </div>
          )}
          {message && (
            <div className="su-alert su-alert--success" role="status">
              {message}
            </div>
          )}

          <label className="su-label" htmlFor="username">Username</label>
          <input
            id="username"
            name="username"
            className="su-input"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="your.username"
            autoComplete="username"
            disabled={loading}
          />

          <label className="su-label" htmlFor="password">Password</label>
          <input
            id="password"
            name="password"
            type="password"
            className="su-input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            autoComplete="new-password"
            disabled={loading}
          />

          <label className="su-label" htmlFor="confirm">Confirm Password</label>
          <input
            id="confirm"
            name="confirm"
            type="password"
            className="su-input"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="••••••••"
            autoComplete="new-password"
            disabled={loading}
          />

          <button
            type="submit"
            className={"su-button " + (loading ? "su-button--loading" : "")}
            disabled={loading}
          >
            {loading ? "Creating account…" : "Sign Up"}
          </button>
        </form>

        <div className="su-footer">
          Already have an account?{" "}
          <a className="su-link su-link--bold" href="/signin">Sign in</a>
        </div>
      </div>
    </div>
  );
}
