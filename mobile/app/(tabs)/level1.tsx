import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  Image
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useAuth, useUser } from "@clerk/clerk-expo";
import { Audio } from "expo-av";
import { VideoView, useVideoPlayer } from "expo-video";
import * as FileSystem from "expo-file-system/legacy";
import { caseStyles } from "../../assets/styles/case.styles";
import { deleteItemAsync, getItemAsync, setItemAsync } from "../../src/utils/storage";
import { sessionDisplayTitle } from "../../src/utils/clinicalDisplay";

const BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL;
const API_PREFIX = "/api";
const DEFAULT_REQUEST_TIMEOUT_MS = 45000;
const SUBMIT_REQUEST_TIMEOUT_MS = 240000;
const TTS_REQUEST_TIMEOUT_MS = 90000;
const VOICE_PREF_KEY = "voice_output_enabled";

const PATIENT_IMAGES: Record<string, any> = {
  uti_level1: require("../../assets/patients/uti_level1.png"),
};
const PATIENT_TALKING_VIDEO_LOOPS: Record<string, any> = {
  // Replace this file with a SadTalker output clip for more natural motion.
  uti_level1: require("../../assets/patients/uti_level1_talk_loop.mp4"),
};

function getMimeTypeFromRecordingUri(uri: string) {
  const normalized = String(uri || "").toLowerCase();
  if (normalized.endsWith(".wav")) return "audio/wav";
  if (normalized.endsWith(".caf")) return "audio/x-caf";
  if (normalized.endsWith(".3gp")) return "audio/3gpp";
  if (normalized.endsWith(".aac")) return "audio/aac";
  if (normalized.endsWith(".mp3")) return "audio/mpeg";
  return "audio/m4a";
}

function getRequestTimeoutMs(path: string, method: string) {
  if (method === "POST" && /^\/conversations\/[^/]+\/submit$/.test(path)) {
    return SUBMIT_REQUEST_TIMEOUT_MS;
  }
  if (method === "POST" && path === "/voice/speak") {
    return TTS_REQUEST_TIMEOUT_MS;
  }
  return DEFAULT_REQUEST_TIMEOUT_MS;
}

