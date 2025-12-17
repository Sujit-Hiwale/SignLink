import React, { useRef, useState, useEffect } from "react";

export default function ASLRecognizer({ onPrediction }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const intervalRef = useRef(null);

  const [isScanning, setIsScanning] = useState(false);

  const startCamera = async () => {
    try {
      const video = videoRef.current;
      if (!video) return;

      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      video.srcObject = stream;

      await new Promise((resolve) => {
        video.onloadedmetadata = () => resolve();
      });

      await video.play();
    } catch (err) {
      console.error("Camera error:", err);
    }
  };

  // Repeated scanning function
  const scanFrame = async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(async (blob) => {
      if (!blob) return;

      try {
        const formData = new FormData();
        formData.append("image", blob, "frame.jpg");

        const response = await fetch("http://localhost:8000/recognize", {
          method: "POST",
          body: formData,
        });

        const result = await response.json();
        if (!result.error) {
          onPrediction(result);
        }
      } catch (err) {
        console.error("Recognition request failed:", err);
      }
    }, "image/jpeg");
  };

  const startScanning = () => {
    if (isScanning) return;
    setIsScanning(true);

    intervalRef.current = setInterval(() => {
      scanFrame();
    }, 1000); // scan every 1 second
  };

  const stopScanning = () => {
    setIsScanning(false);
    clearInterval(intervalRef.current);
  };

  useEffect(() => {
    startCamera();
    return () => clearInterval(intervalRef.current);
  }, []);

  return (
    <div>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        width={320}
        height={240}
        style={{ transform: "scaleX(-1)" }}
      />

      <canvas
        ref={canvasRef}
        width={320}
        height={240}
        style={{ display: "none" }}
      />

      <div style={{ marginTop: "10px" }}>
        {!isScanning ? (
          <button onClick={startScanning}>Start Scanning</button>
        ) : (
          <button onClick={stopScanning}>Stop Scanning</button>
        )}
      </div>
    </div>
  );
}
