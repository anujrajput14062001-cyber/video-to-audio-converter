import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import cors from "cors";
import fluentFfmpeg from "fluent-ffmpeg";
import ffmpegPath from "ffmpeg-static";

const app = express();

// Enable CORS + Static File Serving
app.use(cors());

// 🔥 FIX for BLANK PAGE on Render (serve root folder)
app.use(express.static(process.cwd()));

// Serve converted audio files
app.use(express.static("output"));

// Setup FFmpeg static path
fluentFfmpeg.setFfmpegPath(ffmpegPath);

// Create upload & output folders if missing
if (!fs.existsSync("uploads")) fs.mkdirSync("uploads");
if (!fs.existsSync("output")) fs.mkdirSync("output");

// Multer Storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) =>
    cb(null, Date.now() + path.extname(file.originalname))
});

const upload = multer({
  storage,
  limits: { fileSize: 200 * 1024 * 1024 } // 200MB
});

// ----------------------------------------
// 🔥 Video Upload & Convert Route
// ----------------------------------------
app.post("/upload", upload.single("video"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No video uploaded!" });
  }

  const inputPath = req.file.path;
  const selectedFormat = req.body.format || "mp3";
  const outputName = `${Date.now()}.${selectedFormat}`;
  const outputPath = `output/${outputName}`;

  // Audio codecs based on selected output
  let audioCodec = "libmp3lame";

  switch (selectedFormat) {
    case "wav":
      audioCodec = "pcm_s16le";
      break;
    case "aac":
      audioCodec = "aac";
      break;
    case "ogg":
      audioCodec = "libvorbis";
      break;
    default:
      audioCodec = "libmp3lame";
  }

  fluentFfmpeg(inputPath)
    .noVideo()
    .audioCodec(audioCodec)
    .on("end", () => {
      fs.unlinkSync(inputPath); // Delete temp video
      res.json({
        success: true,
        download: `/${outputName}`
      });
    })
    .on("error", (err) => {
      console.error("FFmpeg error:", err);
      res.status(500).json({ error: "Conversion failed", details: err.message });
    })
    .save(outputPath);
});

// ----------------------------------------
// 🔥 Serve index.html (Frontend)
// ----------------------------------------
app.get("/", (req, res) => {
  res.sendFile(path.join(process.cwd(), "index.html"));
});

// ----------------------------------------
// Start server (Render uses PORT env var)
// ----------------------------------------
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
