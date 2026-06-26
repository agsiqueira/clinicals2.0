import type { ImageSourcePropType } from "react-native";
import type { CharacterAssets } from "./characterAssets";

export type AnimatedPatientAvatarState =
  | "idle"
  | "listening"
  | "thinking"
  | "talking"
  | "concerned"
  | "smiling";

type PatientVisualAssetSet = CharacterAssets & {
  idle?: ImageSourcePropType;
  talking?: number;
  talkingStill?: ImageSourcePropType;
  listening?: ImageSourcePropType;
  thinking?: ImageSourcePropType;
  concerned?: ImageSourcePropType;
  smiling?: ImageSourcePropType;
};

export const PATIENT_VISUAL_ASSETS_BY_CASE_ID: Record<string, PatientVisualAssetSet> = {
  uti_level1: {
    displayName: "First Patient",
    role: "patient",
    type: "patient",
    idleImage: require("../../assets/patients/uti_level1.png"),
    talkingVideo: require("../../assets/patients/uti_level1_talk_loop.mp4"),
    idle: require("../../assets/patients/uti_level1.png"),
    talking: require("../../assets/patients/uti_level1_talk_loop.mp4"),
    talkingStill: require("../../assets/patients/uti_level1_talk.png"),
    listening: require("../../assets/patients/uti_level1.png"),
    thinking: require("../../assets/patients/uti_level1.png"),
    concerned: require("../../assets/patients/uti_level1.png"),
    smiling: require("../../assets/patients/uti_level1.png"),
  },
  seasonal_allergies_level1: {
    displayName: "Seasonal Allergies Patient",
    role: "patient",
    type: "patient",
    idleImage: require("../../assets/patients/seasonal_allergies_level1.png"),
    talkingVideo: require("../../assets/patients/seasonal_allergies_level1_talk_loop.mp4"),
    idle: require("../../assets/patients/seasonal_allergies_level1.png"),
    talking: require("../../assets/patients/seasonal_allergies_level1_talk_loop.mp4"),
    talkingStill: require("../../assets/patients/seasonal_allergies_level1_talk.png"),
    listening: require("../../assets/patients/seasonal_allergies_level1.png"),
    thinking: require("../../assets/patients/seasonal_allergies_level1.png"),
    concerned: require("../../assets/patients/seasonal_allergies_level1.png"),
    smiling: require("../../assets/patients/seasonal_allergies_level1.png"),
  },
};

export const PATIENT_VISUAL_CASE_ID_BY_SESSION_SLUG: Record<string, string> = {
  "first-patient": "uti_level1",
  "first-patient-hpi": "uti_level1",
  "seasonal-allergies-complete-hpi": "seasonal_allergies_level1",
};

export const PATIENT_AVATARS_BY_SESSION_SLUG: Record<string, ImageSourcePropType> = {
  "first-patient": require("../../assets/patients/uti_level1.png"),
  "first-patient-hpi": require("../../assets/patients/uti_level1.png"),
  "seasonal-allergies-complete-hpi": require("../../assets/patients/seasonal_allergies_level1.png"),
};

export const PATIENT_AVATARS_BY_CASE_ID: Record<string, ImageSourcePropType> = {
  uti_level1: require("../../assets/patients/uti_level1.png"),
  seasonal_allergies_level1: require("../../assets/patients/seasonal_allergies_level1.png"),
};

export function getPatientAvatarSource({
  patientSessionSlug,
  caseId,
}: {
  patientSessionSlug?: string | null;
  caseId?: string | null;
}) {
  const sessionAsset = patientSessionSlug
    ? PATIENT_AVATARS_BY_SESSION_SLUG[patientSessionSlug]
    : null;
  if (sessionAsset) return sessionAsset;

  const caseAsset = caseId ? PATIENT_AVATARS_BY_CASE_ID[caseId] : null;
  return caseAsset || null;
}

export function getPatientVisualAssets({
  patientSessionSlug,
  caseId,
}: {
  patientSessionSlug?: string | null;
  caseId?: string | null;
}) {
  const resolvedCaseId = getPatientVisualAssetKey({ patientSessionSlug, caseId });
  return resolvedCaseId ? PATIENT_VISUAL_ASSETS_BY_CASE_ID[resolvedCaseId] || null : null;
}

export function getPatientVisualAssetKey({
  patientSessionSlug,
  caseId,
}: {
  patientSessionSlug?: string | null;
  caseId?: string | null;
}) {
  const mappedCaseId = patientSessionSlug
    ? PATIENT_VISUAL_CASE_ID_BY_SESSION_SLUG[patientSessionSlug]
    : null;
  const resolvedCaseId = mappedCaseId || caseId || "";
  return PATIENT_VISUAL_ASSETS_BY_CASE_ID[resolvedCaseId] ? resolvedCaseId : null;
}

export function getPatientStateImageSource({
  patientSessionSlug,
  caseId,
  state,
}: {
  patientSessionSlug?: string | null;
  caseId?: string | null;
  state: AnimatedPatientAvatarState;
}) {
  const assets = getPatientVisualAssets({ patientSessionSlug, caseId });
  if (!assets) return null;

  if (state === "talking") return assets.talkingStill || assets.idleImage || assets.idle || null;
  return assets[state] || assets.idleImage || assets.idle || null;
}

export function getPatientTalkingVideoSource({
  patientSessionSlug,
  caseId,
}: {
  patientSessionSlug?: string | null;
  caseId?: string | null;
}) {
  const assets = getPatientVisualAssets({ patientSessionSlug, caseId });
  return assets?.talkingVideo || assets?.talking || null;
}

export function getPatientInitials(patientName?: string | null, fallbackInitials = "PT") {
  const name = String(patientName || "").trim();
  if (!name) return fallbackInitials;

  const words = name
    .replace(/[^a-zA-Z\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);

  if (words.length >= 2) return `${words[0][0]}${words[1][0]}`.toUpperCase();
  return name.slice(0, 2).toUpperCase();
}
