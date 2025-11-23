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
app.use(express.static("public"));

const upload = multer({ dest: "uploads/" });

// =======================================
// ROOT CHECK
// =======================================
app.get("/", (req, res) => {
  res.send("Video/YouTube to MP3 Converter Running ✔️");
});

// =======================================
// YOUTUBE → MP3 FIXED
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

    const stream = ytdl(url, {
      quality: "highestaudio",
      requestOptions: {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36",
          "Accept-Language": "en-US,en;q=0.9",
        },
      },
      highWaterMark: 1 << 25, // 32 MB
    });

    ffmpeg(stream)
      .audioCodec("libmp3lame")
      .save(outputPath)
      .on("end", () => {
        return res.json({
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
      console.error(err);
      res.status(500).json({ error: "Conversion failed" });
    })
    .run();
});

// =======================================
app.listen(10000, () => console.log("Server running on PORT 10000"));
