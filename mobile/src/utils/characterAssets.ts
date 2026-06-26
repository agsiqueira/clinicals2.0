import type { ImageSourcePropType } from "react-native";

export type CharacterRole = "patient" | "provider";

export type CharacterAssets = {
  idleImage?: ImageSourcePropType | null;
  talkingVideo?: number | null;
  displayName: string;
  role: CharacterRole;
  type: CharacterRole;
};
