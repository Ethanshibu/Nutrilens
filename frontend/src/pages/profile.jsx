import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./profile.css";

const API_BASE_URL = "http://localhost:8000";

const COMMON_ALLERGENS = [
  "Peanuts", "Tree Nuts", "Milk", "Eggs", "Fish", "Shellfish",
  "Soy", "Wheat", "Gluten", "Sesame", "Sulfites", "Mustard"
];

export default function Profile() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [name, setName] = useState("");
  const [allergens, setAllergens] = useState([]);
  const [customAllergen, setCustomAllergen] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [purchaseHistory, setPurchaseHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    // Get username from localStorage (we'll set this on signin)
    const storedUsername = localStorage.getItem("username");
    if (!storedUsername) {
      navigate("/signin");
      return;
    }
    setUsername(storedUsername);
    loadProfile(storedUsername);
    loadPurchaseHistory(storedUsername);
  }, [navigate]);

  const loadProfile = async (user) => {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/profile/${user}`);
      if (!res.ok) {
        throw new Error("Failed to load profile");
      }
      const data = await res.json();
      setName(data.name || "");
      setAllergens(data.allergens || []);
      setLoading(false);
    } catch (err) {
      setError("Failed to load profile. Please try again.");
      setLoading(false);
    }
  };

  const loadPurchaseHistory = async (user) => {
    setLoadingHistory(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/recommendations/history/${user}`);
      if (res.ok) {
        const data = await res.json();
        setPurchaseHistory(data.purchases || []);
      }
    } catch (err) {
      console.error("Failed to load purchase history:", err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const toggleAllergen = (allergen) => {
    setAllergens(prev =>
      prev.includes(allergen)
        ? prev.filter(a => a !== allergen)
        : [...prev, allergen]
    );
  };

  const addCustomAllergen = () => {
    if (customAllergen.trim() && !allergens.includes(customAllergen.trim())) {
      setAllergens([...allergens, customAllergen.trim()]);
      setCustomAllergen("");
    }
  };

  const removeAllergen = (allergen) => {
    setAllergens(prev => prev.filter(a => a !== allergen));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setSaving(true);

    try {
      const res = await fetch(`${API_BASE_URL}/auth/profile/${username}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim() || username,
          allergens: allergens
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || "Failed to update profile");
      }

      setMessage("Profile updated successfully!");
      // Update localStorage
      localStorage.setItem("name", data.name);
      localStorage.setItem("allergens", JSON.stringify(data.allergens));
      
      setTimeout(() => setMessage(""), 3000);
    } catch (err) {
      setError(err.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("username");
    localStorage.removeItem("name");
    localStorage.removeItem("allergens");
    navigate("/signin");
  };

  if (loading) {
    return (
      <div className="profile-container">
        <div className="loading">Loading profile...</div>
      </div>
    );
  }

  return (
    <div className="profile-container">
      <div className="profile-card">
        <div className="profile-header">
          <div className="profile-avatar">
            {(name || username).charAt(0).toUpperCase()}
          </div>
          <h1 className="profile-title">My Profile</h1>
          <p className="profile-username">@{username}</p>
        </div>

        <form className="profile-form" onSubmit={handleSave}>
          {error && (
            <div className="profile-alert profile-alert--error" role="alert">
              {error}
            </div>
          )}
          {message && (
            <div className="profile-alert profile-alert--success" role="status">
              {message}
            </div>
          )}

          <div className="form-section">
            <label className="profile-label" htmlFor="name">Display Name</label>
            <input
              id="name"
              type="text"
              className="profile-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your Name"
              disabled={saving}
            />
          </div>

          <div className="form-section">
            <label className="profile-label">My Allergens</label>
            <p className="profile-helper">
              Select or add allergens. We'll highlight them in product analyses.
            </p>
            
            <div className="allergen-grid">
              {COMMON_ALLERGENS.map(allergen => (
                <button
                  key={allergen}
                  type="button"
                  className={`allergen-btn ${allergens.includes(allergen) ? 'selected' : ''}`}
                  onClick={() => toggleAllergen(allergen)}
                  disabled={saving}
                >
                  {allergen}
                </button>
              ))}
            </div>

            <div className="custom-allergen">
              <input
                type="text"
                className="profile-input"
                placeholder="Add custom allergen..."
                value={customAllergen}
                onChange={(e) => setCustomAllergen(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addCustomAllergen())}
                disabled={saving}
              />
              <button
                type="button"
                className="btn-add"
                onClick={addCustomAllergen}
                disabled={saving || !customAllergen.trim()}
              >
                Add
              </button>
            </div>

            {allergens.length > 0 && (
              <div className="selected-allergens">
                <p className="profile-label">Selected Allergens:</p>
                <div className="allergen-tags">
                  {allergens.map(allergen => (
                    <span key={allergen} className="allergen-tag">
                      {allergen}
                      <button
                        type="button"
                        onClick={() => removeAllergen(allergen)}
                        className="remove-btn"
                        disabled={saving}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="button-group">
            <button
              type="submit"
              className={"profile-button primary " + (saving ? "loading" : "")}
              disabled={saving}
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
            <button
              type="button"
              className="profile-button secondary"
              onClick={handleLogout}
              disabled={saving}
            >
              Logout
            </button>
          </div>
        </form>

        {/* Purchase History Section */}
        <div className="purchase-history-section">
          <h2 className="section-title">📦 Purchase History</h2>
          {loadingHistory ? (
            <p className="loading-text">Loading purchase history...</p>
          ) : purchaseHistory.length === 0 ? (
            <p className="empty-message">No purchases yet. Start analyzing products and mark them as purchased!</p>
          ) : (
            <div className="purchase-list">
              {purchaseHistory.map((purchase, idx) => (
                <div key={purchase._id || idx} className="purchase-item">
                  <div className="purchase-header">
                    <h3 className="purchase-product-name">{purchase.product_name}</h3>
                    <span className="purchase-date">
                      {new Date(purchase.purchased_at).toLocaleDateString()}
                    </span>
                  </div>
                  {purchase.allergens && purchase.allergens.length > 0 && (
                    <div className="purchase-allergens">
                      <strong>Allergens:</strong> {purchase.allergens.join(", ")}
                    </div>
                  )}
                  {purchase.analysis_data?.confidence && (
                    <div className="purchase-confidence">
                      <strong>Analysis Confidence:</strong> {purchase.analysis_data.confidence}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Made with Bob
