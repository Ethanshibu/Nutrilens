import { useState, useRef } from "react";
import CameraCapture from "../components/CameraCapture";
import "./home.css";

const API_BASE_URL = "http://localhost:8000";

export default function Home() {
  const [image, setImage] = useState(null);
  const [analysisData, setAnalysisData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [recommendations, setRecommendations] = useState(null);
  const [loadingRecommendations, setLoadingRecommendations] = useState(false);
  const [purchaseSuccess, setPurchaseSuccess] = useState(false);
  const [inputMethod, setInputMethod] = useState("camera");
  const fileInputRef = useRef(null);

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
    setRecommendations(null);
    setPurchaseSuccess(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    if (!validTypes.includes(file.type)) {
      setError('Please upload a valid image file (JPEG, PNG, or WebP)');
      return;
    }

    // Validate file size (10MB)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      setError('File size must be less than 10MB');
      return;
    }

    // Convert to data URL
    const reader = new FileReader();
    reader.onloadend = () => {
      setImage(reader.result);
      setError('');
    };
    reader.onerror = () => {
      setError('Failed to read file. Please try again.');
    };
    reader.readAsDataURL(file);
  };

  const handleClearImage = () => {
    setImage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleMarkAsPurchased = async () => {
    const username = localStorage.getItem("username");
    if (!username) {
      setError("Please sign in to mark products as purchased");
      return;
    }

    if (!analysisData) return;

    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/recommendations/purchase`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: username,
          product_name: analysisData.product_name || "Unknown Product",
          analysis_data: analysisData,
          image_url: image
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to mark as purchased");
      }

      setPurchaseSuccess(true);
      setTimeout(() => setPurchaseSuccess(false), 3000);
    } catch (err) {
      console.error("Purchase marking error:", err);
      setError("Failed to mark product as purchased");
    }
  };

  const handleGetRecommendations = async () => {
    const username = localStorage.getItem("username");
    if (!username) {
      setError("Please sign in to get recommendations");
      return;
    }

    setLoadingRecommendations(true);
    setError("");

    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/recommendations/suggest`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: username,
          current_product: analysisData?.product_name || null,
          limit: 5
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to get recommendations");
      }

      const data = await response.json();
      setRecommendations(data);
    } catch (err) {
      console.error("Recommendations error:", err);
      setError("Failed to get recommendations. Please try again.");
    } finally {
      setLoadingRecommendations(false);
    }
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
        <h1 className="title">Toxicology Analyzer</h1>
        <p className="subtitle">
          Capture or upload a product label to get an instant AI-powered toxicology analysis.
          Our system identifies potential risks, allergens, and provides safety insights.
        </p>
      </div>

      {/* Input Method Selector */}
      <div className="input-method-selector">
        <button
          className={`method-tab ${inputMethod === "camera" ? "active" : ""}`}
          onClick={() => setInputMethod("camera")}
        >
          📷 Camera
        </button>
        <button
          className={`method-tab ${inputMethod === "upload" ? "active" : ""}`}
          onClick={() => setInputMethod("upload")}
        >
          📁 Upload File
        </button>
      </div>

      {/* Conditional Rendering: Camera or File Upload */}
      {inputMethod === "camera" ? (
        <CameraCapture onCapture={setImage} />
      ) : (
        <div className="file-upload-container">
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/jpg"
            onChange={handleFileUpload}
            style={{ display: 'none' }}
            ref={fileInputRef}
          />
          {!image ? (
            <div className="upload-area" onClick={() => fileInputRef.current?.click()}>
              <div className="upload-icon">📁</div>
              <p className="upload-text">Click to upload or drag and drop</p>
              <p className="upload-hint">JPEG, PNG, or WebP (max 10MB)</p>
            </div>
          ) : (
            <div className="preview-section">
              <img src={image} alt="Uploaded" className="preview-img" />
              <div className="btn-group">
                <button onClick={handleClearImage} className="btn secondary">
                  Choose Different Image
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {image && !analysisData && !error && (
        <button
          onClick={handleUpload}
          className="btn upload"
          disabled={loading}
        >
          {loading ? "Analyzing..." : "Generate Report"}
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
              {purchaseSuccess && (
                <div className="success-message">
                  Product marked as purchased!
                </div>
              )}
              <div className="action-buttons">
                <button onClick={handleMarkAsPurchased} className="btn action-btn secondary">
                  Mark as Purchased
                </button>
                <button
                  onClick={handleGetRecommendations}
                  className="btn action-btn secondary"
                  disabled={loadingRecommendations}
                >
                  {loadingRecommendations ? "Loading..." : "Get Safer Alternatives"}
                </button>
                <button onClick={handleReset} className="btn action-btn primary">
                  Analyze Another Product
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Recommendations Section - Amazon Products */}
      {recommendations && (
        <div className="report-container fade-in" style={{ marginTop: "2rem" }}>
          <div className="report-card">
            <div className="report-header">
              <h2 className="report-title">🛒 Amazon Product Recommendations</h2>
              <span className="confidence-badge confidence-high">
                {recommendations.total_found} FOUND
              </span>
            </div>

            {recommendations.user_allergens && recommendations.user_allergens.length > 0 && (
              <div className="report-section">
                <p className="summary-text">
                  ✅ Filtered to exclude your allergens: <strong>{recommendations.user_allergens.join(", ")}</strong>
                </p>
              </div>
            )}

            <div className="report-section">
              <div className="recommendations-list">
                {recommendations.recommendations.map((product, idx) => (
                  <div key={idx} className="recommendation-card amazon-product-card">
                    <div style={{ display: "flex", gap: "1rem", alignItems: "flex-start" }}>
                      {/* Product Image */}
                      {product.thumbnail && (
                        <div style={{ flexShrink: 0 }}>
                          <img
                            src={product.thumbnail}
                            alt={product.title}
                            style={{
                              width: "120px",
                              height: "120px",
                              objectFit: "contain",
                              borderRadius: "8px",
                              border: "1px solid #e5e7eb"
                            }}
                          />
                        </div>
                      )}
                      
                      {/* Product Details */}
                      <div style={{ flex: 1 }}>
                        <h4 className="recommendation-title">
                          <a
                            href={product.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ color: "#2563eb", textDecoration: "none", fontWeight: "600" }}
                          >
                            {product.title}
                          </a>
                        </h4>
                        
                        {/* Price and Rating */}
                        <div style={{ display: "flex", gap: "1rem", alignItems: "center", marginTop: "0.5rem" }}>
                          {product.price && (
                            <span style={{ fontSize: "1.25rem", fontWeight: "bold", color: "#059669" }}>
                              {product.price}
                            </span>
                          )}
                          {product.rating > 0 && (
                            <span style={{ fontSize: "0.875rem", color: "#f59e0b" }}>
                              ⭐ {product.rating} ({product.ratings_total || 0} reviews)
                            </span>
                          )}
                          {product.is_prime && (
                            <span style={{
                              fontSize: "0.75rem",
                              backgroundColor: "#00a8e1",
                              color: "white",
                              padding: "2px 8px",
                              borderRadius: "4px",
                              fontWeight: "600"
                            }}>
                              Prime
                            </span>
                          )}
                        </div>

                        {/* Description */}
                        {product.description && (
                          <p className="recommendation-content" style={{ marginTop: "0.5rem" }}>
                            {product.description}
                          </p>
                        )}

                        {/* Delivery Info */}
                        {product.delivery && (
                          <p style={{ fontSize: "0.875rem", color: "#6b7280", marginTop: "0.5rem" }}>
                            🚚 {product.delivery}
                          </p>
                        )}

                        {/* Recommendation Reason */}
                        <div style={{
                          marginTop: "0.75rem",
                          padding: "0.5rem",
                          backgroundColor: "#f0fdf4",
                          borderRadius: "6px",
                          fontSize: "0.875rem",
                          color: "#059669"
                        }}>
                          💡 {product.reason}
                        </div>

                        {/* Buy Button */}
                        <div style={{ marginTop: "0.75rem" }}>
                          <a
                            href={product.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              display: "inline-block",
                              padding: "0.5rem 1rem",
                              backgroundColor: "#ff9900",
                              color: "white",
                              textDecoration: "none",
                              borderRadius: "6px",
                              fontWeight: "600",
                              fontSize: "0.875rem"
                            }}
                          >
                            View on Amazon →
                          </a>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {recommendations.source && (
              <div className="report-section" style={{ textAlign: "center", fontSize: "0.875rem", color: "#6b7280" }}>
                Powered by {recommendations.source}
              </div>
            )}

            <div className="report-actions">
              <button onClick={() => setRecommendations(null)} className="btn secondary">
                Close Recommendations
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Made with Bob
