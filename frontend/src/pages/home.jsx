import { useState } from "react";
import CameraCapture from "../components/CameraCapture";
import "./home.css";

export default function Home() {
  const [image, setImage] = useState(null);
  const [message, setMessage] = useState("");

  const handleUpload = async () => {
    if (!image) return;

    setMessage("Analyzing image...");

    // Later: send to FastAPI endpoint that performs OCR + LLM analysis
    const formData = new FormData();
    const blob = await fetch(image).then((res) => res.blob());
    formData.append("file", blob, "label.jpg");

    try {
      const response = await fetch("http://localhost:8000/analyze", {
        method: "POST",
        body: formData,
      });
      const data = await response.json();
      setMessage(data.report || "Analysis complete!");
    } catch (err) {
      setMessage(err, "Error uploading image.");
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

      {message && <p className="message">{message}</p>}
    </div>
  );
}
