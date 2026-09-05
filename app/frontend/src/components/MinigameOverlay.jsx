// Overlay pubblico del minigioco "colorCount": un riquadro di quadrati che si
// colorano in 5 secondi; i giocatori osservano e devono indovinare il colore
// più presente. Non c'è alcun controllo vincite: la partecipazione e il
// vincitore sono gestiti a mano dal presentatore. Sostituisce il tabellone.
const REVEAL_MS = 5000;

export default function MinigameOverlay({ minigame }) {
  const active = minigame?.overlayActive;
  if (!active) return null;

  const total = minigame?.totalSquares || 0;
  const colors = minigame?.colors || [];
  const status = minigame?.status || "running";
  const cols = total > 0 ? Math.ceil(Math.sqrt(total)) : 10;
  const shown = status === "done";
  const cells = Array.from({ length: total }, (_, i) => ({
    color: colors[i] || "#cccccc",
    delay: (i / Math.max(total, 1)) * REVEAL_MS
  }));

  return (
    <div className="minigame-overlay">
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
