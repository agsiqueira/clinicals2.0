import { useCallback, useEffect, useRef, useState } from "react";
import { getItemAsync, setItemAsync } from "../utils/storage";

const VOICE_PREF_KEY = "voice_output_enabled";
const DEFAULT_VOICE_ENABLED = true;
const listeners = new Set<(enabled: boolean) => void>();
let cachedVoiceEnabled = DEFAULT_VOICE_ENABLED;
let loaded = false;

async function loadVoicePreference() {
  if (loaded) return cachedVoiceEnabled;
  const saved = await getItemAsync(VOICE_PREF_KEY);
  if (saved != null) {
    cachedVoiceEnabled = saved !== "0";
  }
  loaded = true;
  return cachedVoiceEnabled;
}

function notifyVoicePreference(enabled: boolean) {
  listeners.forEach((listener) => listener(enabled));
}

export function useVoicePreference() {
  const [voiceEnabled, setVoiceEnabledState] = useState(cachedVoiceEnabled);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    listeners.add(setVoiceEnabledState);

    loadVoicePreference().then((enabled) => {
      if (mountedRef.current) {
        setVoiceEnabledState(enabled);
      }
    });

    return () => {
      mountedRef.current = false;
      listeners.delete(setVoiceEnabledState);
    };
  }, []);

  const setVoiceEnabled = useCallback((next: boolean | ((current: boolean) => boolean)) => {
    const resolved = typeof next === "function" ? next(cachedVoiceEnabled) : next;
    cachedVoiceEnabled = Boolean(resolved);
    loaded = true;
    setVoiceEnabledState(cachedVoiceEnabled);
    notifyVoicePreference(cachedVoiceEnabled);
    setItemAsync(VOICE_PREF_KEY, cachedVoiceEnabled ? "1" : "0").catch(() => {});
  }, []);

  return {
    voiceEnabled,
    setVoiceEnabled,
  };
}
