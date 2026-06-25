import type { ImageSourcePropType } from "react-native";

export const PATIENT_AVATARS_BY_SESSION_SLUG: Record<string, ImageSourcePropType> = {
  "first-patient": require("../../assets/patients/uti_level1.png"),
  "first-patient-hpi": require("../../assets/patients/uti_level1.png"),
};

export const PATIENT_AVATARS_BY_CASE_ID: Record<string, ImageSourcePropType> = {
  uti_level1: require("../../assets/patients/uti_level1.png"),
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
