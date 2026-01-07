import { useRef, useState } from "react";
import Webcam from "react-webcam";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export default function CameraCapture({ onCapture }) {
  const webcamRef = useRef(null);
  const [capturedImage, setCapturedImage] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const capturePhoto = () => {
    const imageSrc = webcamRef.current.getScreenshot();
    setCapturedImage(imageSrc);
    setAnalysis(null);
    setError(null);
    onCapture(imageSrc);
  };

  const analyzeImage = async () => {
    if (!capturedImage) return;

    setLoading(true);
    setError(null);

    try {
      // Convert base64 data URL to blob
      const response = await fetch(capturedImage);
      const blob = await response.blob();

      // Create FormData and append the image
      const formData = new FormData();
      formData.append("file", blob, "label.png");

      // Send to backend
      const analysisResponse = await fetch(`${API_BASE_URL}/api/v1/label/analyze`, {
        method: "POST",
        body: formData,
      });

      if (!analysisResponse.ok) {
        throw new Error(
          `Analysis failed: ${analysisResponse.status} ${analysisResponse.statusText}`
        );
      }

      const result = await analysisResponse.json();
      setAnalysis(result);
    } catch (err) {
      console.error("Error analyzing image:", err);
      setError(err.message || "Failed to analyze image. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="camera-container">
      {!capturedImage ? (
        <>
          <Webcam
            ref={webcamRef}
            screenshotFormat="image/jpeg"
            videoConstraints={{
              facingMode: "environment", // rear camera on phones
            }}
            className="camera-feed"
          />
          <button onClick={capturePhoto} className="btn">
            Capture
          </button>
        </>
      ) : (
        <div className="preview-section">
          <img src={capturedImage} alt="Captured" className="preview-img" />

          {error && (
            <div className="error-message" style={{ color: "red", marginTop: "10px" }}>
              ⚠️ {error}
            </div>
          )}

          {analysis && (
            <div className="analysis-result" style={{ marginTop: "20px", padding: "10px", border: "1px solid #ccc", borderRadius: "5px" }}>
              <h3>📋 Label Analysis</h3>

              {analysis.product_name && (
                <div style={{ marginBottom: "10px" }}>
                  <strong>Product:</strong> {analysis.product_name}
                </div>
              )}

              {analysis.nutrition_facts && (
                <div style={{ marginBottom: "10px" }}>
                  <strong>Nutrition Facts:</strong>
                  <ul style={{ marginTop: "5px", paddingLeft: "20px" }}>
                    {analysis.nutrition_facts.calories && (
                      <li>Calories: {analysis.nutrition_facts.calories}</li>
                    )}
                    {analysis.nutrition_facts.total_fat && (
                      <li>Total Fat: {analysis.nutrition_facts.total_fat}</li>
                    )}
                    {analysis.nutrition_facts.sodium && (
                      <li>Sodium: {analysis.nutrition_facts.sodium}</li>
                    )}
                    {analysis.nutrition_facts.total_sugars && (
                      <li>Total Sugars: {analysis.nutrition_facts.total_sugars}</li>
                    )}
                  </ul>
                </div>
              )}

              {analysis.ingredients && (
                <div style={{ marginBottom: "10px" }}>
                  <strong>Ingredients:</strong>
                  <p style={{ fontSize: "0.9em", marginTop: "5px" }}>{analysis.ingredients}</p>
                </div>
              )}

              {analysis.allergens && analysis.allergens.length > 0 && (
                <div style={{ marginBottom: "10px" }}>
                  <strong>⚠️ Allergens:</strong>
                  <ul style={{ marginTop: "5px", paddingLeft: "20px", color: "red" }}>
                    {analysis.allergens.map((allergen, idx) => (
                      <li key={idx}>{allergen}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          <div className="btn-group" style={{ marginTop: "15px", display: "flex", gap: "10px" }}>
            <button
              onClick={() => {
                setCapturedImage(null);
                setAnalysis(null);
                setError(null);
              }}
              className="btn secondary"
              disabled={loading}
            >
              Retake
            </button>

            {!analysis && (
              <button
                onClick={analyzeImage}
                className="btn"
                disabled={loading}
                style={{ opacity: loading ? 0.6 : 1 }}
              >
                {loading ? "⏳ Analyzing..." : "Analyze Label"}
              </button>
            )}

            {analysis && (
              <button
                onClick={() => {
                  setCapturedImage(null);
                  setAnalysis(null);
                  setError(null);
                }}
                className="btn"
              >
                New Image
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
