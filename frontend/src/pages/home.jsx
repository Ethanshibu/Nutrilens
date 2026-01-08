import { useState } from "react";
import CameraCapture from "../components/CameraCapture";
import "./home.css";

const API_BASE_URL = "http://localhost:8000";

export default function Home() {
  const [image, setImage] = useState(null); // base64 string
  const [message, setMessage] = useState("");

  const handleUpload = async () => {
    if (!image) return;

    setMessage("Analyzing image...");

    const formData = new FormData();
    const blob = await fetch(image).then((res) => res.blob());
    formData.append("file", blob, "label.jpg");

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/v1/label/analyze`,
        {
          method: "POST",
          body: formData,
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();

      // Display something meaningful from Gemini output
      if (!data) {
        setMessage("Model returned no data. Try again with clearer image.");
      } else if (data.summary) {
        setMessage(data.summary);
      } else {
        setMessage(JSON.stringify(data, null, 2));
      }


    } catch (err) {
      console.error(err);
      setMessage("Error analyzing image.");
    }
  };

  return (
    <div className="home-container">
      <h1 className="title">Toxicology Analyzer</h1>
      <p className="subtitle">
        Capture a product label to get an instant toxicology report.
      </p>

      <CameraCapture onCapture={setImage} />

      {image && (
        <button onClick={handleUpload} className="btn upload">
          Generate Report
        </button>
      )}

      {message && (
        <div className="report-container">
          <pre className="message">{message}</pre>
        </div>
      )}

    </div>
  );
}
