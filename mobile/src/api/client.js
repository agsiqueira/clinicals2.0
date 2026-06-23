import { deleteItemAsync, getItemAsync, setItemAsync } from "../utils/storage";

const BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL;
const REQUEST_TIMEOUT_MS = 10000;
const TOKEN_READ_TIMEOUT_MS = 1500;

if (!BASE_URL) {
  throw new Error("Missing EXPO_PUBLIC_API_BASE_URL in .env");
}

const API_PREFIX = "/api";

function withTimeout(promise, ms, fallback) {
  return Promise.race([
    promise,
    new Promise((resolve) => setTimeout(() => resolve(fallback), ms)),
  ]);
}

async function getStoredToken() {
  try {
    return await withTimeout(
      getItemAsync("token"),
      TOKEN_READ_TIMEOUT_MS,
      null
    );
  } catch {
    return null;
  }
}

async function request(path, { method = "GET", body, headers } = {}) {
  const token = await getStoredToken();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let res;
  try {
    res = await fetch(`${BASE_URL}${API_PREFIX}${path}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(headers || {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
  } catch (err) {
    if (err?.name === "AbortError") {
      throw new Error(
        `Request timed out. Verify EXPO_PUBLIC_API_BASE_URL (${BASE_URL}) and that the backend is reachable from this device.`
      );
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }

  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text; // if backend returns non-JSON
  }

  if (!res.ok) {
    const msg =
      (data && (data.error || data.message)) ||
      `Request failed: ${res.status} ${res.statusText}`;
    const err = new Error(msg);
    err.status = res.status;
    err.data = data;
    throw err;
  }

  return data;
}

export const api = {
  // ---- Test: health / ping
  health: () => request("/health"),

  // ---- Auth (edit paths + fields to match your backend)
  login: async (email, password) => {
    const data = await request("/auth/login", {
      method: "POST",
      body: { email, password },
    });
    // Expecting { token: "..." } from backend
    if (data?.token) await setItemAsync("token", data.token);
    return data;
  },

  logout: async () => {
    await deleteItemAsync("token");
  },

  // to view previous attempts for a case
  getAttemptsByCase: (caseId, headers) => request(`/conversations/by-case/${caseId}`, { headers }),

  // ---- Example resource calls (edit paths to match your backend)
  getCases: () => request("/cases"),
  getCaseById: (id) => request(`/cases/${id}`),
  getProgress: (headers) => request("/progress", { headers }),

  // Example: create a case
  createCase: (payload) =>
    request("/cases", { method: "POST", body: payload }),
};
