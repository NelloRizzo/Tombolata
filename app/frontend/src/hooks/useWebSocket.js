import { useEffect, useRef, useState, useCallback } from "react";

const BACKEND_URL =
  (import.meta.env.VITE_BACKEND_URL && import.meta.env.VITE_BACKEND_URL.trim()) ||
  "http://localhost:3001";

function wsUrl() {
  const withProtocol = (url) =>
    url.startsWith("http") ? url : `http://${url}`;
  const clean = withProtocol(BACKEND_URL).replace(/\/$/, "");
  return clean.replace(/^http/, "ws") + "/ws";
}

export function getBackendUrl() {
  return BACKEND_URL;
}

export function apiUrl(path) {
  const clean = BACKEND_URL.replace(/\/$/, "");
  return `${clean}${path}`;
}

export function useWebSocket(gameId = null) {
  const [connected, setConnected] = useState(false);
  const wsRef = useRef(null);
  const listenersRef = useRef({});

  const on = useCallback((type, handler) => {
    if (!listenersRef.current[type]) listenersRef.current[type] = [];
    listenersRef.current[type].push(handler);
    return () => {
      listenersRef.current[type] = listenersRef.current[type].filter(
        (h) => h !== handler
      );
    };
  }, []);

  useEffect(() => {
    const connect = () => {
      const query = gameId ? `?gameId=${encodeURIComponent(gameId)}` : "";
      const ws = new WebSocket(wsUrl() + query);
      wsRef.current = ws;

      ws.onopen = () => {
        setConnected(true);
        emit("connected", {});
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          emit(message.type, message.payload);
        } catch (err) {
          // ignora
        }
      };

      ws.onclose = () => {
        setConnected(false);
        setTimeout(connect, 3000);
      };

      ws.onerror = () => {
        ws.close();
      };
    };

    connect();
    return () => {
      if (wsRef.current) wsRef.current.close();
    };
  }, [gameId]);

  const emit = (type, payload) => {
    const handlers = listenersRef.current[type] || [];
    handlers.forEach((h) => h(payload));
  };

  return { connected, on };
}
