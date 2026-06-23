const express = require("express");
const { createSpeechAudio, transcribeAudio } = require("../llm/navigatorClient");

const router = express.Router();

router.post("/speak", async (req, res, next) => {
  try {
    const { text, voice, speed } = req.body || {};
    const trimmedText = String(text || "").trim();

    if (!trimmedText) {
      res.status(400).json({ error: "text is required" });
      return;
    }
    console.log("VOICE SPEAK route hit");

    const { audioBase64, mimeType } = await createSpeechAudio({
      text: trimmedText.slice(0, 1200),
      voice,
      speed
    });

    res.json({ audio_base64: audioBase64, mime_type: mimeType });
  } catch (err) {
    next(err);
  }
});

router.post("/transcribe", async (req, res, next) => {
  try {
    const { audio_base64, mime_type } = req.body || {};
    if (!audio_base64) {
      res.status(400).json({ error: "audio_base64 is required" });
      return;
    }
    console.log("VOICE TRANSCRIBE route hit");

    const audioBuffer = Buffer.from(audio_base64, "base64");
    const mimeType = String(mime_type || "audio/m4a");
    const ext = mimeType.includes("wav") ? "wav" : "m4a";

    const text = await transcribeAudio({ audioBuffer, mimeType, filename: `recording.${ext}` });
    res.json({ text });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
