import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import cors from "cors";
import fluentFfmpeg from "fluent-ffmpeg";
import ffmpegPath from "ffmpeg-static";

const app = express();

// Enable CORS
app.use(cors());

// Serve index.html and all static frontend files
app.use(express.static(process.cwd()));   // FIX for blank page
app.use(express.static("output"));        // Serve converted audio

// Setup FFmpeg path
fluentFfmpeg.setFfmpegPath(ffmpegPath);

// Make folders if not exist
if (!fs.existsSync("uploads")) fs.mkdirSync("uploads");
if (!fs.existsSync("output")) fs.mkdirSync("output");

// Multer storage setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) =>
    cb(null, Date.now() + path.extname(file.originalname))
});

const upload = multer({
  storage,
  limits: { fileSize: 200 * 1024 * 1024 } // 200MB
});

// --------------------------------------
//  UPLOAD + CONVERT
// --------------------------------------
app.post("/upload", upload.single("video"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No video uploaded" });

  const inputPath = req.file.path;
  const format = req.body.format || "mp3";
  const outputName = `${Date.now()}.${format}`;
  const outputPath = `output/${outputName}`;

  // Choose codec
  let codec = "libmp3lame";
  if (format === "wav") codec = "pcm_s16le";
  if (format === "aac") codec = "aac";
  if (format === "ogg") codec = "libvorbis";

  fluentFfmpeg(inputPath)
    .noVideo()
    .audioCodec(codec)
    .on("end", () => {
      fs.unlinkSync(inputPath); // delete uploaded video

      // FIXED: correct download link
      res.json({
        success: true,
        download: `/output/${outputName}`
      });
    })
    .on("error", (err) => {
      console.error("FFmpeg Error:", err);
      res.status(500).json({ error: "Conversion failed", details: err.message });
    })
    .save(outputPath);
});

// --------------------------------------
//  SERVE FRONTEND
// --------------------------------------
app.get("/", (req, res) => {
  res.sendFile(path.join(process.cwd(), "index.html"));
});

// --------------------------------------
//  START SERVER
// --------------------------------------
const PORT = process.env.PORT || 5000;
app.listen(PORT, () =>
  console.log(`🚀 Server running on port ${PORT}`)
);
