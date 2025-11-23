import express from "express";
import cors from "cors";
import multer from "multer";
import fs from "fs";
import ytdl from "ytdl-core";
import fluentFfmpeg from "fluent-ffmpeg";
import path from "path";
import { fileURLToPath } from "url";

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Path helpers for ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Serve static frontend + output files
app.use(express.static(__dirname));
app.use(express.static("output"));
app.use(express.static("uploads"));

// Ensure required folders exist
if (!fs.existsSync("uploads")) fs.mkdirSync("uploads");
if (!fs.existsSync("output")) fs.mkdirSync("output");

// Multer storage (for video upload)
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) =>
    cb(null, `${Date.now()}-${file.originalname.replace(/\s/g, "")}`)
});

const upload = multer({ storage });

/* ===========================================
    1) LOCAL VIDEO → MP3
=========================================== */
app.post("/upload", upload.single("video"), (req, res) => {
  try {
    const inputPath = req.file.path;
    const output = `output/${Date.now()}.mp3`;

    fluentFfmpeg(inputPath)
      .audioCodec("libmp3lame")
      .on("end", () => {
        fs.unlinkSync(inputPath); // delete uploaded video
        res.json({ download: `/${output}` });
      })
      .on("error", (err) => {
        console.error("FFmpeg video error:", err);
        res.status(500).json({ error: "Conversion error" });
      })
      .save(output);

  } catch (error) {
    console.error("Upload error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

/* ===========================================
    2) YOUTUBE → MP3 (SAFE FOR RENDER)
=========================================== */
app.post("/youtube", async (req, res) => {
  try {
    const url = req.body.url;

    if (!ytdl.validateURL(url))
      return res.json({ error: "Invalid YouTube URL" });

    const tempFile = `uploads/${Date.now()}.mp4`;
    const output = `output/${Date.now()}.mp3`;

    // Step 1: Download YouTube audio
    const audioStream = ytdl(url, { quality: "highestaudio" });
    const writeStream = fs.createWriteStream(tempFile);

    audioStream.pipe(writeStream);

    writeStream.on("finish", () => {
      // Step 2: Convert to MP3
      fluentFfmpeg(tempFile)
        .audioCodec("libmp3lame")
        .on("end", () => {
          if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
          res.json({ download: `/${output}` });
        })
        .on("error", (err) => {
          console.error("FFmpeg YT error:", err);
          res.json({ error: "Conversion failed" });
        })
        .save(output);
    });

    writeStream.on("error", () => {
      return res.json({ error: "YouTube download failed" });
    });

  } catch (error) {
    console.error("YT Fatal error:", error);
    res.json({ error: "Server error" });
  }
});

/* ===========================================
    3) SERVE index.html
=========================================== */
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

/* ===========================================
     START SERVER
=========================================== */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
  console.log(`Server running on PORT ${PORT}`)
);
