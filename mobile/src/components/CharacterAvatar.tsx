import { useEffect } from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import type { ImageSourcePropType } from "react-native";
import { VideoView, useVideoPlayer } from "expo-video";

type CharacterAvatarProps = {
  idleImage?: ImageSourcePropType | null;
  talkingVideo?: number | null;
  isSpeaking?: boolean;
  size?: number;
  fallbackInitials?: string;
  variant?: "breakout-circle" | "circle";
  mediaFit?: "cover" | "contain";
};

export function CharacterAvatar({
  idleImage,
  talkingVideo,
  isSpeaking = false,
  size = 220,
  fallbackInitials = "CA",
  variant = "circle",
  mediaFit = "cover",
}: CharacterAvatarProps) {
  const shouldShowVideo = isSpeaking && Boolean(talkingVideo);
  const player = useVideoPlayer(talkingVideo || null, (videoPlayer) => {
    videoPlayer.loop = true;
    videoPlayer.muted = true;
  });

  useEffect(() => {
    try {
      if (shouldShowVideo) {
        player.play();
        return;
      }

      player.pause();
      player.currentTime = 0;
    } catch {
      // The native player may already be disposed during route changes or fast refresh.
    }
  }, [player, shouldShowVideo]);

  const circleStyle = {
    width: size,
    height: size,
    borderRadius: size / 2,
  };

  return (
    <View
      style={[
        styles.avatarBreakoutWrapper,
        variant === "breakout-circle" && styles.avatarBreakoutWrapperRaised,
        circleStyle,
      ]}
    >
      <View style={[styles.avatarCircle, circleStyle]}>
        {idleImage ? (
          <Image source={idleImage} style={styles.media} resizeMode={mediaFit} />
        ) : (
          <View style={[styles.initialsFrame, styles.media]}>
            <Text style={styles.initialsText}>{fallbackInitials}</Text>
          </View>
        )}
        {shouldShowVideo ? (
          <VideoView
            key={`character-talking-${String(talkingVideo)}`}
            player={player}
            style={[styles.media, styles.talkingMedia]}
            contentFit={mediaFit}
            nativeControls={false}
            allowsPictureInPicture={false}
          />
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  avatarBreakoutWrapper: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ffffff",
  },
  avatarBreakoutWrapperRaised: {
    shadowColor: "#111827",
    shadowOpacity: 0.16,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 12 },
    elevation: 8,
  },
  avatarCircle: {
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#f3f4f6",
  },
  media: {
    width: "100%",
    height: "100%",
    backgroundColor: "#ffffff",
  },
  talkingMedia: {
    position: "absolute",
    left: 0,
    top: 0,
    zIndex: 2,
    elevation: 2,
  },
  initialsFrame: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#faf5ff",
  },
  initialsText: {
    color: "#5b21b6",
    fontSize: 34,
    fontWeight: "900",
  },
});
