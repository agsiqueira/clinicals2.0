import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

function getWebStorage() {
  if (Platform.OS !== "web") return null;
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export async function getItemAsync(key: string): Promise<string | null> {
  const webStorage = getWebStorage();
  if (webStorage) {
    try {
      return webStorage.getItem(key);
    } catch {
      return null;
    }
  }

  try {
    return await SecureStore.getItemAsync(key);
  } catch {
    return null;
  }
}

export async function setItemAsync(key: string, value: string): Promise<void> {
  const webStorage = getWebStorage();
  if (webStorage) {
    try {
      webStorage.setItem(key, value);
    } catch {
      // noop
    }
    return;
  }

  try {
    await SecureStore.setItemAsync(key, value);
  } catch {
    // noop
  }
}

export async function deleteItemAsync(key: string): Promise<void> {
  const webStorage = getWebStorage();
  if (webStorage) {
    try {
      webStorage.removeItem(key);
    } catch {
      // noop
    }
    return;
  }

  try {
    await SecureStore.deleteItemAsync(key);
  } catch {
    // noop
  }
}
