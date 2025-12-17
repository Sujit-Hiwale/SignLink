import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import ffmpegPath from "ffmpeg-static";
import ffmpeg from "fluent-ffmpeg";
import fs from "fs";
import { pipeline } from "@xenova/transformers";
import * as WavDecoder from "wav-decoder";

const app = express();
app.use(cors());
app.use(bodyParser.json({ limit: "50mb" }));

// Load Whisper
const transcriber = await pipeline(
  "automatic-speech-recognition",
  "Xenova/whisper-tiny.en"
);

app.post("/recognize", async (req, res) => {
  try {
    const base64 = req.body.audio.split(",")[1];
    fs.writeFileSync("temp.webm", Buffer.from(base64, "base64"));

    // Convert WEBM → WAV (mono, 16kHz)
    await new Promise((resolve, reject) => {
      ffmpeg("temp.webm")
        .setFfmpegPath(ffmpegPath)
        .audioChannels(1)
        .audioFrequency(16000)
        .format("wav")
        .save("temp.wav")
        .on("end", resolve)
        .on("error", reject);
    });

    // Read WAV file
    const wavBuffer = fs.readFileSync("temp.wav");

    // Decode WAV → PCM Float32Array
    const decoded = await WavDecoder.decode(wavBuffer);
    const floatData = decoded.channelData[0]; // mono float32 PCM

    // Transcribe
    const result = await transcriber(floatData);

    res.json({ text: result.text });
  } catch (err) {
    console.error(err);
    res.json({ text: "⚠️ Server error: " + err.message });
  }
});

app.listen(5000, () =>
  console.log("Server running on port 5000")
);
