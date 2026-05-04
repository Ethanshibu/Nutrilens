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
  
  // Health profile fields
  const [age, setAge] = useState("");
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [diabetes, setDiabetes] = useState(false);
  const [heartDisease, setHeartDisease] = useState(false);
  const [hypertension, setHypertension] = useState(false);
  const [calculatedBMI, setCalculatedBMI] = useState(null);

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

  // Calculate BMI when height or weight changes
  React.useEffect(() => {
    if (height && weight) {
      const heightInMeters = parseFloat(height) / 100;
      const weightInKg = parseFloat(weight);
      
      if (heightInMeters > 0 && weightInKg > 0) {
        const bmi = weightInKg / (heightInMeters * heightInMeters);
        setCalculatedBMI(bmi.toFixed(2));
      } else {
        setCalculatedBMI(null);
      }
    } else {
      setCalculatedBMI(null);
    }
  }, [height, weight]);

  const getBMICategory = (bmi) => {
    if (!bmi) return "";
    const bmiValue = parseFloat(bmi);
    if (bmiValue < 18.5) return "Underweight";
    if (bmiValue < 25) return "Normal";
    if (bmiValue < 30) return "Overweight";
    return "Obese";
  };

  const loadProfile = async (user) => {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/profile/${user}`);
      if (!res.ok) {
        throw new Error("Failed to load profile");
      }
      const data = await res.json();
      setName(data.name || "");
      setAllergens(data.allergens || []);
      
      // Load health profile data
      setAge(data.age || "");
      setDiabetes(data.diabetes || false);
      setHeartDisease(data.heart_disease || false);
      setHypertension(data.hypertension || false);
      
      // Calculate height and weight from BMI if available
      // For now, we'll just store BMI and let user update height/weight
      if (data.bmi) {
        setCalculatedBMI(data.bmi.toFixed(2));
      }
      
      setLoading(false);
    } catch (error) {
      console.error("Failed to load profile:", error);
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

  const handleDeletePurchase = async (purchaseId) => {
    if (!window.confirm("Are you sure you want to remove this purchase from your history?")) {
      return;
    }

    try {
      const res = await fetch(
        `${API_BASE_URL}/api/v1/recommendations/purchase/${purchaseId}?username=${username}`,
        { method: "DELETE" }
      );

      if (res.ok) {
        setPurchaseHistory(prev => prev.filter(p => p._id !== purchaseId));
        setMessage("Purchase removed successfully");
        setTimeout(() => setMessage(""), 3000);
      } else {
        throw new Error("Failed to delete purchase");
      }
    } catch (error) {
      console.error("Failed to delete purchase:", error);
      setError("Failed to remove purchase. Please try again.");
      setTimeout(() => setError(""), 3000);
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
          allergens: allergens,
          age: age ? parseInt(age) : null,
          bmi: calculatedBMI ? parseFloat(calculatedBMI) : null,
          diabetes: diabetes,
          heart_disease: heartDisease,
          hypertension: hypertension
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

          <div className="form-section health-profile-section">
            <label className="profile-label">Health Profile</label>
            <p className="profile-helper">
              Update your health information for better personalized recommendations.
            </p>
            
            <div className="health-grid">
              <div className="health-field">
                <label className="profile-label" htmlFor="age">Age (years)</label>
                <input
                  id="age"
                  type="number"
                  className="profile-input"
                  placeholder="e.g., 30"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  min="1"
                  max="120"
                  disabled={saving}
                />
              </div>

              <div className="health-field">
                <label className="profile-label" htmlFor="height">Height (cm)</label>
                <input
                  id="height"
                  type="number"
                  className="profile-input"
                  placeholder="e.g., 170"
                  value={height}
                  onChange={(e) => setHeight(e.target.value)}
                  min="50"
                  max="250"
                  disabled={saving}
                />
              </div>

              <div className="health-field">
                <label className="profile-label" htmlFor="weight">Weight (kg)</label>
                <input
                  id="weight"
                  type="number"
                  className="profile-input"
                  placeholder="e.g., 70"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  min="20"
                  max="300"
                  disabled={saving}
                />
              </div>
            </div>

            {calculatedBMI && (
              <div className="bmi-display">
                <p className="bmi-value">
                  BMI: <strong>{calculatedBMI}</strong> ({getBMICategory(calculatedBMI)})
                </p>
              </div>
            )}

            <div className="health-conditions">
              <p className="profile-label">Health Conditions</p>
              <label className="health-checkbox">
                <input
                  type="checkbox"
                  checked={diabetes}
                  onChange={(e) => setDiabetes(e.target.checked)}
                  disabled={saving}
                />
                <span>Diabetes</span>
              </label>
              <label className="health-checkbox">
                <input
                  type="checkbox"
                  checked={heartDisease}
                  onChange={(e) => setHeartDisease(e.target.checked)}
                  disabled={saving}
                />
                <span>Heart Disease</span>
              </label>
              <label className="health-checkbox">
                <input
                  type="checkbox"
                  checked={hypertension}
                  onChange={(e) => setHypertension(e.target.checked)}
                  disabled={saving}
                />
                <span>Hypertension</span>
              </label>
            </div>
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
          <h2 className="section-title">Purchase History</h2>
          {loadingHistory ? (
            <p className="loading-text">Loading purchase history...</p>
          ) : purchaseHistory.length === 0 ? (
            <p className="empty-message">No purchases yet. Start analyzing products and mark them as purchased!</p>
          ) : (
            <div className="purchase-list">
              {purchaseHistory.map((purchase, idx) => (
                <div key={purchase._id || idx} className="purchase-item">
                  <div className="purchase-header">
                    <div className="purchase-info">
                      <h3 className="purchase-product-name">{purchase.product_name}</h3>
                      <span className="purchase-date">
                        {new Date(purchase.purchased_at).toLocaleDateString()}
                      </span>
                    </div>
                    <button
                      onClick={() => handleDeletePurchase(purchase._id)}
                      className="delete-purchase-btn"
                      title="Remove from history"
                    >
                      Remove
                    </button>
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
