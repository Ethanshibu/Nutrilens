import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./signup.css";

const API_BASE_URL = "http://localhost:8000";

const COMMON_ALLERGENS = [
  "Peanuts", "Tree Nuts", "Milk", "Eggs", "Fish", "Shellfish",
  "Soy", "Wheat", "Gluten", "Sesame", "Sulfites", "Mustard"
];

export default function SignUp() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [name, setName] = useState("");
  const [selectedAllergens, setSelectedAllergens] = useState([]);
  const [customAllergen, setCustomAllergen] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const toggleAllergen = (allergen) => {
    setSelectedAllergens(prev =>
      prev.includes(allergen)
        ? prev.filter(a => a !== allergen)
        : [...prev, allergen]
    );
  };

  const addCustomAllergen = () => {
    if (customAllergen.trim() && !selectedAllergens.includes(customAllergen.trim())) {
      setSelectedAllergens([...selectedAllergens, customAllergen.trim()]);
      setCustomAllergen("");
    }
  };

  const removeAllergen = (allergen) => {
    setSelectedAllergens(prev => prev.filter(a => a !== allergen));
  };

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setMessage("");

    if (!username.trim() || !password || !confirm) {
      setError("Username and password are required.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: username.trim(),
          password,
          name: name.trim() || username.trim(),
          allergens: selectedAllergens
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.detail || data.message || "Signup failed");
        setLoading(false);
        return;
      }

      setMessage("Signup successful! Redirecting to sign in...");
      setUsername("");
      setPassword("");
      setConfirm("");
      setName("");
      setSelectedAllergens([]);
      setLoading(false);

      // Redirect to signin after 1.5 seconds
      setTimeout(() => navigate("/signin"), 1500);
    } catch (err) {
      setError("Network error. Check backend and try again.");
      setLoading(false);
    }
  }

  return (
    <div className="su-container">
      <div className="su-card" role="region" aria-labelledby="signup-heading">
        <div className="su-brand">
          <div className="su-logo">🔬</div>
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

          <label className="su-label" htmlFor="username">Username *</label>
          <input
            id="username"
            name="username"
            className="su-input"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="your.username"
            autoComplete="username"
            disabled={loading}
            required
          />

          <label className="su-label" htmlFor="name">Display Name (Optional)</label>
          <input
            id="name"
            name="name"
            className="su-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your Name"
            autoComplete="name"
            disabled={loading}
          />

          <label className="su-label" htmlFor="password">Password *</label>
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
            required
          />

          <label className="su-label" htmlFor="confirm">Confirm Password *</label>
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
            required
          />

          <div className="allergen-section">
            <label className="su-label">Allergens (Optional)</label>
            <p className="su-helper">Select any allergens you have. This helps us analyze products for you.</p>
            
            <div className="allergen-grid">
              {COMMON_ALLERGENS.map(allergen => (
                <button
                  key={allergen}
                  type="button"
                  className={`allergen-btn ${selectedAllergens.includes(allergen) ? 'selected' : ''}`}
                  onClick={() => toggleAllergen(allergen)}
                  disabled={loading}
                >
                  {allergen}
                </button>
              ))}
            </div>

            <div className="custom-allergen">
              <input
                type="text"
                className="su-input"
                placeholder="Add custom allergen..."
                value={customAllergen}
                onChange={(e) => setCustomAllergen(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addCustomAllergen())}
                disabled={loading}
              />
              <button
                type="button"
                className="btn-add"
                onClick={addCustomAllergen}
                disabled={loading || !customAllergen.trim()}
              >
                Add
              </button>
            </div>

            {selectedAllergens.length > 0 && (
              <div className="selected-allergens">
                <p className="su-label">Selected Allergens:</p>
                <div className="allergen-tags">
                  {selectedAllergens.map(allergen => (
                    <span key={allergen} className="allergen-tag">
                      {allergen}
                      <button
                        type="button"
                        onClick={() => removeAllergen(allergen)}
                        className="remove-btn"
                        disabled={loading}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

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

// Made with Bob
