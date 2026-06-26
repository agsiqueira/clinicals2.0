const express = require("express");
const { createSpeechAudio, transcribeAudio } = require("../llm/navigatorClient");

const router = express.Router();

function isDevelopment() {
  return process.env.NODE_ENV !== "production";
}

function debugLog(...args) {
  if (isDevelopment()) console.log(...args);
}

function debugError(...args) {
  if (isDevelopment()) console.error(...args);
}

function parseErrorBody(error) {
  const raw = error?.responseBody;
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function getTtsUnavailableReason(error) {
  const parsed = parseErrorBody(error);
  const haystack = [
    error?.message,
    error?.responseBody,
    parsed?.error,
    parsed?.error?.code,
    parsed?.error?.message,
    parsed?.code,
    parsed?.message
  ]
    .filter(Boolean)
    .map((value) => String(value).toLowerCase())
    .join(" ");

  if (haystack.includes("key_model_access_denied")) {
    return "key_model_access_denied";
  }
  if (haystack.includes("model_not_found") || haystack.includes("model_not_available")) {
    return "model_unavailable";
  }
  return null;
}

router.post("/speak", async (req, res, next) => {
  try {
    const { text, voice, speed } = req.body || {};
    const trimmedText = String(text || "").trim();

    debugLog("[VOICE SPEAK] request body", {
      ...req.body,
      text: trimmedText ? `[${trimmedText.length} chars] ${trimmedText.slice(0, 120)}` : ""
    });

    if (!trimmedText) {
      res.status(400).json({ error: "text is required" });
      return;
    }

    const selectedVoice = voice || process.env.NAVIGATOR_TTS_VOICE || null;
    const selectedModel = process.env.NAVIGATOR_TTS_MODEL || "kokoro";
    debugLog("[VOICE SPEAK] selected config", {
      selectedVoice,
      selectedModel,
      speed: speed == null ? process.env.NAVIGATOR_TTS_SPEED || 1 : speed,
      baseUrl: process.env.NAVIGATOR_BASE || "https://api.ai.it.ufl.edu"
    });

    const { audioBase64, mimeType } = await createSpeechAudio({
      text: trimmedText.slice(0, 1200),
      voice,
      speed
    });

    debugLog("[VOICE SPEAK] response payload", {
      mimeType,
      audioBase64Length: audioBase64?.length || 0
    });

    res.json({ audio_base64: audioBase64, mime_type: mimeType });
  } catch (err) {
    debugError("[VOICE SPEAK] caught exception");
    debugError(err);
    debugError(err?.stack);
    if (err?.status || err?.headers || err?.responseBody) {
      debugError("[VOICE SPEAK] upstream failure details", {
        status: err.status,
        headers: err.headers,
        responseBody: err.responseBody
      });
    }

    const unavailableReason = getTtsUnavailableReason(err);
    if (unavailableReason) {
      res.status(503).json({
        error: "TTS unavailable",
        reason: unavailableReason,
        details:
          unavailableReason === "key_model_access_denied"
            ? "Configured key does not have access to the requested TTS model."
            : "Configured TTS model is unavailable for this key or endpoint."
      });
      return;
    }

    if (isDevelopment()) {
      res.status(500).json({
        error: err?.message || "Internal Server Error",
        stack: err?.stack || null,
        upstream: {
          status: err?.status || null,
          headers: err?.headers || null,
          responseBody: err?.responseBody || null
        }
      });
      return;
    }

    next(err);
  }
});

router.post("/transcribe", async (req, res, next) => {
  try {
    const { audio_base64, mime_type, language } = req.body || {};
    if (!audio_base64) {
      res.status(400).json({ error: "audio_base64 is required" });
      return;
    }
    const requestedLanguage = String(language || "en").trim().toLowerCase();
    const transcriptionLanguage = requestedLanguage === "en" ? "en" : "en";
    debugLog("[VOICE TRANSCRIBE] request", {
      requestedLanguage,
      transcriptionLanguage,
      mimeType: mime_type || "audio/m4a",
      audioBase64Length: String(audio_base64 || "").length
    });

    const audioBuffer = Buffer.from(audio_base64, "base64");
    const mimeType = String(mime_type || "audio/m4a");
    const ext = mimeType.includes("wav") ? "wav" : "m4a";

    const result = await transcribeAudio({
      audioBuffer,
      mimeType,
      filename: `recording.${ext}`,
      language: transcriptionLanguage
    });
    debugLog("[VOICE TRANSCRIBE] response", {
      requestedLanguage,
      transcriptionLanguage,
      returnedLanguage: result.language || null,
      transcriptPreview: result.text.slice(0, 120)
    });
    res.json({ text: result.text, language: result.language || transcriptionLanguage });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
module.exports.getTtsUnavailableReason = getTtsUnavailableReason;
