import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import cors from "cors";
import fluentFfmpeg from "fluent-ffmpeg";
import ffmpegPath from "ffmpeg-static";
import ytdl from "ytdl-core";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(express.json());
app.use(cors());
app.use(express.static(__dirname));
app.use(express.static(path.join(__dirname, "output")));

fluentFfmpeg.setFfmpegPath(ffmpegPath);

if (!fs.existsSync("uploads")) fs.mkdirSync("uploads");
if (!fs.existsSync("output")) fs.mkdirSync("output");

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) =>
    cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage });

/* UPLOAD VIDEO → AUDIO */
app.post("/upload", upload.single("video"), (req, res) => {
  if (!req.file) return res.json({ error: "No video uploaded" });

  const input = req.file.path;
  const format = req.body.format || "mp3";
  const output = `output/${Date.now()}.${format}`;

  let codec = "libmp3lame";
  if (format === "wav") codec = "pcm_s16le";
  if (format === "aac") codec = "aac";
  if (format === "ogg") codec = "libvorbis";

  fluentFfmpeg(input)
    .audioCodec(codec)
    .on("end", () => {
      fs.unlinkSync(input);
      res.json({ download: `/${output}` });
    })
    .on("error", () => res.json({ error: "Conversion failed" }))
    .save(output);
});

/* YOUTUBE → MP3 */
app.post("/youtube", async (req, res) => {
  const url = req.body.url;
  if (!ytdl.validateURL(url))
    return res.json({ error: "Invalid YouTube URL" });

  const output = `output/${Date.now()}.mp3`;

  fluentFfmpeg(ytdl(url, { quality: "highestaudio" }))
    .audioCodec("libmp3lame")
    .on("end", () => res.json({ download: `/${output}` }))
    .on("error", () => res.json({ error: "Conversion failed" }))
    .save(output);
});

/* SERVE HOME */
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.listen(process.env.PORT || 5000, () =>
  console.log("Server running...")
);
