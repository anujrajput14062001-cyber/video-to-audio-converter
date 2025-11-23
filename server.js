import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import cors from "cors";
import fluentFfmpeg from "fluent-ffmpeg";
import ffmpegPath from "ffmpeg-static";

const app = express();
app.use(cors());
app.use(express.static("output"));
app.use(express.static("."));

fluentFfmpeg.setFfmpegPath(ffmpegPath);

// Multer storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, "uploads/"),
    filename: (req, file, cb) =>
        cb(null, Date.now() + path.extname(file.originalname))
});

const upload = multer({
    storage,
    limits: { fileSize: 200 * 1024 * 1024 }
});

// Upload route
app.post("/upload", upload.single("video"), (req, res) => {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    const input = req.file.path;
    const format = req.body.format || "mp3";
    const outputName = `${Date.now()}.${format}`;
    const outputPath = `output/${outputName}`;

    let audioCodec = "libmp3lame";

    switch (format) {
        case "wav":
            audioCodec = "pcm_s16le";
            break;
        case "aac":
            audioCodec = "aac";
            break;
        case "ogg":
            audioCodec = "libvorbis";
            break;
        default:
            audioCodec = "libmp3lame";
    }

    fluentFfmpeg(input)
        .noVideo()
        .audioCodec(audioCodec)
        .save(outputPath)
        .on("end", () => {
            fs.unlinkSync(input);
            res.json({
                success: true,
                download: `/${outputName}`
            });
        })
        .on("error", (err) => {
            res.status(500).json({ error: "Conversion failed", details: err.message });
        });
});

// Serve frontend
app.get("/", (req, res) => {
    res.sendFile(path.join(process.cwd(), "index.html"));
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
