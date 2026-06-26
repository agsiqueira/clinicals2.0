import { useCallback, useEffect, useRef, useState } from "react";
import { Platform } from "react-native";
import { Audio } from "expo-av";
import * as FileSystem from "expo-file-system/legacy";
import { api } from "../api/client";

function createAudioBlobUrl(audioBase64: string, mimeType: string) {
  const binary = window.atob(audioBase64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  const blob = new Blob([bytes], { type: mimeType || "audio/mpeg" });
  return URL.createObjectURL(blob);
}

type SpeechPlaybackOptions = {
  voice?: string | null;
  speed?: number;
  onError?: (error: unknown) => void;
};

export function useSpeechPlayback({ voice, speed, onError }: SpeechPlaybackOptions = {}) {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const soundRef = useRef<Audio.Sound | null>(null);
  const soundFilePathRef = useRef<string | null>(null);
  const webAudioRef = useRef<HTMLAudioElement | null>(null);
  const webAudioUrlRef = useRef<string | null>(null);

  const stop = useCallback(async () => {
    const webAudio = webAudioRef.current;
    webAudioRef.current = null;
    if (webAudio) {
      try {
        webAudio.pause();
        webAudio.src = "";
      } catch {
        // noop
      }
    }

    const webAudioUrl = webAudioUrlRef.current;
    webAudioUrlRef.current = null;
    if (webAudioUrl && Platform.OS === "web") {
      try {
        URL.revokeObjectURL(webAudioUrl);
      } catch {
        // noop
      }
    }

    const sound = soundRef.current;
    soundRef.current = null;
    if (sound) {
      try {
        await sound.stopAsync();
      } catch {
        // noop
      }
      try {
        await sound.unloadAsync();
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

  const speak = useCallback(
    async (text: string) => {
      const inputText = String(text || "").trim();
      if (!inputText) return;

      try {
        await stop();
        const payload = await api.speakVoice({
          text: inputText,
          ...(voice ? { voice } : {}),
          ...(speed ? { speed } : {}),
        });

        const audioBase64 = String(payload?.audio_base64 || "").trim();
        const mimeType = String(payload?.mime_type || "audio/mpeg").toLowerCase();
        if (!audioBase64) return;

        if (Platform.OS === "web") {
          const audioUrl = createAudioBlobUrl(audioBase64, mimeType);
          const audio = new window.Audio(audioUrl);
          audio.volume = 1.0;
          audio.muted = false;
          webAudioUrlRef.current = audioUrl;
          webAudioRef.current = audio;
          audio.onended = () => {
            setIsSpeaking(false);
            webAudioRef.current = null;
            if (webAudioUrlRef.current) {
              URL.revokeObjectURL(webAudioUrlRef.current);
              webAudioUrlRef.current = null;
            }
          };
          audio.onerror = () => {
            setIsSpeaking(false);
            onError?.(audio.error || new Error("Audio playback failed"));
          };
          setIsSpeaking(true);
          await audio.play();
          return;
        }

        const extension = mimeType.includes("wav") ? "wav" : "mp3";
        const baseDir = FileSystem.cacheDirectory || FileSystem.documentDirectory;
        if (!baseDir) throw new Error("No writable filesystem directory for audio playback.");

        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          playsInSilentModeIOS: true,
        }).catch(() => {});

        const filePath = `${baseDir}mentor-tts-${Date.now()}.${extension}`;
        await FileSystem.writeAsStringAsync(filePath, audioBase64, {
          encoding: FileSystem.EncodingType.Base64,
        });
        soundFilePathRef.current = filePath;

        const { sound } = await Audio.Sound.createAsync(
          { uri: filePath },
          { shouldPlay: false, volume: 1.0, isMuted: false }
        );
        soundRef.current = sound;
        setIsSpeaking(true);
        await sound.playAsync();

        sound.setOnPlaybackStatusUpdate((status) => {
          if (!status.isLoaded) {
            if (status.error) {
              setIsSpeaking(false);
              onError?.(new Error(status.error));
            }
            return;
          }
          if (status.didJustFinish) {
            void stop();
          }
        });
      } catch (error) {
        setIsSpeaking(false);
        onError?.(error);
      }
    },
    [onError, speed, stop, voice]
  );

  useEffect(() => {
    return () => {
      void stop();
    };
  }, [stop]);

  return {
    isSpeaking,
    speak,
    stop,
  };
}