async function request(
  path: string,
  opts: { method?: string; body?: any; headers?: Record<string, string> } = {}
) {
  if (!BASE_URL) throw new Error("Missing EXPO_PUBLIC_API_BASE_URL in .env");

  const token = await getItemAsync("token");
  const method = String(opts.method || "GET").toUpperCase();
  const timeoutMs = getRequestTimeoutMs(path, method);

  const controller = new AbortController();
  const timeoutHandle = setTimeout(() => controller.abort(), timeoutMs);
  let res: Response;

  try {
    res = await fetch(`${BASE_URL}${API_PREFIX}${path}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(opts.headers || {}),
      },
      body: opts.body ? JSON.stringify(opts.body) : undefined,
      signal: controller.signal,
    });
  } catch (err: any) {
    if (err?.name === "AbortError") {
      throw new Error(`Request timed out after ${Math.round(timeoutMs / 1000)}s.`);
    }
    throw err;
  } finally {
    clearTimeout(timeoutHandle);
  }

  const text = await res.text();
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!res.ok) {
    const msg = data?.error || data?.message || `${res.status} ${res.statusText}`;
    const err: any = new Error(msg);
    err.status = res.status;
    err.data = data;
    throw err;
  }

  return data;
}

type CaseData = {
  case_id: string;
  level: number;
  display_title: string;
  setting?: string;
  presenting_info?: {
    chief_complaint?: string;
    opening_statement?: string;
  };
  osce_opening?: {
    student_intro?: string;
    patient_name_permission?: { yes?: string; no?: string };
    student_prompt_variants?: string[];
    patient_chief_complaint_reply?: string;
  };
};

type Msg = {
  id: string;
  role: "user" | "assistant"; // matches backend filter
  content: string;
};

type SectionScore = {
  section: string;
  label?: string;
  earned_points: number;
  available_points: number;
  total_points?: number;
};

type CriterionResult = {
  id: string;
  section: string;
  label: string;
  status: string;
  points: number;
  earned_points: number;
  evidence?: string[];
  rationale?: string | null;
  omit_reason?: string | null;
};

type SubmissionResult = {
  score: number;
  passing_score: number;
  passed: boolean;
  feedback: string;
  section_scores: SectionScore[];
  criteria_results: CriterionResult[];
  earned_points: number | null;
  available_points: number | null;
  case_points_awarded?: number | null;
  user_total_points?: number | null;
  user_level?: number | null;
  hpi?: string | null;
  submittedAt?: string | null;
  missed_required_questions: string[];
  missed_red_flags: string[];
  critical_fails_triggered: string[];
  clinicals2Debrief?: Clinicals2Debrief | null;
};

type Clinicals2AchievementResult = {
  achievementId: string;
  slug?: string | null;
  title: string;
  earnedPoints: number;
  maxPoints: number;
  percentScore?: number | null;
  weightedScore?: number | null;
  achieved: boolean;
  feedback?: string | null;
};

type Clinicals2Debrief = {
  sessionAttemptId: string;
  sessionScore: number;
  badgeTier: "GOLD" | "SILVER" | "BRONZE" | "NONE";
  badgeLabel: string;
  greeting?: string | null;
  recognition: string;
  coaching: string;
  encouragement: string;
  summary?: string | null;
  achievementResults: Clinicals2AchievementResult[];
};

type DebriefChatMessage = {
  role: "user" | "assistant";
  content: string;
};

const DEBRIEF_QUICK_ACTIONS = [
  "What did I do well?",
  "What should I improve?",
  "How do I get Gold next time?",
  "Review my introduction",
];

const FORMAL_INTRODUCTION_CRITERIA = [
  "professional_intro_name",
  "professional_intro_role_title",
  "professional_preferred_name",
  "professional_identity_two_identifiers",
  "professional_communication_humanism",
];
const CHIEF_COMPLAINT_CRITERIA = ["reporter_chief_complaint"];

function statusColor(status: string) {
  if (status === "met") return "#166534";
  if (status === "partially_met") return "#92400e";
  if (status === "omitted") return "#6b7280";
  return "#b91c1c";
}

function statusLabel(status: string) {
  if (status === "met") return "Met";
  if (status === "partially_met") return "Partially met";
  if (status === "omitted") return "Omitted";
  return "Missed";
}

function normalizeSubmissionPayload(payload: any): SubmissionResult {
  const details = payload?.details && typeof payload.details === "object" ? payload.details : {};
  const score = Number(payload?.score ?? details?.score ?? 0) || 0;
  const passingScore = Number(payload?.passing_score ?? details?.passing_score ?? 84) || 84;
  const passedRaw = payload?.passed ?? details?.passed;
  const passed = typeof passedRaw === "boolean" ? passedRaw : score >= passingScore;

  const sectionScores = Array.isArray(payload?.section_scores)
    ? payload.section_scores
    : Array.isArray(details?.section_scores)
    ? details.section_scores
    : [];

  const criteriaResults = Array.isArray(payload?.criteria_results)
    ? payload.criteria_results
    : Array.isArray(details?.criteria_results)
    ? details.criteria_results
    : [];

  return {
    score,
    passing_score: passingScore,
    passed,
    feedback: String(payload?.feedback ?? details?.feedback ?? ""),
    section_scores: sectionScores,
    criteria_results: criteriaResults,
    earned_points: payload?.earned_points ?? details?.earned_points ?? null,
    available_points: payload?.available_points ?? details?.available_points ?? null,
    case_points_awarded: payload?.case_points_awarded ?? details?.case_points_awarded ?? null,
    user_total_points: payload?.user_total_points ?? details?.user_total_points ?? null,
    user_level: payload?.user_level ?? details?.user_level ?? null,
    hpi: payload?.hpi ?? details?.hpi ?? null,
    submittedAt: payload?.submittedAt ?? payload?.submitted_at ?? details?.submittedAt ?? null,
    missed_required_questions: Array.isArray(payload?.missed_required_questions)
      ? payload.missed_required_questions
      : Array.isArray(details?.missed_required_questions)
      ? details.missed_required_questions
      : [],
    missed_red_flags: Array.isArray(payload?.missed_red_flags)
      ? payload.missed_red_flags
      : Array.isArray(details?.missed_red_flags)
      ? details.missed_red_flags
      : [],
    critical_fails_triggered: Array.isArray(payload?.critical_fails_triggered)
      ? payload.critical_fails_triggered
      : Array.isArray(details?.critical_fails_triggered)
      ? details.critical_fails_triggered
      : [],
    clinicals2Debrief: payload?.clinicals2Debrief ?? details?.clinicals2Debrief ?? null,
  };
}

function badgeTierFromScore(score: number) {
  if (score >= 84) return "GOLD";
  if (score >= 50) return "SILVER";
  if (score > 0) return "BRONZE";
  return "NONE";
}

function badgeLabelFromTier(tier?: string | null) {
  if (!tier || tier === "NONE") return "No badge";
  return tier.charAt(0) + tier.slice(1).toLowerCase();
}

function buildFallbackDebrief(result: SubmissionResult): Clinicals2Debrief {
  const sessionScore = Number(result.score || 0);
  const badgeTier = badgeTierFromScore(sessionScore) as Clinicals2Debrief["badgeTier"];
  const feedback = String(result.feedback || "").trim();

  return {
    sessionAttemptId: "legacy-result",
    sessionScore,
    badgeTier,
    badgeLabel: badgeLabelFromTier(badgeTier),
    greeting:
      "Thanks for completing the session. As you review your report, pay particular attention to the areas marked for improvement. When you're ready, I'd be happy to discuss what happened and how to improve next time.",
    recognition: `You completed the patient encounter and submitted your final HPI with a score of ${sessionScore}%.`,
    coaching:
      feedback ||
      "Review the criterion breakdown below and focus your next attempt on the highest-impact missed or partially met items.",
    encouragement:
      "Keep going. Each focused encounter helps you sound more confident, organized, and patient-centered.",
    summary: `Session score: ${sessionScore}%. Badge earned: ${badgeLabelFromTier(badgeTier)}.`,
    achievementResults: [],
  };
}

function formatResultDate(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString();
}

function summarizeCriteriaAchievement(
  title: string,
  criterionIds: string[],
  criteriaResults: CriterionResult[]
): Clinicals2AchievementResult {
  const criteria = criteriaResults.filter((criterion) => criterionIds.includes(criterion.id));
  const earnedPoints = criteria.reduce((sum, criterion) => sum + Number(criterion.earned_points || 0), 0);
  const maxPoints = criteria.reduce((sum, criterion) => sum + Number(criterion.points || 0), 0);
  const percentScore = maxPoints > 0 ? Math.round((earnedPoints / maxPoints) * 100) : 0;
  const missed = criteria
    .filter((criterion) => Number(criterion.earned_points || 0) < Number(criterion.points || 0))
    .map((criterion) => criterion.label || criterion.id);

  return {
    achievementId: title.toLowerCase().replace(/\s+/g, "-"),
    title,
    earnedPoints,
    maxPoints,
    percentScore,
    weightedScore: null,
    achieved: percentScore >= 84,
    feedback: missed.length > 0 ? `Review ${missed.slice(0, 2).join(", ")}.` : "Mapped criteria were met.",
  };
}

export default function Level1Screen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const caseId = useMemo(() => {
    const raw = params.caseId;
    return Array.isArray(raw) ? raw[0] : raw || "uti_level1";
  }, [params.caseId]);
  const patientSessionSlug = useMemo(() => {
    const raw = params.patientSessionSlug;
    return Array.isArray(raw) ? raw[0] : raw || null;
  }, [params.patientSessionSlug]);
  const requiresHpi = useMemo(() => {
    const raw = params.requiresHpi;
    const value = Array.isArray(raw) ? raw[0] : raw;
    if (value == null) return true;
    return String(value).toLowerCase() === "true";
  }, [params.requiresHpi]);
  const conversationStorageKey = useMemo(
    () => `conv_${patientSessionSlug || caseId}`,
    [caseId, patientSessionSlug]
  );
  const patientImage = PATIENT_IMAGES[caseId] || PATIENT_IMAGES.uti_level1;
  const patientTalkingVideoLoop =
    PATIENT_TALKING_VIDEO_LOOPS[caseId] || PATIENT_TALKING_VIDEO_LOOPS.uti_level1;
  const avatarVideoPlayer = useVideoPlayer(patientTalkingVideoLoop, (player) => {
    player.loop = true;
    player.muted = true;
  });

  const [loadingCase, setLoadingCase] = useState(true);
  const [sending, setSending] = useState(false);
  const [caseData, setCaseData] = useState<CaseData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Msg[]>([]);
  const listRef = useRef<FlatList<Msg>>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [pendingMessages, setPendingMessages] = useState<Msg[]>([]);
  const [creatingConversation, setCreatingConversation] = useState(false);
  const [stage, setStage] = useState<"chat" | "hpi" | "results">("chat");
  const [hpiText, setHpiText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submissionResult, setSubmissionResult] = useState<SubmissionResult | null>(null);
  const [debriefVisible, setDebriefVisible] = useState(false);
  const [debriefMessages, setDebriefMessages] = useState<DebriefChatMessage[]>([]);
  const [debriefInput, setDebriefInput] = useState("");
  const [debriefSending, setDebriefSending] = useState(false);
  const [debriefError, setDebriefError] = useState<string | null>(null);
  const [showDetailedRubric, setShowDetailedRubric] = useState(false);
  const [showResumePrompt, setShowResumePrompt] = useState(false);
  const [resumeLoading, setResumeLoading] = useState(false);
  const [savedConversationId, setSavedConversationId] = useState<string | null>(null);
  const [resumeCheckComplete, setResumeCheckComplete] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const soundRef = useRef<Audio.Sound | null>(null);
  const soundFilePathRef = useRef<string | null>(null);
  const voiceEnabledRef = useRef(true);

  const recordingRef = useRef<Audio.Recording | null>(null);
  const webMediaRecorderRef = useRef<MediaRecorder | null>(null);
  const webAudioChunksRef = useRef<Blob[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [recordingBusy, setRecordingBusy] = useState(false);

  const startRecording = async () => {
    if (recordingBusy || transcribing || isRecording) return;
      if (Platform.OS === "web") {
    setRecordingBusy(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      webAudioChunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          webAudioChunksRef.current.push(event.data);
        }
      };

      recorder.start();
      webMediaRecorderRef.current = recorder;
      setIsRecording(true);
    } catch (err) {
      console.warn("Failed to start web recording:", err);
    } finally {
      setRecordingBusy(false);
    }
    return;
  }

    setRecordingBusy(true);
    try {
      const permission = await Audio.requestPermissionsAsync();
      if (!permission.granted) {
        console.warn("Microphone permission not granted.");
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const recording = new Audio.Recording();
      await recording.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      await recording.startAsync();

      recordingRef.current = recording;
      setIsRecording(true);
    } catch (err) {
      console.warn("Failed to start recording:", err);
      recordingRef.current = null;
      setIsRecording(false);
    } finally {
      setRecordingBusy(false);
    }
  };

  const stopRecordingAndTranscribe = async () => {
    if (recordingBusy) return;  if (Platform.OS === "web") {
    const recorder = webMediaRecorderRef.current;
    if (!recorder) return;

    setRecordingBusy(true);
    setIsRecording(false);
    setTranscribing(true);

    try {
      const audioBlob: Blob = await new Promise((resolve) => {
        recorder.onstop = () => {
          resolve(new Blob(webAudioChunksRef.current, { type: "audio/webm" }));
        };
        recorder.stop();
      });

      recorder.stream.getTracks().forEach((track) => track.stop());
      webMediaRecorderRef.current = null;

      const arrayBuffer = await audioBlob.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      let binary = "";
      for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      const audioBase64 = btoa(binary);

      const data = await request("/voice/transcribe", {
        method: "POST",
        body: {
          audio_base64: audioBase64,
          mime_type: "audio/webm",
        },
      });

      if (data?.text) setInput(data.text);
    } catch (err) {
      console.warn("Web transcription failed:", err);
    } finally {
      setTranscribing(false);
      setRecordingBusy(false);
    }

    return;
  }
      if (Platform.OS === "web") {
    const recorder = webMediaRecorderRef.current;
    if (!recorder) return;

    setRecordingBusy(true);
    setIsRecording(false);
    setTranscribing(true);

    try {
      const audioBlob: Blob = await new Promise((resolve) => {
        recorder.onstop = () => {
          resolve(new Blob(webAudioChunksRef.current, { type: "audio/webm" }));
        };
        recorder.stop();
      });

      recorder.stream.getTracks().forEach((track) => track.stop());
      webMediaRecorderRef.current = null;

      const arrayBuffer = await audioBlob.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      let binary = "";
      for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      const audioBase64 = btoa(binary);

      const data = await request("/voice/transcribe", {
        method: "POST",
        body: {
          audio_base64: audioBase64,
          mime_type: "audio/webm",
        },
      });

      if (data?.text) setInput(data.text);
    } catch (err) {
      console.warn("Web transcription failed:", err);
    } finally {
      setTranscribing(false);
      setRecordingBusy(false);
    }

    return;
  }



    const recording = recordingRef.current;
    if (!recording) return;

    setRecordingBusy(true);
    setIsRecording(false);
    recordingRef.current = null;

    let uri: string | null = null;
    try {
      await recording.stopAndUnloadAsync();
      uri = recording.getURI();
    } catch (err) {
      console.warn("Failed to stop recording:", err);
    } finally {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
      }).catch(() => {});
    }

    if (!uri) {
      setRecordingBusy(false);
      return;
    }

    setIsRecording(false);
    setTranscribing(true);

    try {
      const audioBase64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      await FileSystem.deleteAsync(uri, { idempotent: true });

      const data = await request("/voice/transcribe", {
        method: "POST",
        body: {
          audio_base64: audioBase64,
          mime_type: getMimeTypeFromRecordingUri(uri),
        },
      });

      if (data?.text) setInput(data.text);
    } catch (err) {
      console.warn("Transcription failed:", err);
    } finally {
      setTranscribing(false);
      setRecordingBusy(false);
    }
  };

  const { userId: authUserId } = useAuth();
  const { user } = useUser();

  const userHeaders = useMemo(() => {
    const headers: Record<string, string> = {};
    const email = user?.primaryEmailAddress?.emailAddress;
    const fallbackEmail = email || user?.emailAddresses?.[0]?.emailAddress;
    const resolvedUserId = user?.id || authUserId || (__DEV__ ? fallbackEmail || "dev-user" : undefined);

    if (resolvedUserId) headers["x-clerk-user-id"] = resolvedUserId;
    if (user?.fullName) headers["x-user-name"] = user.fullName;
    if (email) headers["x-user-email"] = email;
    if (user?.imageUrl) headers["x-user-image"] = user.imageUrl;
    return headers;
  }, [authUserId, user]);

  const stopSpeechPlayback = useCallback(async () => {
    const currentSound = soundRef.current;
    soundRef.current = null;

    if (currentSound) {
      try {
        await currentSound.stopAsync();
      } catch {
        // noop
      }
      try {
        await currentSound.unloadAsync();
      } catch {
        // noop
      }
    }

    const soundFilePath = soundFilePathRef.current;
    soundFilePathRef.current = null;
    if (soundFilePath) {
      try {
        await FileSystem.deleteAsync(soundFilePath, { idempotent: true });
      } catch {
        // noop
      }
    }

    setIsSpeaking(false);
  }, []);

  const speakAssistantReply = useCallback(
    async (text: string) => {
      if (!voiceEnabledRef.current) return;

      const inputText = String(text || "").trim();
      if (!inputText) return;

      try {
        await stopSpeechPlayback();

        const payload = await request("/voice/speak", {
          method: "POST",
          body: { text: inputText },
        });

const audioBase64 = String(payload?.audio_base64 || "").trim();
if (!audioBase64) return;

const mimeType = String(payload?.mime_type || "audio/mpeg").toLowerCase();

if (Platform.OS === "web") {
  const audioUri = `data:${mimeType};base64,${audioBase64}`;
  const audio = new window.Audio(audioUri);

  setIsSpeaking(true);

  audio.onended = () => {
    setIsSpeaking(false);
  };

  audio.onerror = () => {
    setIsSpeaking(false);
    console.warn("Failed to play web patient voice.");
  };

  await audio.play();
  return;
}

const extension = mimeType.includes("wav") ? "wav" : "mp3";
const baseDir = FileSystem.cacheDirectory || FileSystem.documentDirectory;
if (!baseDir) {
  throw new Error("No writable filesystem directory for audio playback.");
}

const filePath = `${baseDir}tts-${Date.now()}.${extension}`;
await FileSystem.writeAsStringAsync(filePath, audioBase64, {
  encoding: FileSystem.EncodingType.Base64,
});

soundFilePathRef.current = filePath;
const { sound } = await Audio.Sound.createAsync(
  { uri: filePath },
  { shouldPlay: true }
);

        soundRef.current = sound;
        setIsSpeaking(true);

        sound.setOnPlaybackStatusUpdate((status) => {
          if (!status.isLoaded) {
            if (status.error) {
              setIsSpeaking(false);
            }
            return;
          }

          if (status.didJustFinish) {
            void stopSpeechPlayback();
          }
        });
      } catch (err) {
        console.warn("Failed to play patient voice:", err);
        await stopSpeechPlayback();
      }
    },
    [stopSpeechPlayback]
  );

  const queueMessage = useCallback((msg: Msg) => {
    setPendingMessages((prev) => [...prev, msg]);
  }, []);

  const persistMessage = useCallback(
    async (msg: Msg) => {
      if (!conversationId) return;
      try {
        await request(`/conversations/${conversationId}/messages`, {
          method: "POST",
          headers: userHeaders,
          body: {
            role: msg.role,
            content: msg.content,
          },
        });
      } catch (err) {
        console.warn("Failed to persist message:", err);
      }
    },
    [conversationId, userHeaders]
  );

  const ensureConversation = useCallback(async (): Promise<string | null> => {
    if (!userHeaders["x-clerk-user-id"]) return null;
    if (conversationId) return conversationId;
    if (creatingConversation) return null;

    setCreatingConversation(true);
    try {
      const data = await request("/conversations", {
        method: "POST",
        headers: userHeaders,
        body: { caseId, patientSessionSlug },
      });
      const id = String(data?.conversationId || "");
      if (!id) return null;
      setConversationId(id);
      return id;
    } catch (err) {
      console.warn("Failed to create conversation:", err);
      return null;
    } finally {
      setCreatingConversation(false);
    }
  }, [caseId, conversationId, creatingConversation, patientSessionSlug, userHeaders]);

  useEffect(() => {
    setConversationId(null);
    setPendingMessages([]);
    setStage("chat");
    setHpiText("");
    setSubmissionResult(null);
    setDebriefVisible(false);
    setDebriefMessages([]);
    setDebriefInput("");
    setDebriefSending(false);
    setDebriefError(null);
    setShowDetailedRubric(false);
    setSubmitError(null);
    setSavedConversationId(null);
    setShowResumePrompt(false);
    setResumeCheckComplete(false);
  }, [conversationStorageKey]);

  // for resume chat button
  useEffect(() => {
    if (!conversationId) return;
    setItemAsync(conversationStorageKey, conversationId).catch(() => {});
  }, [conversationId, conversationStorageKey]);

  // on mount, check if a previous non-trivial conversation exists for this patient session
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const saved = await getItemAsync(conversationStorageKey);
        if (cancelled) return;

        if (!saved) {
          setSavedConversationId(null);
          setShowResumePrompt(false);
          return;
        }

        try {
          const data = await request(`/conversations/${saved}`, {
            headers: userHeaders,
          });
          if (cancelled) return;

          const savedMessages = Array.isArray(data?.messages) ? data.messages : [];
          const hasUserMessage = savedMessages.some((msg: any) => msg?.role === "user");
          const hasPatientMessage = savedMessages.some(
            (msg: any) => msg?.role === "assistant" || msg?.role === "patient"
          );
          const savedPatientSessionSlug = data?.patientSessionSlug
            ? String(data.patientSessionSlug)
            : null;
          const mismatchedPatientSession =
            Boolean(savedPatientSessionSlug && patientSessionSlug) &&
            savedPatientSessionSlug !== patientSessionSlug;
          const shouldSuppressResume =
            data?.status === "SUBMITTED" ||
            Boolean(data?.submission) ||
            data?.caseId !== caseId ||
            mismatchedPatientSession ||
            savedMessages.length < 2 ||
            !hasUserMessage ||
            !hasPatientMessage;

          if (shouldSuppressResume) {
            await deleteItemAsync(conversationStorageKey).catch(() => {});
            if (cancelled) return;
            setSavedConversationId(null);
            setShowResumePrompt(false);
            return;
          }

          setSavedConversationId(saved);
          setShowResumePrompt(true);
        } catch {
          await deleteItemAsync(conversationStorageKey).catch(() => {});
          if (cancelled) return;
          setSavedConversationId(null);
          setShowResumePrompt(false);
        }
      } finally {
        if (!cancelled) {
          setResumeCheckComplete(true);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [caseId, conversationStorageKey, patientSessionSlug, userHeaders]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const savedPref = await getItemAsync(VOICE_PREF_KEY);
      if (cancelled || savedPref == null) return;
      setVoiceEnabled(savedPref !== "0");
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setItemAsync(VOICE_PREF_KEY, voiceEnabled ? "1" : "0").catch(() => {});
  }, [voiceEnabled]);

  useEffect(() => {
    voiceEnabledRef.current = voiceEnabled;
  }, [voiceEnabled]);

  const shouldPlayTalkingVideo = isSpeaking && stage === "chat" && voiceEnabled;
  const safelySetTalkingVideoState = useCallback(
    (shouldPlay: boolean) => {
      try {
        if (shouldPlay) {
          avatarVideoPlayer.play();
          return;
        }

        avatarVideoPlayer.pause();
        avatarVideoPlayer.currentTime = 0;
      } catch {
        // Can happen during unmount/fast-refresh when native player is already disposed.
      }
    },
    [avatarVideoPlayer]
  );

  useEffect(() => {
    safelySetTalkingVideoState(shouldPlayTalkingVideo);
  }, [safelySetTalkingVideoState, shouldPlayTalkingVideo]);

  useEffect(() => {
    if (stage !== "chat") {
      void stopSpeechPlayback();
    }
  }, [stage, stopSpeechPlayback]);

  useEffect(() => {
    if (!voiceEnabled) {
      void stopSpeechPlayback();
    }
  }, [stopSpeechPlayback, voiceEnabled]);

  useEffect(() => {
    return () => {
      const recording = recordingRef.current;
      recordingRef.current = null;
      if (recording) {
        recording.stopAndUnloadAsync().catch(() => {});
      }
      safelySetTalkingVideoState(false);
      void stopSpeechPlayback();
    };
  }, [safelySetTalkingVideoState, stopSpeechPlayback]);

  useEffect(() => {
    if (!resumeCheckComplete) return;
    if (showResumePrompt) return;
    if (savedConversationId && !conversationId) return;
    ensureConversation();
  }, [conversationId, ensureConversation, resumeCheckComplete, savedConversationId, showResumePrompt]);

  useEffect(() => {
    if (!conversationId || pendingMessages.length === 0) return;
    const toPersist = pendingMessages;
    setPendingMessages([]);
    toPersist.forEach((msg) => {
      persistMessage(msg);
    });
  }, [conversationId, pendingMessages, persistMessage]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setLoadingCase(true);
        setError(null);

        const data = await request(`/cases/${caseId}`);
        if (cancelled) return;

        setCaseData(data);

        // Start with an empty transcript so opening behavior is graded from user input.
        setMessages([]);
        setInput("");
        setStage("chat");
        setHpiText("");
        setSubmissionResult(null);
        setSubmitError(null);
      } catch (e: any) {
        if (cancelled) return;
        setError(e.message || "Failed to load case");
      } finally {
        if (!cancelled) setLoadingCase(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [caseId]);

  const send = async () => {
    if (stage !== "chat") return;

    const text = input.trim();
    if (!text || sending) return;

    const userMsg: Msg = {
      id: `u-${Date.now()}`,
      role: "user",
      content: text,
    };

    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    if (conversationId) {
      persistMessage(userMsg);
    } else {
      queueMessage(userMsg);
    }
    setInput("");
    setSending(true);

    try {
      // backend contract:
      // { caseId, messages: [{role, content}, ...] }
      const data = await request("/chat", {
        method: "POST",
        body: {
          caseId,
          messages: nextMessages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
        },
      });

      const replyText = String(data?.reply ?? "");

      const assistantMsg: Msg = {
        id: `a-${Date.now()}`,
        role: "assistant",
        content: replyText || "(empty reply)",
      };

      setMessages((prev) => [...prev, assistantMsg]);
      if (conversationId) {
        persistMessage(assistantMsg);
      } else {
        queueMessage(assistantMsg);
      }
      if (voiceEnabledRef.current) {
        void speakAssistantReply(assistantMsg.content);
      }
    } catch (e: any) {
      const assistantMsg: Msg = {
        id: `a-err-${Date.now()}`,
        role: "assistant",
        content: `Error: ${e.message || "chat failed"}`,
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } finally {
      setSending(false);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 50);
    }
  };

  const submitForFinalGrade = useCallback(async () => {
    const hpi = hpiText.trim();
    if ((requiresHpi && !hpi) || submitting) return;

    setSubmitError(null);
    setSubmitting(true);
    let convoId = conversationId;

    try {
      if (!convoId) {
        convoId = await ensureConversation();
      }
      if (!convoId) {
        throw new Error("Conversation is still being created. Please try again.");
      }

      const data = await request(`/conversations/${convoId}/submit`, {
        method: "POST",
        headers: userHeaders,
        body: { hpi, patientSessionSlug },
      });

      setSubmissionResult(normalizeSubmissionPayload({ ...data, hpi }));
      await deleteItemAsync(conversationStorageKey).catch(() => {});
      setStage("results");
      setDebriefMessages([]);
      setDebriefInput("");
      setDebriefSending(false);
      setDebriefError(null);
      setShowDetailedRubric(false);
      setDebriefVisible(true);
    } catch (e: any) {
      const message = String(e?.message || "Failed to submit case.");
      const timedOut = message.toLowerCase().includes("timed out");

      if (timedOut && convoId) {
        try {
          const conversationData = await request(`/conversations/${convoId}`, {
            headers: userHeaders,
          });

          if (conversationData?.submission) {
            const fromSavedSubmission = {
              ...(conversationData.submission.details || {}),
              score: conversationData.submission.score,
              feedback: conversationData.submission.feedback,
              clinicals2Debrief: conversationData.submission.clinicals2Debrief || null,
            };
            setSubmissionResult(normalizeSubmissionPayload(fromSavedSubmission));
            setStage("results");
            setDebriefMessages([]);
            setDebriefInput("");
            setDebriefSending(false);
            setDebriefError(null);
            setShowDetailedRubric(false);
            setDebriefVisible(true);
            return;
          }
        } catch (checkErr) {
          console.warn("Failed to check submission status after timeout:", checkErr);
        }

        setSubmitError(
          "Submit timed out. Grading may still be running. Wait 10-20 seconds and tap Submit Case again."
        );
      } else {
        setSubmitError(message);
      }
    } finally {
      setSubmitting(false);
    }
  }, [
    conversationId,
    conversationStorageKey,
    ensureConversation,
    hpiText,
    patientSessionSlug,
    requiresHpi,
    submitting,
    userHeaders,
  ]);

  const submitDisabled =
    submitting || creatingConversation || !conversationId || (requiresHpi && !hpiText.trim());

  const beginHpiStep = useCallback(() => {
    if (messages.length === 0) {
      setSubmitError("Complete at least one chat turn before finishing.");
      return;
    }
    setSubmitError(null);
    if (!requiresHpi) {
      void submitForFinalGrade();
      return;
    }
    setStage("hpi");
  }, [messages.length, requiresHpi, submitForFinalGrade]);

  const visibleDebrief = useMemo(() => {
    if (!submissionResult) return null;
    return submissionResult.clinicals2Debrief || buildFallbackDebrief(submissionResult);
  }, [submissionResult]);

  const reviewAchievementResults = useMemo(() => {
    if (!submissionResult) return [];
    if (visibleDebrief?.achievementResults?.length) return visibleDebrief.achievementResults;
    return [
      summarizeCriteriaAchievement(
        "Formal Introduction",
        FORMAL_INTRODUCTION_CRITERIA,
        submissionResult.criteria_results
      ),
      summarizeCriteriaAchievement(
        "Chief Complaint",
        CHIEF_COMPLAINT_CRITERIA,
        submissionResult.criteria_results
      ),
    ];
  }, [submissionResult, visibleDebrief]);

  const reviewSessionScore = visibleDebrief?.sessionScore ?? submissionResult?.score ?? 0;
  const reviewBadgeLabel = visibleDebrief?.badgeLabel || badgeLabelFromTier(badgeTierFromScore(reviewSessionScore));
  const reviewSubmittedAt = formatResultDate(submissionResult?.submittedAt);
  const resumeSessionTitle =
    sessionDisplayTitle({ slug: patientSessionSlug || undefined, title: caseData?.display_title || undefined }) ||
    caseData?.display_title ||
    "this session";

  const sendDebriefMessage = useCallback(
    async (messageOverride?: string) => {
      const text = (typeof messageOverride === "string" ? messageOverride : debriefInput).trim();
      if (!text || debriefSending || !conversationId) return;

      const nextMessages: DebriefChatMessage[] = [
        ...debriefMessages,
        { role: "user", content: text },
      ];

      setDebriefMessages(nextMessages);
      setDebriefInput("");
      setDebriefError(null);
      setDebriefSending(true);

      try {
        const data = await request(`/conversations/${conversationId}/debrief-chat`, {
          method: "POST",
          headers: userHeaders,
          body: {
            message: text,
            messages: debriefMessages,
          },
        });
        const reply = String(data?.reply || "").trim();
        setDebriefMessages((current) => [
          ...current,
          {
            role: "assistant",
            content:
              reply ||
              "Review your report, choose one specific area to practice, and ask me about that skill.",
          },
        ]);
      } catch (err: any) {
        setDebriefError(err?.message || "Dr. Martinez could not respond right now.");
      } finally {
        setDebriefSending(false);
      }
    },
    [conversationId, debriefInput, debriefMessages, debriefSending, userHeaders]
  );

  const continueLearning = useCallback(() => {
    setDebriefVisible(false);
    router.push("/(tabs)");
  }, [router]);

  const resumeConversation = useCallback(async () => {
    if (!savedConversationId) return;
    setResumeLoading(true);
    try {
      const data = await request(`/conversations/${savedConversationId}`, {
        headers: userHeaders,
      });
      const msgs: Msg[] = (data?.messages ?? []).map((m: any) => ({
        id: m.id ?? `${m.role}-${Date.now()}-${Math.random()}`,
        role: m.role,
        content: m.content,
      }));
      setMessages(msgs);
      setConversationId(savedConversationId);
      setShowResumePrompt(false);
    } catch (e: any) {
      console.warn("Failed to resume conversation:", e.message);
      await deleteItemAsync(conversationStorageKey).catch(() => {});
      setSavedConversationId(null);
      setShowResumePrompt(false);
    } finally {
      setResumeLoading(false);
    }
  }, [conversationStorageKey, savedConversationId, userHeaders]);

  const startFresh = useCallback(async () => {
    await deleteItemAsync(conversationStorageKey).catch(() => {});
    setSavedConversationId(null);
    setShowResumePrompt(false);
  }, [conversationStorageKey]);

  const retryCase = useCallback(async () => {
    await stopSpeechPlayback();
    await deleteItemAsync(conversationStorageKey).catch(() => {});

    setSavedConversationId(null);
    setShowResumePrompt(false);
    setConversationId(null);
    setPendingMessages([]);
    setMessages([]);
    setInput("");
    setStage("chat");
    setHpiText("");
    setSubmitError(null);
    setSubmissionResult(null);
    setDebriefVisible(false);
    setDebriefMessages([]);
    setDebriefInput("");
    setDebriefSending(false);
    setDebriefError(null);
    setShowDetailedRubric(false);
  }, [conversationStorageKey, stopSpeechPlayback]);

  if (loadingCase) {
    return (
      <SafeAreaView style={caseStyles.container}>
        <ActivityIndicator />
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={caseStyles.container}>
        <Text style={caseStyles.loadErrorTitle}>Failed</Text>
        <Text>{error}</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={caseStyles.container}>
      {showResumePrompt && (
        <View style={caseStyles.resumeOverlay}>
          <View style={caseStyles.resumeCard}>
            <Text style={caseStyles.resumeTitle}>Resume previous attempt?</Text>
            <Text style={caseStyles.resumeSubText}>
              You have an unfinished attempt for {resumeSessionTitle}. Resume where you left off or start a new attempt.
            </Text>
            <Pressable
              onPress={resumeConversation}
              disabled={resumeLoading}
              style={caseStyles.resumePrimaryButton}
            >
              <Text style={caseStyles.resumePrimaryButtonText}>
                {resumeLoading ? "Loading..." : "Resume"}
              </Text>
            </Pressable>
            <Pressable
              onPress={startFresh}
              style={caseStyles.resumeSecondaryButton}
            >
              <Text style={caseStyles.resumeSecondaryButtonText}>Start New Attempt</Text>
            </Pressable>
          </View>
        </View>
      )}
      {submitting && (
        <View style={caseStyles.gradingOverlay}>
          <View style={caseStyles.gradingCard}>
            <ActivityIndicator size="large" />
            <Text style={caseStyles.gradingTitle}>Grading your case...</Text>
            <Text style={caseStyles.gradingSubText}>
              This may take up to a minute. Please wait.
            </Text>
          </View>
        </View>
      )}
      <Modal
        visible={debriefVisible && Boolean(visibleDebrief)}
        transparent
        animationType="fade"
        onRequestClose={() => setDebriefVisible(false)}
      >
        <View style={caseStyles.debriefOverlay}>
          <View style={caseStyles.debriefCard}>
            {visibleDebrief ? (
              <ScrollView contentContainerStyle={caseStyles.debriefScrollContent}>
                <View style={caseStyles.debriefHeaderRow}>
                  <View style={caseStyles.debriefAvatarCircle}>
                    <Text style={caseStyles.debriefAvatarText}>DM</Text>
                  </View>
                  <View style={caseStyles.debriefHeaderText}>
                    <Text style={caseStyles.debriefEyebrow}>Dr. Martinez Debrief</Text>
                    <Text style={caseStyles.debriefTitle}>Post-session coaching</Text>
                  </View>
                </View>

                <View style={caseStyles.debriefChatBox}>
                  <Text style={caseStyles.debriefSectionTitle}>Ask Dr. Martinez</Text>
                  <View style={caseStyles.debriefChatMessages}>
                    <View
                      style={[
                        caseStyles.debriefChatBubble,
                        caseStyles.debriefChatBubbleAssistant,
                      ]}
                    >
                      <Text style={caseStyles.debriefMentorLabel}>Dr. Martinez</Text>
                      <Text style={caseStyles.debriefText}>
                        {visibleDebrief.greeting || visibleDebrief.recognition}
                      </Text>
                    </View>
                  </View>
                  <View style={caseStyles.debriefQuickActions}>
                    {DEBRIEF_QUICK_ACTIONS.map((action) => (
                      <Pressable
                        key={action}
                        onPress={() => sendDebriefMessage(action)}
                        disabled={debriefSending || !conversationId}
                        style={({ pressed }) => [
                          caseStyles.debriefQuickActionButton,
                          {
                            opacity:
                              debriefSending || !conversationId ? 0.45 : pressed ? 0.75 : 1,
                          },
                        ]}
                      >
                        <Text style={caseStyles.debriefQuickActionText}>{action}</Text>
                      </Pressable>
                    ))}
                  </View>

                  {debriefMessages.length > 0 ? (
                    <View style={caseStyles.debriefChatMessages}>
                      {debriefMessages.map((message, index) => (
                        <View
                          key={`${message.role}-${index}`}
                          style={[
                            caseStyles.debriefChatBubble,
                            message.role === "user"
                              ? caseStyles.debriefChatBubbleUser
                              : caseStyles.debriefChatBubbleAssistant,
                          ]}
                        >
                          <Text style={caseStyles.debriefMentorLabel}>
                            {message.role === "user" ? "You" : "Dr. Martinez"}
                          </Text>
                          <Text style={caseStyles.debriefText}>{message.content}</Text>
                        </View>
                      ))}
                    </View>
                  ) : null}

                  {debriefSending ? (
                    <Text style={caseStyles.debriefChatHint}>Dr. Martinez is responding...</Text>
                  ) : null}
                  {debriefError ? <Text style={caseStyles.errorText}>{debriefError}</Text> : null}

                  <View style={caseStyles.debriefChatInputRow}>
                    <TextInput
                      value={debriefInput}
                      onChangeText={setDebriefInput}
                      editable={!debriefSending}
                      placeholder="Ask Dr. Martinez about your report..."
                      style={caseStyles.debriefChatInput}
                      returnKeyType="send"
                      onSubmitEditing={() => sendDebriefMessage()}
                    />
                    <Pressable
                      onPress={() => sendDebriefMessage()}
                      disabled={debriefSending || !debriefInput.trim() || !conversationId}
                      style={({ pressed }) => [
                        caseStyles.debriefChatSendButton,
                        {
                          opacity:
                            debriefSending || !debriefInput.trim() || !conversationId
                              ? 0.45
                              : pressed
                              ? 0.75
                              : 1,
                        },
                      ]}
                    >
                      <Text style={caseStyles.debriefChatSendText}>
                        {debriefSending ? "..." : "Ask"}
                      </Text>
                    </Pressable>
                  </View>
                </View>

                <View style={caseStyles.debriefReportDivider}>
                  <View style={caseStyles.debriefReportLine} />
                  <Text style={caseStyles.debriefReportHeading}>Session Report</Text>
                  <View style={caseStyles.debriefReportLine} />
                </View>

                <View style={caseStyles.debriefReportPanel}>
                  <View style={caseStyles.debriefScoreRow}>
                    <View style={caseStyles.debriefMetricBox}>
                      <Text style={caseStyles.debriefMetricLabel}>Session Score</Text>
                      <Text style={caseStyles.debriefMetricValue}>{visibleDebrief.sessionScore}%</Text>
                    </View>
                    <View style={caseStyles.debriefMetricBox}>
                      <Text style={caseStyles.debriefMetricLabel}>Badge Earned</Text>
                      <Text style={caseStyles.debriefMetricValue}>{visibleDebrief.badgeLabel}</Text>
                    </View>
                  </View>

                  {visibleDebrief.achievementResults.length > 0 ? (
                    <View style={caseStyles.debriefSection}>
                      <Text style={caseStyles.debriefSectionTitle}>Achievement Results</Text>
                      {visibleDebrief.achievementResults.map((achievement) => (
                        <View key={achievement.achievementId} style={caseStyles.debriefAchievementRow}>
                          <View style={caseStyles.debriefAchievementMain}>
                            <Text style={caseStyles.debriefAchievementTitle}>{achievement.title}</Text>
                            {!!achievement.feedback && (
                              <Text style={caseStyles.debriefAchievementFeedback}>
                                {achievement.feedback}
                              </Text>
                            )}
                          </View>
                          <Text style={caseStyles.debriefAchievementScore}>
                            {Math.round(Number(achievement.percentScore || 0))}%
                          </Text>
                        </View>
                      ))}
                    </View>
                  ) : null}
                </View>

                <View style={caseStyles.debriefActions}>
                  <Pressable onPress={() => setDebriefVisible(false)} style={caseStyles.debriefSecondaryButton}>
                    <Text style={caseStyles.debriefSecondaryButtonText}>Review Results</Text>
                  </Pressable>
                  <Pressable onPress={continueLearning} style={caseStyles.debriefPrimaryButton}>
                    <Text style={caseStyles.debriefPrimaryButtonText}>Continue Learning</Text>
                  </Pressable>
                </View>
              </ScrollView>
            ) : null}
          </View>
        </View>
      </Modal>
      <KeyboardAvoidingView
        style={caseStyles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={8}
      >
        {/* Header */}
        <View style={caseStyles.header}>
          <View style={caseStyles.avatarWrapper}>
            <View style={caseStyles.avatarClip}>
              {shouldPlayTalkingVideo ? (
                <VideoView
                  player={avatarVideoPlayer}
                  style={caseStyles.avatarVideo}
                  contentFit="cover"
                  nativeControls={false}
                  allowsPictureInPicture={false}
                />
              ) : (
                <Image
                  source={patientImage}
                  style={caseStyles.avatar}
                  resizeMode="cover"
                />
              )}
            </View>
          </View>

          <Text style={caseStyles.title}>
            Level {caseData?.level ?? "?"} 
          </Text>

          {!!caseData?.setting && (
            <Text style={caseStyles.subText}>
              Setting: {caseData.setting}
            </Text>
          )}

          {!!caseData?.presenting_info?.chief_complaint && (
            <Text style={caseStyles.subText}>
              Chief complaint: {caseData.presenting_info.chief_complaint}
            </Text>
          )}

          {stage === "chat" && (
            <View style={caseStyles.voiceControlsRow}>
              <Pressable
                onPress={async () => {
                  if (voiceEnabled) {
                    await stopSpeechPlayback();
                  }
                  setVoiceEnabled((prev) => !prev);
                }}
                style={({ pressed }) => ({
                  ...caseStyles.voiceToggleButton,
                  opacity: pressed ? 0.75 : 1,
                })}
              >
                <Text style={caseStyles.voiceToggleText}>
                  {voiceEnabled ? "Voice: On" : "Voice: Off"}
                </Text>
              </Pressable>

              {voiceEnabled ? (
                <Text style={caseStyles.voiceStateText}>
                  {isSpeaking ? "Patient speaking..." : "Patient voice ready"}
                </Text>
              ) : (
                <Text style={caseStyles.voiceStateText}>Text only mode</Text>
              )}
            </View>
          )}
        </View>

        {stage === "results" && submissionResult ? (
          <FlatList
            data={showDetailedRubric ? submissionResult.criteria_results : []}
            keyExtractor={(item) => item.id}
            contentContainerStyle={caseStyles.resultsFlatListContent}
            ListHeaderComponent={
              <View style={caseStyles.resultsHeaderContainer}>
                <View style={caseStyles.resultsCard}>
                  <Text style={caseStyles.resultsSectionHeading}>Summary</Text>
                  <View style={caseStyles.resultsSummaryGrid}>
                    <View style={caseStyles.resultsSummaryItem}>
                      <Text style={caseStyles.resultsSummaryLabel}>Session</Text>
                      <Text style={caseStyles.resultsSummaryValue}>
                        {caseId === "uti_level1" ? "First Patient" : caseData?.display_title || "Patient Session"}
                      </Text>
                    </View>
                    <View style={caseStyles.resultsSummaryItem}>
                      <Text style={caseStyles.resultsSummaryLabel}>Score</Text>
                      <Text style={caseStyles.resultsSummaryValue}>{reviewSessionScore}%</Text>
                    </View>
                    <View style={caseStyles.resultsSummaryItem}>
                      <Text style={caseStyles.resultsSummaryLabel}>Badge</Text>
                      <Text style={caseStyles.resultsSummaryValue}>{reviewBadgeLabel}</Text>
                    </View>
                    {reviewSubmittedAt ? (
                      <View style={caseStyles.resultsSummaryItem}>
                        <Text style={caseStyles.resultsSummaryLabel}>Submitted</Text>
                        <Text style={caseStyles.resultsSummaryValue}>{reviewSubmittedAt}</Text>
                      </View>
                    ) : null}
                  </View>
                </View>

                <View style={caseStyles.resultsCard}>
                  <Text style={caseStyles.resultsSectionHeading}>Achievement Results</Text>
                  {reviewAchievementResults.map((achievement) => (
                    <View key={achievement.achievementId} style={caseStyles.resultsAchievementRow}>
                      <View style={caseStyles.resultsAchievementMain}>
                        <Text style={caseStyles.resultsAchievementTitle}>{achievement.title}</Text>
                        {!!achievement.feedback && (
                          <Text style={caseStyles.resultsAchievementFeedback}>
                            {achievement.feedback}
                          </Text>
                        )}
                      </View>
                      <Text style={caseStyles.resultsAchievementScore}>
                        {Math.round(Number(achievement.percentScore || 0))}%
                      </Text>
                    </View>
                  ))}
                </View>

                <View style={caseStyles.resultsCard}>
                  <Text style={caseStyles.resultsSectionHeading}>HPI / Submitted Report</Text>
                  <Text style={caseStyles.resultsReportText}>
                    {submissionResult.hpi || "No HPI text was stored with this submission."}
                  </Text>
                </View>

                <View style={caseStyles.resultsCardSecondary}>
                  <View style={caseStyles.resultsDetailHeader}>
                    <View style={caseStyles.resultsDetailHeaderText}>
                      <Text style={caseStyles.resultsSectionHeading}>Detailed Rubric / Technical Details</Text>
                      <Text style={caseStyles.resultsMutedText}>
                        Criteria, section scores, missed items, red flags, and point totals.
                      </Text>
                    </View>
                    <Pressable
                      onPress={() => setShowDetailedRubric((current) => !current)}
                      style={caseStyles.resultsToggleButton}
                    >
                      <Text style={caseStyles.resultsToggleButtonText}>
                        {showDetailedRubric ? "Hide details" : "Show detailed rubric"}
                      </Text>
                    </Pressable>
                  </View>

                  {showDetailedRubric ? (
                    <View style={caseStyles.resultsDetailContent}>
                      {submissionResult.earned_points != null ? (
                        <Text style={caseStyles.resultsPointsText}>
                          Rubric points: {submissionResult.earned_points} / {submissionResult.available_points}
                        </Text>
                      ) : null}
                      {submissionResult.case_points_awarded != null ? (
                        <Text style={caseStyles.resultsPointsText}>
                          Case points earned: {submissionResult.case_points_awarded}
                        </Text>
                      ) : null}
                      {submissionResult.user_total_points != null ? (
                        <Text style={caseStyles.resultsPointsText}>
                          Total user points: {submissionResult.user_total_points}
                          {submissionResult.user_level != null ? ` · level ${submissionResult.user_level}` : ""}
                        </Text>
                      ) : null}

                      {submissionResult.critical_fails_triggered.length > 0 ? (
                        <View style={caseStyles.resultsCriticalBox}>
                          <Text style={caseStyles.resultsCriticalTitle}>Critical Fails</Text>
                          {submissionResult.critical_fails_triggered.map((item) => (
                            <Text key={item} style={caseStyles.resultsCriticalItem}>- {item}</Text>
                          ))}
                        </View>
                      ) : null}

                      {submissionResult.missed_red_flags.length > 0 ? (
                        <View style={caseStyles.resultsRedFlagBox}>
                          <Text style={caseStyles.resultsRedFlagTitle}>Missed Red Flags</Text>
                          {submissionResult.missed_red_flags.map((item) => (
                            <Text key={item} style={caseStyles.resultsRedFlagItem}>- {item}</Text>
                          ))}
                        </View>
                      ) : null}

                      {submissionResult.missed_required_questions.length > 0 ? (
                        <View style={caseStyles.resultsMissedBox}>
                          <Text style={caseStyles.resultsMissedTitle}>Missed History Items</Text>
                          {submissionResult.missed_required_questions.map((item) => (
                            <Text key={item} style={caseStyles.resultsMissedItem}>- {item}</Text>
                          ))}
                        </View>
                      ) : null}

                      {submissionResult.section_scores.length > 0 ? (
                        <View style={caseStyles.resultsSectionDivider}>
                          <Text style={caseStyles.resultsSectionTitle}>Section Scores</Text>
                          {submissionResult.section_scores.map((section) => (
                            <View key={section.section} style={caseStyles.resultsSectionRow}>
                              <Text style={caseStyles.resultsSectionLabel}>{section.label || section.section}</Text>
                              <Text style={caseStyles.resultsSectionPoints}>
                                {section.earned_points}/{section.available_points}
                              </Text>
                            </View>
                          ))}
                        </View>
                      ) : null}

                      <Text style={caseStyles.resultsSectionTitle}>Criterion Breakdown</Text>
                    </View>
                  ) : null}
                </View>
              </View>
            }
            ListFooterComponent={
              <View style={caseStyles.resultsActionsContainer}>
                <Text style={caseStyles.resultsRetryNote}>
                  Retry starts a brand new attempt. Your highest point total for this case is the one kept.
                </Text>
                <Pressable
                  onPress={() => router.push("/(tabs)")}
                  style={({ pressed }) => ({
                    ...caseStyles.outlineButton,
                    flex: undefined,
                    opacity: pressed ? 0.7 : 1,
                  })}
                >
                  <Text style={caseStyles.outlineButtonText}>Continue Learning</Text>
                </Pressable>
                <Pressable
                  onPress={retryCase}
                  style={({ pressed }) => ({
                    ...caseStyles.outlineButton,
                    flex: undefined,
                    opacity: pressed ? 0.7 : 1,
                  })}
                >
                  <Text style={caseStyles.outlineButtonText}>Retry Case</Text>
                </Pressable>
              </View>
            }
            renderItem={({ item }) => (
              <View style={caseStyles.criterionCard}>
                <View style={caseStyles.criterionRow}>
                  <Text style={caseStyles.criterionLabel}>{item.label || item.id}</Text>
                  <Text style={[caseStyles.criterionStatusText, { color: statusColor(item.status) }]}>
                    {statusLabel(item.status)}
                  </Text>
                </View>
                <Text style={caseStyles.criterionMeta}>
                  {item.section} • {item.earned_points}/{item.points}
                </Text>
                {!!item.rationale && (
                  <Text style={caseStyles.criterionRationale}>{item.rationale}</Text>
                )}
                {Array.isArray(item.evidence) && item.evidence.length > 0 && (
                  <Text style={caseStyles.criterionEvidence}>
                    Evidence: {item.evidence.slice(0, 2).join(" | ")}
                  </Text>
                )}
                {!!item.omit_reason && (
                  <Text style={caseStyles.criterionOmitReason}>Reason: {item.omit_reason}</Text>
                )}
              </View>
            )}
          />
        ) : (
          <>
            {/* Chat */}
            <FlatList
              ref={listRef}
              data={messages}
              keyExtractor={(m) => m.id}
              contentContainerStyle={caseStyles.chatContainer}
              renderItem={({ item }) => {
                const isUser = item.role === "user";
                return (
                  <View
                    style={[
                      caseStyles.messageBubble,
                      { alignSelf: isUser ? "flex-end" : "flex-start" },
                    ]}
                  >
                    <Text style={caseStyles.messageSenderLabel}>
                      {isUser ? "You" : "Patient"}
                    </Text>
                    <Text>{item.content}</Text>
                  </View>
                );
              }}
              onContentSizeChange={() =>
                listRef.current?.scrollToEnd({ animated: true })
              }
            />
            {messages.length === 0 && (
              <View style={caseStyles.chatHintContainer}>
                <Text style={caseStyles.chatHintText}>
                  Start with your OSCE introduction (name + title), then ask what brings the patient in.
                </Text>
              </View>
            )}

            {stage === "chat" ? (
              <>
                {/* Input */}
                <View style={caseStyles.inputContainer}>
                  <TextInput
                    value={input}
                    onChangeText={setInput}
                    placeholder="Ask the patient a question..."
                    style={caseStyles.textInput}
                    editable={!sending}
                    returnKeyType="send"
                    onSubmitEditing={send}
                  />
                  <Pressable
                    onPress={isRecording ? stopRecordingAndTranscribe : startRecording}
                    disabled={sending || transcribing || recordingBusy}
                    style={({ pressed }) => ({
                      ...caseStyles.sendButton,
                      opacity:
                        sending || transcribing || recordingBusy ? 0.4 : pressed ? 0.6 : 1,
                      marginRight: 4,
                    })}
                  >
                    <Text style={caseStyles.buttonText}>
                      {transcribing ? "..." : isRecording ? "⏹️" : "🎤"}
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={send}
                    disabled={sending || !input.trim()}
                    style={({ pressed }) => ({
                      ...caseStyles.sendButton,
                      opacity: sending || !input.trim() ? 0.4 : pressed ? 0.6 : 1,
                    })}
                  >
                    <Text style={caseStyles.buttonText}>{sending ? "..." : "Send"}</Text>
                  </Pressable>
                </View>

                <View style={caseStyles.doneButtonContainer}>
                  <Pressable
                    onPress={beginHpiStep}
                    disabled={sending || creatingConversation || messages.length === 0}
                    style={({ pressed }) => ({
                      ...caseStyles.outlineButton,
                      flex: undefined,
                      opacity: sending || creatingConversation || messages.length === 0 ? 0.5 : pressed ? 0.7 : 1,
                    })}
                  >
                    <Text style={caseStyles.outlineButtonText}>
                      {creatingConversation ? "Preparing..." : "Done Interview"}
                    </Text>
                  </Pressable>
                </View>
              </>
            ) : (
              <View style={caseStyles.hpiStageContainer}>
                <View style={caseStyles.hpiCard}>
                  <Text style={caseStyles.hpiTitle}>Final HPI (4-5 sentences)</Text>
                  <Text style={caseStyles.hpiSubText}>
                    Summarize presenting illness with OLDCARTS elements. This is graded.
                  </Text>
                  <TextInput
                    value={hpiText}
                    onChangeText={setHpiText}
                    multiline
                    textAlignVertical="top"
                    editable={!submitting}
                    placeholder="Write your HPI summary here..."
                    style={caseStyles.hpiInput}
                  />
                </View>

                {submitError ? (
                  <Text style={caseStyles.errorText}>{submitError}</Text>
                ) : null}

                {!conversationId && !submitError ? (
                  <Text style={caseStyles.resultsRetryNote}>
                    Preparing this attempt. Submit will be available in a moment.
                  </Text>
                ) : null}

                <View style={caseStyles.hpiButtonRow}>
                  <Pressable
                    onPress={() => setStage("chat")}
                    disabled={submitting}
                    style={({ pressed }) => ({
                      ...caseStyles.outlineButton,
                      opacity: submitting ? 0.5 : pressed ? 0.7 : 1,
                    })}
                  >
                    <Text style={caseStyles.outlineButtonText}>Back to Chat</Text>
                  </Pressable>
                  <Pressable
                    onPress={submitForFinalGrade}
                    disabled={submitDisabled}
                    style={({ pressed }) => ({
                      ...caseStyles.outlineButton,
                      opacity: submitDisabled ? 0.5 : pressed ? 0.7 : 1,
                    })}
                  >
                    <Text style={caseStyles.outlineButtonText}>
                      {submitting ? "Submitting..." : creatingConversation || !conversationId ? "Preparing..." : "Submit Case"}
                    </Text>
                  </Pressable>
                </View>
              </View>
            )}
          </>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
