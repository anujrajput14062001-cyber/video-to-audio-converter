import express from "express";
import multer from "multer";
import cors from "cors";
import ytdl from "@distube/ytdl-core";
import fs from "fs";
import path from "path";

const app = express();
const PORT = process.env.PORT || 10000;
const __dirname = path.resolve();

app.use(cors());
app.use(express.static(__dirname)); // IMPORTANT!! Serves index.html

// 🟦 Fix: Home route must serve index.html (not text)
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// ------------------ VIDEO UPLOAD (LOCAL VIDEO TO MP3) ------------------
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "./uploads/"),
  filename: (req, file, cb) =>
    cb(null, Date.now() + "-" + file.originalname),
});

const upload = multer({ storage });

app.post("/upload", upload.single("video"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });

  const input = req.file.path;
  const output = `output/${Date.now()}.mp3`;

  const ffmpeg = require("fluent-ffmpeg");
  ffmpeg(input)
    .save(output)
    .on("end", () => {
      res.json({ download: "/" + output });
    })
    .on("error", () => res.status(500).json({ error: "Conversion failed" }));
});

// ------------------ YOUTUBE TO MP3 ------------------
app.post("/yt", async (req, res) => {
  try {
    const { url } = req.query;
    if (!ytdl.validateURL(url))
      return res.status(400).json({ error: "Invalid YouTube URL" });

    const id = Date.now();
    const filePath = `output/${id}.mp3`;

    ytdl(url, { filter: "audioonly" })
      .pipe(fs.createWriteStream(filePath))
      .on("finish", () => res.json({ download: "/" + filePath }))
      .on("error", () => res.status(500).json({ error: "Download failed" }));
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// ------------------ START SERVER ------------------
app.listen(PORT, () => {
  console.log("Server running on PORT", PORT);
});
