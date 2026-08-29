import { apiUrl } from "./hooks/useWebSocket.js";

const TOKEN_KEY = "tombolata_token";

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function authHeaders(extra = {}) {
  const token = getToken();
  const headers = { ...extra };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (!(extra && extra["Content-Type"])) headers["Content-Type"] = "application/json";
  return headers;
}

export async function apiRequest(path, options = {}) {
  const res = await fetch(apiUrl(path), {
    ...options,
    headers: authHeaders(options.headers)
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok && !json.ok) {
    throw new Error(json.message || `Errore ${res.status}`);
  }
  return json;
}
