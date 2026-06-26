import { useCallback, useRef, useState } from "react";
import { Platform } from "react-native";
import { Audio } from "expo-av";
import * as FileSystem from "expo-file-system/legacy";
import { api } from "../api/client";

function getMimeTypeFromRecordingUri(uri: string) {
  const normalized = String(uri || "").toLowerCase();
  if (normalized.endsWith(".wav")) return "audio/wav";
  if (normalized.endsWith(".caf")) return "audio/x-caf";
  if (normalized.endsWith(".3gp")) return "audio/3gpp";
  if (normalized.endsWith(".aac")) return "audio/aac";
  if (normalized.endsWith(".mp3")) return "audio/mpeg";
  return "audio/m4a";
}

async function blobToBase64(blob: Blob) {
  const arrayBuffer = await blob.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  let binary = "";
  for (let index = 0; index < bytes.length; index += 1) {
    binary += String.fromCharCode(bytes[index]);
  }
  return btoa(binary);
}

type UseEnglishSpeechTranscriptionOptions = {
  onText: (text: string) => void;
  onError?: (error: unknown) => void;
};

export function useEnglishSpeechTranscription({
  onText,
  onError,
}: UseEnglishSpeechTranscriptionOptions) {
  const recordingRef = useRef<Audio.Recording | null>(null);
  const webMediaRecorderRef = useRef<MediaRecorder | null>(null);
  const webAudioChunksRef = useRef<Blob[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [recordingBusy, setRecordingBusy] = useState(false);

  const startRecording = useCallback(async () => {
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
      } catch (error) {
        onError?.(error);
      } finally {
        setRecordingBusy(false);
      }
      return;
    }

    setRecordingBusy(true);
    try {
      const permission = await Audio.requestPermissionsAsync();
      if (!permission.granted) return;

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const recording = new Audio.Recording();
      await recording.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      await recording.startAsync();

      recordingRef.current = recording;
      setIsRecording(true);
    } catch (error) {
      recordingRef.current = null;
      setIsRecording(false);
      onError?.(error);
    } finally {
      setRecordingBusy(false);
    }
  }, [isRecording, onError, recordingBusy, transcribing]);

  const stopRecordingAndTranscribe = useCallback(async () => {
    if (recordingBusy) return;

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

        const audioBase64 = await blobToBase64(audioBlob);
        const data = await api.transcribeVoice({
          audio_base64: audioBase64,
          mime_type: "audio/webm",
          language: "en",
        });

        if (data?.text) onText(data.text);
      } catch (error) {
        onError?.(error);
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
      if (!uri) return;

      setTranscribing(true);
      const audioBase64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      await FileSystem.deleteAsync(uri, { idempotent: true });

      const data = await api.transcribeVoice({
        audio_base64: audioBase64,
        mime_type: getMimeTypeFromRecordingUri(uri),
        language: "en",
      });

      if (data?.text) onText(data.text);
    } catch (error) {
      onError?.(error);
    } finally {
      setTranscribing(false);
      setRecordingBusy(false);
    }
  }, [onError, onText, recordingBusy]);

  const toggleRecording = useCallback(() => {
    if (isRecording) {
      return stopRecordingAndTranscribe();
    }
    return startRecording();
  }, [isRecording, startRecording, stopRecordingAndTranscribe]);

  return {
    isRecording,
    transcribing,
    recordingBusy,
    startRecording,
    stopRecordingAndTranscribe,
    toggleRecording,
  };
}
