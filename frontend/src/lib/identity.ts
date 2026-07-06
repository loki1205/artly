// A single anonymous per-browser identity. No login, no username — just a UUID
// persisted in localStorage. It scopes votes (one per browser) and is sent as
// X-Client-Id on every request. It is never shown to anyone.
const KEY = "artly:client-id";

function makeUuid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

let cached: string | null = null;

export function clientId(): string {
  if (cached) return cached;
  let id = localStorage.getItem(KEY);
  if (!id) {
    id = makeUuid();
    localStorage.setItem(KEY, id);
  }
  cached = id;
  return id;
}
