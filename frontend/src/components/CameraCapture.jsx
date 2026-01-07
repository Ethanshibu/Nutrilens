import { useRef, useState } from "react";
import Webcam from "react-webcam";

export default function CameraCapture({ onCapture }) {
  const webcamRef = useRef(null);
  const [capturedImage, setCapturedImage] = useState(null);

  const capturePhoto = () => {
    const imageSrc = webcamRef.current.getScreenshot();
    setCapturedImage(imageSrc);
    onCapture(imageSrc);
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
          <div className="btn-group">
            <button
              onClick={() => setCapturedImage(null)}
              className="btn secondary"
            >
              Retake
            </button>
          </div>
        </div>
      )}
    </div>
  );
}