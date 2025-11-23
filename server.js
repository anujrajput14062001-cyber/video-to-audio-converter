app.post("/upload", upload.single("video"), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
    }

    const input = req.file.path;

    // Get output format (mp3, wav, aac, ogg)
    const format = req.body.format || "mp3";

    // Output file name
    const outputName = `${Date.now()}.${format}`;
    const output = `output/${outputName}`;

    let audioCodec = "libmp3lame";

    // Select correct codec
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
            audioCodec = "libmp3lame"; // mp3
    }

    fluentFfmpeg(input)
        .noVideo()
        .audioCodec(audioCodec)
        .on("error", (err) => {
            console.error("FFmpeg error:", err);
            res.status(500).json({ error: "Conversion failed", ffmpeg: err.message });
        })
        .on("end", () => {
            // Delete input video after converting
            try { fs.unlinkSync(input); } catch (e) {}

            res.json({
                download: `/${outputName}`,
                format: format.toUpperCase()
            });
        })
        .save(output);
});
