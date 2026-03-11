import { useState } from "react";
import CameraCapture from "../components/CameraCapture";
import "./home.css";

const API_BASE_URL = "http://localhost:8000";

export default function Home() {
  const [image, setImage] = useState(null);
  const [analysisData, setAnalysisData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleUpload = async () => {
    if (!image) return;

    setLoading(true);
    setAnalysisData(null);
    setError("");

    // Get username from localStorage
    const username = localStorage.getItem("username");

    const formData = new FormData();
    const blob = await fetch(image).then((res) => res.blob());
    formData.append("file", blob, "label.jpg");

    try {
      // Add username as query parameter if available
      const url = username
        ? `${API_BASE_URL}/api/v1/label/analyze?username=${encodeURIComponent(username)}`
        : `${API_BASE_URL}/api/v1/label/analyze`;
      
      const response = await fetch(url, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Analysis failed with status ${response.status}`);
      }

      const data = await response.json();
      
      // Check if response has the expected structure
      if (data.summary && typeof data.summary === 'string' && data.summary.includes('{')) {
        // Try to parse summary as JSON if it's a string
        try {
          const parsed = JSON.parse(data.summary);
          setAnalysisData(parsed);
        } catch {
          setAnalysisData(data);
        }
      } else {
        setAnalysisData(data);
      }
    } catch (err) {
      console.error("Analysis error:", err);
      setError("Failed to analyze image. Please ensure the backend is running and try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setImage(null);
    setAnalysisData(null);
    setError("");
    setLoading(false);
  };

  const getRiskColor = (level) => {
    switch (level?.toLowerCase()) {
      case 'high': return '#dc2626';
      case 'medium': return '#f59e0b';
      case 'low': return '#10b981';
      default: return '#6b7280';
    }
  };

  const getRiskIcon = (level) => {
    switch (level?.toLowerCase()) {
      case 'high': return '⚠️';
      case 'medium': return '⚡';
      case 'low': return '✓';
      default: return 'ℹ️';
    }
  };

  return (
    <div className="home-container">
      <div className="header-section">
        <h1 className="title">🔬 Toxicology Analyzer</h1>
        <p className="subtitle">
          Capture a product label to get an instant AI-powered toxicology analysis.
          Our system identifies potential risks, allergens, and provides safety insights.
        </p>
      </div>

      <CameraCapture onCapture={setImage} />

      {image && !analysisData && !error && (
        <button 
          onClick={handleUpload} 
          className="btn upload"
          disabled={loading}
        >
          {loading ? "Analyzing..." : "🔍 Generate Report"}
        </button>
      )}

      {error && (
        <div className="report-container">
          <div className="error-message">
            <strong>⚠️ Error:</strong> {error}
            <button onClick={handleReset} className="btn secondary" style={{ marginTop: "1rem" }}>
              Try Again
            </button>
          </div>
        </div>
      )}

      {analysisData && (
        <div className="report-container fade-in">
          <div className="report-card">
            {/* Header */}
            <div className="report-header">
              <h2 className="report-title">📊 Analysis Report</h2>
              <span className={`confidence-badge confidence-${analysisData.confidence}`}>
                {analysisData.confidence?.toUpperCase()} CONFIDENCE
              </span>
            </div>

            {/* Product Name */}
            {analysisData.product_name && (
              <div className="report-section">
                <h3 className="section-title">Product</h3>
                <p className="product-name">{analysisData.product_name}</p>
              </div>
            )}

            {/* Summary */}
            {analysisData.summary && (
              <div className="report-section summary-section">
                <h3 className="section-title">Summary</h3>
                <p className="summary-text">{analysisData.summary}</p>
              </div>
            )}

            {/* User's Allergens Detected - CRITICAL WARNING */}
            {analysisData.user_allergens_detected && analysisData.user_allergens_detected.length > 0 && (
              <div className="report-section user-allergen-warning">
                <h3 className="section-title">🚨 CRITICAL: Your Allergens Detected!</h3>
                <p className="warning-text">
                  This product contains ingredients you are allergic to:
                </p>
                <div className="allergen-list">
                  {analysisData.user_allergens_detected.map((allergen, idx) => (
                    <span key={idx} className="user-allergen-badge">
                      🚨 {allergen}
                    </span>
                  ))}
                </div>
                <p className="warning-footer">
                  ⚠️ <strong>DO NOT CONSUME</strong> this product if you have these allergies.
                </p>
              </div>
            )}

            {/* General Allergens */}
            {analysisData.allergens && analysisData.allergens.length > 0 && (
              <div className="report-section allergen-section">
                <h3 className="section-title">⚠️ All Allergens Detected</h3>
                <div className="allergen-list">
                  {analysisData.allergens.map((allergen, idx) => (
                    <span key={idx} className="allergen-badge">
                      {allergen}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Toxicology Risks */}
            {analysisData.toxicology_risks && analysisData.toxicology_risks.length > 0 && (
              <div className="report-section">
                <h3 className="section-title">🧪 Toxicology Risks</h3>
                <div className="risks-list">
                  {analysisData.toxicology_risks.map((risk, idx) => (
                    <div key={idx} className="risk-card">
                      <div className="risk-header">
                        <div className="risk-title-row">
                          <span className="risk-icon">{getRiskIcon(risk.risk_level)}</span>
                          <h4 className="risk-ingredient">{risk.ingredient}</h4>
                        </div>
                        <span 
                          className="risk-level-badge"
                          style={{ backgroundColor: getRiskColor(risk.risk_level) }}
                        >
                          {risk.risk_level?.toUpperCase()}
                        </span>
                      </div>
                      <p className="risk-description">{risk.description}</p>
                      {risk.alternatives && risk.alternatives.length > 0 && (
                        <div className="alternatives">
                          <strong>Safer Alternatives:</strong>
                          <ul className="alternatives-list">
                            {risk.alternatives.map((alt, altIdx) => (
                              <li key={altIdx}>{alt}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Ingredients */}
            {analysisData.ingredients && analysisData.ingredients.length > 0 && (
              <div className="report-section">
                <h3 className="section-title">📝 Ingredients List</h3>
                <div className="ingredients-grid">
                  {analysisData.ingredients.map((ingredient, idx) => (
                    <div key={idx} className="ingredient-item">
                      {ingredient}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="report-actions">
              <button onClick={handleReset} className="btn primary">
                Analyze Another Product
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Made with Bob
