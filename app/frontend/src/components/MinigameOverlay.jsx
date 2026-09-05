import { useEffect, useRef, useState } from "react";
import { apiRequest } from "../api.js";

// Overlay pubblico del minigioco "colorCount": un riquadro di quadrati che si
// colorano in 5 secondi; i giocatori osservano e devono indovinare il colore
// più presente. Non c'è alcun controllo vincite. Sostituisce il tabellone
// con un effetto scenico di apparizione e, allo scadere della presentazione
// (presentSeconds scelto dal regista), svanisce con lo stesso effetto scenico.
const REVEAL_MS = 5000;
const EXIT_MS = 700;

export default function MinigameOverlay({ minigame, gameId, autoStop = false }) {
  const active = minigame?.overlayActive;
  const [leaving, setLeaving] = useState(false);
  const [mounted, setMounted] = useState(false);
  const stoppedRef = useRef(false);
  const exitTimerRef = useRef(null);

  // All'attivazione fa partire l'effetto di ingresso scenico.
  useEffect(() => {
    if (active) {
      setMounted(true);
      setLeaving(false);
      stoppedRef.current = false;
    }
  }, [active]);

  // Auto-chiusura: quando il tempo di presentazione è scaduto, fa uscire
  // l'overlay con effetto scenico e poi chiude il gioco (solo il tabellone
  // pubblico guida lo stop; gli altri client si limitano a reagire).
  useEffect(() => {
    if (!active || !autoStop || !minigame?.expiresAt) return;
    const remaining = new Date(minigame.expiresAt).getTime() - Date.now();
    const t = setTimeout(() => {
      setLeaving(true);
      exitTimerRef.current = setTimeout(async () => {
        // la chiusura effettiva avviene via /stop (broadcast idle).
        if (!stoppedRef.current) {
          stoppedRef.current = true;
          try {
            await apiRequest("/api/games/color/stop", {
              method: "POST",
              body: gameId ? JSON.stringify({ gameId }) : undefined
            });
          } catch {
            // ignora
          }
        }
      }, EXIT_MS);
    }, Math.max(0, remaining));
    return () => clearTimeout(t);
  }, [active, autoStop, minigame?.expiresAt, gameId]);

  // Uscita scenica anche quando il gioco viene terminato dal regista:
  // ricevendo overlayActive=false, anima la chiusura prima di smontarsi.
  useEffect(() => {
    if (!active && mounted) {
      setLeaving(true);
      const t = setTimeout(() => setMounted(false), EXIT_MS);
      return () => clearTimeout(t);
    }
  }, [active, mounted]);

  useEffect(() => {
    return () => {
      if (exitTimerRef.current) clearTimeout(exitTimerRef.current);
    };
  }, []);

  if (!mounted && !active) return null;

  const total = minigame?.totalSquares || 0;
  const colors = minigame?.colors || [];
  const status = minigame?.status || "running";
  const cols = total > 0 ? Math.ceil(Math.sqrt(total)) : 10;
  const shown = status === "done" || leaving;
  const cells = Array.from({ length: total }, (_, i) => ({
    color: colors[i] || "#cccccc",
    delay: (i / Math.max(total, 1)) * REVEAL_MS
  }));

  return (
    <div className={`minigame-overlay ${leaving ? "leaving" : "entering"}`}>
      <div className="minigame-head">
        <h1>Indovina il colore più presente!</h1>
      </div>
      <div
        className={`minigame-grid ${shown ? "revealed" : ""}`}
        style={{ "--cols": cols }}
      >
        {cells.map((c, i) => (
          <div
            key={i}
            className="minigame-cell"
            style={{
              background: c.color,
              animationDelay: shown ? undefined : `${c.delay}ms`
            }}
          />
        ))}
      </div>
    </div>
  );
}