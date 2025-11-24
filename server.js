import express from "express";
import axios from "axios";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());
app.use(cors());
app.use(express.static(__dirname));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

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
