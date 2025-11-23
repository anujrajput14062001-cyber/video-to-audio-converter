import express from "express";
import multer from "multer";
import cors from "cors";
import fs from "fs";
import path from "path";
import ytdl from "@distube/ytdl-core";

const app = express();
app.use(cors());
app.use(express.static("public"));
app.use(express.json());

const upload = multer({ dest: "uploads/" });

// Serve index.html
app.get("/", (req, res) => {
  res.sendFile(path.join(process.cwd(), "index.html"));
});

// -------------------------
// NORMAL VIDEO UPLOAD → AUDIO
// -------------------------
app.post("/upload", upload.single("video"), async (req, res) => {
  try {
    const format = req.body.format || "mp3";
    const inputPath = req.file.path;
    const outputPath = `output/${req.file.filename}.${format}`;

    const { exec } = await import("child_process");
    exec(`ffmpeg -i ${inputPath} ${outputPath}`, (error) => {
      fs.unlinkSync(inputPath);

      if (error) {
        return res.status(500).json({ error: "Conversion failed" });
      }

      res.json({
        download: `/download/${req.file.filename}.${format}`,
      });
    });
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

// -------------------------
// YOUTUBE URL → MP3
// -------------------------
app.post("/youtube", async (req, res) => {
  try {
    const { url } = req.body;
    if (!ytdl.validateURL(url)) {
      return res.status(400).json({ error: "Invalid YouTube URL" });
    }

    const id = Date.now();
    const output = `output/${id}.mp3`;

    const stream = ytdl(url, { filter: "audioonly" });
    const ffmpeg = await import("fluent-ffmpeg");

    ffmpeg.default(stream)
      .audioBitrate(128)
      .save(output)
      .on("end", () => {
        res.json({ download: `/download/${id}.mp3` });
      })
      .on("error", () => {
        res.status(500).json({ error: "Conversion failed" });
      });

  } catch (e) {
    res.status(500).json({ error: "YouTube processing error" });
  }
});

// -------------------------

app.get("/download/:file", (req, res) => {
  const filePath = path.join("output", req.params.file);
  if (!fs.existsSync(filePath)) return res.status(404).send("File not found");
  res.download(filePath);
});

app.listen(10000, () =>
  console.log("🚀 Server running on PORT 10000")
);
