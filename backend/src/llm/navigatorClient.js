const DEFAULT_BASE_URL = "https://api.ai.it.ufl.edu";
const DEFAULT_CHAT_TIMEOUT_MS = 30000;
const DEFAULT_GRADING_TIMEOUT_MS = 180000;
const DEFAULT_TTS_TIMEOUT_MS = 60000;

function readTimeoutMs(raw, fallback) {
  if (Number.isFinite(raw) && raw > 0) {
    return raw;
  }
  return fallback;
}

function getChatTimeoutMs() {
  const raw = Number(process.env.NAVIGATOR_CHAT_TIMEOUT_MS || process.env.NAVIGATOR_TIMEOUT_MS);
  return readTimeoutMs(raw, DEFAULT_CHAT_TIMEOUT_MS);
}

function getGradingTimeoutMs() {
  const raw = Number(process.env.NAVIGATOR_GRADING_TIMEOUT_MS || process.env.NAVIGATOR_TIMEOUT_MS);
  return readTimeoutMs(raw, DEFAULT_GRADING_TIMEOUT_MS);
}

function getTtsTimeoutMs() {
  const raw = Number(process.env.NAVIGATOR_TTS_TIMEOUT_MS || process.env.NAVIGATOR_TIMEOUT_MS);
  return readTimeoutMs(raw, DEFAULT_TTS_TIMEOUT_MS);
}

function getNavigatorConfig() {
  const apiKey = process.env.NAVIGATOR_API_KEY;
  const chatModel = process.env.NAVIGATOR_MODEL;
  const gradingModel = process.env.NAVIGATOR_GRADING_MODEL || chatModel;
  const baseUrl = process.env.NAVIGATOR_BASE || DEFAULT_BASE_URL;

  if (!apiKey) {
    throw new Error("NAVIGATOR_API_KEY is not set");
  }
  if (!chatModel) {
    throw new Error("NAVIGATOR_MODEL is not set");
  }

  return {
    apiKey,
    chatModel,
    gradingModel,
    baseUrl
  };
}

async function callNavigatorChat({
  model,
  messages,
  temperature = 0.4,
  maxTokens = 250,
  stop = null,
  timeoutMs = DEFAULT_CHAT_TIMEOUT_MS
}) {
  const { apiKey, baseUrl } = getNavigatorConfig();

  const payload = {
    model,
    temperature,
    max_tokens: maxTokens,
    messages
  };

  if (Array.isArray(stop) && stop.length > 0) {
    payload.stop = stop;
  }

  const controller = new AbortController();
  const timeoutHandle = setTimeout(() => controller.abort(), timeoutMs);
  let response;

  try {
    response = await fetch(`${baseUrl}/v1/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    });
  } catch (err) {
    if (err?.name === "AbortError") {
      throw new Error(`NaviGator API timed out after ${timeoutMs}ms`);
    }
    throw err;
  } finally {
    clearTimeout(timeoutHandle);
  }

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`NaviGator API error ${response.status}: ${text}`);
  }

  const data = await response.json();
  const message = data?.choices?.[0]?.message?.content;
  if (!message) {
    throw new Error("NaviGator API returned no message");
  }
  return message.trim();
}

async function createPatientReply({ systemPrompt, messages }) {
  const { chatModel } = getNavigatorConfig();
  return callNavigatorChat({
    model: chatModel,
    temperature: 0.4,
    maxTokens: 250,
    timeoutMs: getChatTimeoutMs(),
    stop: ["\nuser", "\nUser", "\nassistant", "\nAssistant"],
    messages: [{ role: "system", content: systemPrompt }, ...messages]
  });
}

async function createRubricEval({ systemPrompt, userPrompt }) {
  const { gradingModel } = getNavigatorConfig();
  return callNavigatorChat({
    model: gradingModel,
    temperature: 0,
    maxTokens: 3000,
    timeoutMs: getGradingTimeoutMs(),
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt }
    ]
  });
}

function getTtsConfig(overrides = {}) {
  const model = String(
    overrides.model ||
      process.env.NAVIGATOR_TTS_MODEL ||
      "kokoro"
  )
    .trim()
    .toLowerCase();
  const voice = String(overrides.voice || process.env.NAVIGATOR_TTS_VOICE || "").trim();

  if (!voice) {
    throw new Error("NAVIGATOR_TTS_VOICE is not set");
  }

  const speedRaw = Number(
    overrides.speed == null ? process.env.NAVIGATOR_TTS_SPEED : overrides.speed
  );
  const speed = Number.isFinite(speedRaw) && speedRaw > 0 ? speedRaw : 1;

  return { model, voice, speed };
}

async function createSpeechAudio({ text, voice, speed, model }) {
  const input = String(text || "").trim();
  if (!input) {
    throw new Error("text is required for speech synthesis");
  }

  const { apiKey, baseUrl } = getNavigatorConfig();
  const ttsConfig = getTtsConfig({ voice, speed, model });

  const payload = {
    model: ttsConfig.model,
    input,
    voice: ttsConfig.voice,
    response_format: "mp3",
    speed: ttsConfig.speed
  };

  const controller = new AbortController();
  const timeoutHandle = setTimeout(() => controller.abort(), getTtsTimeoutMs());
  let response;

  try {
    response = await fetch(`${baseUrl}/v1/audio/speech`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    });
  } catch (err) {
    if (err?.name === "AbortError") {
      throw new Error(`NaviGator TTS timed out after ${getTtsTimeoutMs()}ms`);
    }
    throw err;
  } finally {
    clearTimeout(timeoutHandle);
  }

  if (!response.ok) {
    const textResponse = await response.text();
    throw new Error(`NaviGator TTS error ${response.status}: ${textResponse}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  return {
    audioBase64: buffer.toString("base64"),
    mimeType: response.headers.get("content-type") || "audio/mpeg"
  };
}

async function transcribeAudio({ audioBuffer, mimeType = "audio/m4a", filename = "audio.m4a" }) {
  const { apiKey, baseUrl } = getNavigatorConfig();
  const FormData = require("form-data");

  const form = new FormData();
  form.append("file", audioBuffer, { filename, contentType: mimeType });
  form.append("model", process.env.NAVIGATOR_STT_MODEL);

  const timeoutMs = 60000;
  const controller = new AbortController();
  const timeoutHandle = setTimeout(() => controller.abort(), timeoutMs);
  let response;

  try {
    const formBuffer = form.getBuffer();

    response = await fetch(`${baseUrl}/v1/audio/transcriptions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        ...form.getHeaders()
      },
      body: formBuffer,
      signal: controller.signal
    });
  } catch (err) {
    if (err?.name === "AbortError") throw new Error("NaviGator Whisper timed out");
    throw err;
  } finally {
    clearTimeout(timeoutHandle);
  }

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`NaviGator Whisper error ${response.status}: ${text}`);
  }

  const data = await response.json();
  return String(data?.text || "").trim();
}

module.exports = { createPatientReply, createRubricEval, createSpeechAudio, transcribeAudio };
