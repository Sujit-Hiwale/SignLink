import { useState } from "react";

function Deaf() {
  const [result, setResult] = useState("");
  let mediaRecorder;
  let chunks = [];
  let stream;

  const startRecording = async () => {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorder = new MediaRecorder(stream);
    chunks = [];

    mediaRecorder.ondataavailable = e => {
      if (e.data.size > 0) chunks.push(e.data);
    };

    mediaRecorder.onstop = async () => {
      const blob = new Blob(chunks, { type: "audio/webm" });
      const reader = new FileReader();
      reader.readAsDataURL(blob);

      reader.onloadend = async () => {
        try {
          const response = await fetch("http://localhost:5000/recognize", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ audio: reader.result })
          });

          const data = await response.json();
          setResult("🗣️ You said: " + data.text);
        } catch (err) {
          console.error(err);
          setResult("⚠️ Error recognizing audio");
        }
      };
    };

    mediaRecorder.start();
    window.mediaRecorder = mediaRecorder; // store globally
  };

  const stopRecording = () => {
    if (window.mediaRecorder && window.mediaRecorder.state !== "inactive") {
      window.mediaRecorder.stop();
    }
  };

  return (
    <div style={{ padding: "20px" }}>
      <h1>🎤 Speak Something</h1>
      <button onClick={startRecording}>Start Recording</button>
      <button onClick={stopRecording}>Stop Recording</button>
      <p>{result}</p>
    </div>
  );
}

export default Deaf;
