import express from "express";
import cors from "cors";
import multer from "multer";
import fs from "fs";
import ytdl from "ytdl-core";
import fluentFfmpeg from "fluent-ffmpeg";

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("output"));
app.use(express.static("uploads"));

// Ensure required folders exist
if (!fs.existsSync("uploads")) fs.mkdirSync("uploads");
if (!fs.existsSync("output")) fs.mkdirSync("output");

// Multer storage for video uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) =>
    cb(null, `${Date.now()}-${file.originalname.replace(/\s/g, "")}`)
});

const upload = multer({ storage });

// =============================
//  1) LOCAL VIDEO → MP3
// =============================
app.post("/upload", upload.single("video"), (req, res) => {
  try {
    const inputPath = req.file.path;
    const output = `output/${Date.now()}.mp3`;

    fluentFfmpeg(inputPath)
      .audioCodec("libmp3lame")
      .on("end", () => {
        fs.unlinkSync(inputPath); // remove original video
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

// =============================
//  2) YOUTUBE → MP3 (RENDER SAFE)
// =============================
app.post("/youtube", async (req, res) => {
  try {
    const url = req.body.url;

    if (!ytdl.validateURL(url))
      return res.json({ error: "Invalid YouTube URL" });

    const tempFile = `uploads/${Date.now()}.mp4`;
    const output = `output/${Date.now()}.mp3`;

    // STEP 1: Download best audio to temporary file
    const audioStream = ytdl(url, { quality: "highestaudio" });
    const writeStream = fs.createWriteStream(tempFile);

    audioStream.pipe(writeStream);

    writeStream.on("finish", () => {
      // STEP 2: Convert the downloaded audio
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

// =============================
//  HOME ROUTE
// =============================
app.get("/", (req, res) => {
  res.send("Video/YouTube to MP3 Converter Running ✔");
});

// =============================
//  START SERVER
// =============================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on PORT ${PORT}`));
