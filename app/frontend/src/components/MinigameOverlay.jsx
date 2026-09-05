import { useEffect, useState } from "react";

// Overlay pubblico del minigioco "colorCount": un riquadro di quadrati che si
// colorano in 5 secondi; i giocatori osservano e devono indovinare il colore
// più presente. Non c'è alcun controllo vincite. Sostituisce il tabellone
// con un effetto scenico di apparizione e, quando il gioco si chiude (auto
// allo scadere della presentazione gestita dal backend, o Termina dal regista),
// svanisce con lo stesso effetto scenico reattivo allo stato idle.
const REVEAL_MS = 5000;
const EXIT_MS = 700;

export default function MinigameOverlay({ minigame }) {
  const active = minigame?.overlayActive;
  const [leaving, setLeaving] = useState(false);
  const [mounted, setMounted] = useState(false);

  // All'attivazione fa partire l'effetto di ingresso scenico.
  useEffect(() => {
    if (active) {
      setMounted(true);
      setLeaving(false);
    }
  }, [active]);

  // Quando lo stato diventa idle (il gioco è stato terminato) viene animata
  // l'uscita scenica e poi l'overlay viene smontato.
  useEffect(() => {
    if (!active && mounted) {
      setLeaving(true);
      const t = setTimeout(() => setMounted(false), EXIT_MS);
      return () => clearTimeout(t);
    }
  }, [active, mounted]);

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