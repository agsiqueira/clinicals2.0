import type { ImageSourcePropType } from "react-native";
import type { CharacterAssets } from "./characterAssets";

type MentorVisualAssetSet = CharacterAssets & {
  idle?: ImageSourcePropType | null;
  idleLoop?: number | null;
  talking?: number | null;
};

export const MENTOR_VISUAL_ASSETS_BY_SLUG: Record<string, MentorVisualAssetSet> = {
  "dr-martinez": {
    displayName: "Dr. Martinez",
    role: "provider",
    type: "provider",
    // Mentor art standard:
    // - 9:16 transparent PNG/MP4
    // - 1080 x 1920 recommended
    // - waist/chest-up character, no environment
    idleImage: require("../../assets/mentors/dr_martinez/portrait.png"),
    talkingVideo: require("../../assets/mentors/dr_martinez_talk_loop.mp4"),
    idle: require("../../assets/mentors/dr_martinez/portrait.png"),
    talking: require("../../assets/mentors/dr_martinez_talk_loop.mp4"),
    // Future static asset:
    // idleLoop: require("../../assets/mentors/dr_martinez/idle.mp4"),
    // Transition fallback if portrait.png is temporarily removed:
    // idle: require("../../assets/mentors/dr_martinez.png"),
    idleLoop: null,
  },
};

export function getMentorVisualAssets(slug?: string | null) {
  const resolvedSlug = slug || "dr-martinez";
  return MENTOR_VISUAL_ASSETS_BY_SLUG[resolvedSlug] || null;
}

export function getMentorTalkingVideoSource(slug?: string | null) {
  const assets = getMentorVisualAssets(slug);
  return assets?.talkingVideo || assets?.talking || null;
}

export function getMentorInitials(name?: string | null, fallbackInitials = "DM") {
  const value = String(name || "").trim();
  if (!value) return fallbackInitials;

  const words = value
    .replace(/[^a-zA-Z\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);

  if (words.length >= 2) return `${words[0][0]}${words[1][0]}`.toUpperCase();
  return value.slice(0, 2).toUpperCase();
}
