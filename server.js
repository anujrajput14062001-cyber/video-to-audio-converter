import express from "express";
import cors from "cors";
import multer from "multer";
import fs from "fs";
import path from "path";
import ffmpeg from "fluent-ffmpeg";
import ytdl from "ytdl-core";

const app = express();
app.use(cors());
app.use(express.json());

// Serve output files
app.use("/output", express.static("output"));

// Ensure required folders exist
if (!fs.existsSync("uploads")) fs.mkdirSync("uploads");
if (!fs.existsSync("output")) fs.mkdirSync("output");

const upload = multer({ dest: "uploads/" });

// =======================================
// ROOT CHECK
// =======================================
app.get("/", (req, res) => {
  res.send("Video/YouTube to MP3 Converter Running ✔️");
});

// =======================================
// YOUTUBE → MP3 FIXED (Render compatible)
// =======================================
app.post("/youtube", async (req, res) => {
  try {
    const { url } = req.body;

    if (!ytdl.validateURL(url)) {
      return res.status(400).json({ error: "Invalid YouTube URL" });
    }

    const info = await ytdl.getInfo(url);
    const title = info.videoDetails.title.replace(/[^a-zA-Z0-9]/g, "_");
    const outputPath = `output/${title}.mp3`;

    console.log("Downloading:", title);

    const stream = ytdl(url, {
      quality: "highestaudio",
      filter: "audioonly",
      highWaterMark: 1 << 25, // 32MB buffer
      requestOptions: {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36",
          "Accept-Language": "en-US,en;q=0.9",
          "Accept": "*/*",
          "Connection": "keep-alive",
          "Referer": "https://www.youtube.com/",
          "Origin": "https://www.youtube.com"
        }
      }
    });

    ffmpeg(stream)
      .audioCodec("libmp3lame")
      .format("mp3")
      .save(outputPath)
      .on("end", () => {
        console.log("Converted:", outputPath);
        res.json({
          download: `https://video-to-audio-converter-2.onrender.com/${outputPath}`,
        });
      })
      .on("error", (err) => {
        console.error("FFmpeg Error:", err);
        res.status(500).json({ error: "Conversion failed" });
      });

  } catch (err) {
    console.error("YouTube Error:", err);
    res.status(500).json({ error: "YouTube download failed" });
  }
});

// =======================================
// VIDEO FILE → MP3
// =======================================
app.post("/upload", upload.single("video"), (req, res) => {
  const file = req.file;
  const outPath = `output/${file.filename}.mp3`;

  ffmpeg(file.path)
    .output(outPath)
    .on("end", () => {
      fs.unlinkSync(file.path);
      res.json({
        download: `https://video-to-audio-converter-2.onrender.com/${outPath}`,
      });
    })
    .on("error", (err) => {
      console.error("Upload Convert Error:", err);
      res.status(500).json({ error: "Conversion failed" });
    })
    .run();
});

// =======================================
// START SERVER
// =======================================
app.listen(10000, () => console.log("Server running on PORT 10000"));
