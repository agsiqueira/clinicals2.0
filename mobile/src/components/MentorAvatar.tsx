import { CharacterAvatar } from "./CharacterAvatar";
import { getMentorInitials, getMentorVisualAssets } from "../utils/mentorAssets";

type MentorAvatarProps = {
  mentorName?: string | null;
  mentorSlug?: string | null;
  isSpeaking?: boolean;
  showDecorations?: boolean;
  size?: number;
  width?: number;
  height?: number;
  variant?: "breakout-circle" | "circle";
};

export function MentorAvatar({
  mentorName,
  mentorSlug = "dr-martinez",
  isSpeaking = false,
  size = 150,
  width,
  height,
  variant = "circle",
}: MentorAvatarProps) {
  const assets = getMentorVisualAssets(mentorSlug);
  const idleImage = assets?.idleImage || assets?.idle || null;
  const talkingVideo = assets?.talkingVideo || assets?.talking || null;
  const initials = getMentorInitials(mentorName, "DM");
  const avatarSize = width && height ? Math.min(width, height) : size;

  return (
    <CharacterAvatar
      idleImage={idleImage}
      talkingVideo={talkingVideo}
      isSpeaking={isSpeaking}
      size={avatarSize}
      fallbackInitials={initials}
      variant={variant}
      mediaFit="cover"
    />
  );
}
