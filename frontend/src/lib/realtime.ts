import { useEffect, useRef, useState } from "react";

export type ConnState = "connecting" | "online" | "offline";

/**
 * Connects to the backend WebSocket and calls `onChange(resource)` whenever any
 * browser mutates data. Auto-reconnects with backoff. Returns connection state
 * so the UI can show a live indicator.
 */
export function useRealtime(onChange: (resource: string) => void): ConnState {
  const [state, setState] = useState<ConnState>("connecting");
  const cb = useRef(onChange);
  cb.current = onChange;

  useEffect(() => {
    let ws: WebSocket | null = null;
    let closed = false;
    let retry = 0;
    let timer: ReturnType<typeof setTimeout>;

    const connect = () => {
      // Use the configured backend origin when the frontend is hosted separately,
      // otherwise the current origin (single-server prod mode / dev proxy).
      const apiUrl = import.meta.env.VITE_API_URL;
      const host = apiUrl ? new URL(apiUrl).host : location.host;
      const secure = apiUrl ? new URL(apiUrl).protocol === "https:" : location.protocol === "https:";
      const proto = secure ? "wss" : "ws";
      ws = new WebSocket(`${proto}://${host}/ws`);
      setState(retry === 0 ? "connecting" : "connecting");

      ws.onopen = () => {
        retry = 0;
        setState("online");
      };
      ws.onmessage = (evt) => {
        try {
          const data = JSON.parse(evt.data);
          if (data?.type === "changed" && data.resource) cb.current(data.resource);
        } catch {
          /* ignore */
        }
      };
      ws.onclose = () => {
        if (closed) return;
        setState("offline");
        retry += 1;
        const delay = Math.min(1000 * 2 ** retry, 10000);
        timer = setTimeout(connect, delay);
      };
      ws.onerror = () => ws?.close();
    };

    connect();
    return () => {
      closed = true;
      clearTimeout(timer);
      ws?.close();
    };
  }, []);

  return state;
}
