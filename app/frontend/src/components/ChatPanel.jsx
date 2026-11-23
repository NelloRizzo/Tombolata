import { useEffect, useRef, useState } from "react";
import { apiRequest } from "../api.js";
import { useWebSocket } from "../hooks/useWebSocket.js";

export default function ChatPanel({ gameId }) {
  const { on } = useWebSocket(gameId);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const listRef = useRef(null);

  const gid = gameId || null;

  async function load() {
    try {
      const qs = gid ? `?gameId=${encodeURIComponent(gid)}` : "";
      const json = await apiRequest(`/api/chat${qs}`);
      if (json.ok) setMessages(json.data || []);
    } catch (e) {
      setError(e.message);
    }
  }

  useEffect(() => {
    load();
  }, [gid]);

  useEffect(() => {
    const off = on("chat:message", (m) => {
      if (!m) return;
      setMessages((prev) => {
        if (prev.some((x) => String(x._id) === String(m._id))) return prev;
        return [...prev, m];
      });
    });
    return () => off();
  }, [on]);

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages]);

  async function send(e) {
    e?.preventDefault?.();
    const t = text.trim();
    if (!t) return;
    setSending(true);
    setError(null);
    try {
      const json = await apiRequest("/api/chat", {
        method: "POST",
        body: JSON.stringify({ text: t, gameId: gid })
      });
      if (!json.ok) throw new Error(json.message || "Errore invio");
      // Il messaggio arriverà anche via WebSocket; aggiungiamo subito per reattività
      setMessages((prev) => {
        if (prev.some((x) => String(x._id) === String(json.data._id))) return prev;
        return [...prev, json.data];
      });
      setText("");
    } catch (e) {
      setError(e.message);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="chat-panel">
      {error && <div className="error-banner">{error}</div>}
      <div className="chat-messages" ref={listRef}>
        {messages.length === 0 && <p className="empty">Nessun messaggio</p>}
        {messages.map((m) => (
          <div key={m._id} className="chat-msg">
            <span className="chat-sender">{m.sender}</span>
            <span className="chat-role">({m.senderRole})</span>
            <span className="chat-text">{m.text}</span>
            <span className="chat-time">
              {m.createdAt ? new Date(m.createdAt).toLocaleTimeString() : ""}
            </span>
          </div>
        ))}
      </div>
      <form className="chat-input" onSubmit={send}>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Scrivi un messaggio al regista..."
          disabled={sending}
        />
        <button type="submit" className="btn-sm btn-accent" disabled={sending || !text.trim()}>
          Invia
        </button>
      </form>
    </div>
  );
}
