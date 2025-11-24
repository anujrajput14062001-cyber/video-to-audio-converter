import express from "express";
import axios from "axios";
import cors from "cors";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static("."));

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// YOUTUBE CONVERTER
app.post("/api/ytmp3", async (req, res) => {
  try {
    const { url } = req.body;

    const response = await axios.post(
      "https://yt-api.p.rapidapi.com/dl",
      { url },
      {
        headers: {
          "content-type": "application/json",
          "X-RapidAPI-Key": process.env.RAPID_KEY,
          "X-RapidAPI-Host": "yt-api.p.rapidapi.com"
        }
      }
    );

    res.json({ download: response.data.formats[0].url });
  } catch (err) {
    console.log(err);
    res.json({ error: true });
  }
});

// FILE UPLOAD TO MP3/MP4
const upload = multer({ dest: "uploads/" });

app.post("/upload", upload.single("video"), async (req, res) => {
  const file = req.file;
  const format = req.body.format;

  const outputPath = `output/${file.filename}.${format}`;

  const { exec } = await import("child_process");
  exec(`ffmpeg -i ${file.path} ${outputPath}`, () => {
    res.json({ download: "/" + outputPath });
  });
});

app.listen(10000, () => console.log("Server running on 10000"));

// ---------- YOUTUBE → MP3 API ROUTE ----------
app.post("/api/ytmp3", async (req, res) => {
  try {
    const { url } = req.body;

    if (!url) return res.status(400).json({ error: "No URL provided" });

    const api = await axios.get(
      `https://api.neoxr.eu/api/ytmp3?url=${encodeURIComponent(url)}`
    );

    res.json(api.data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "API failed. Try another link." });
  }
});

// ---------- START SERVER ----------
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Server running on PORT ${PORT}`));
