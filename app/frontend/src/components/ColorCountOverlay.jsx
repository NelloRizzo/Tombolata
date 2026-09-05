import PublicGameOverlay from "./PublicGameOverlay.jsx";
import GameCountdown from "./GameCountdown.jsx";
import { boardLabel, squareCols } from "../utils/boardLabels.js";

const REVEAL_MS = 5000;

// Gioco "colore più presente": un riquadro di quadrati numerati (coordinate a
// scacchiera, es. A1, B3) che si colorano in 5 secondi; i giocatori osservano
// il colore più presente e lo chiamano a voce. Nessun controllo vincite.
export default function ColorCountOverlay({ minigame }) {
  return (
    <PublicGameOverlay minigame={minigame}>
      {(data) => {
        const total = data?.totalSquares || 0;
        const colors = data?.colors || [];
        const status = data?.status || "running";
        const cols = total > 0 ? squareCols(total) : 10;
        const shown = status === "done";
        const cells = Array.from({ length: total }, (_, i) => ({
          color: colors[i] || "#cccccc",
          delay: (i / Math.max(total, 1)) * REVEAL_MS
        }));
        return (
          <>
            <div className="minigame-head">
              <h1>Indovina il colore più presente!</h1>
              <p className="minigame-sub">
                Guarda i quadrati (lettera+numero) e chiama il colore più presente
              </p>
            </div>
            <GameCountdown minigame={data} />
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
                >
                  <span className="cell-coord">{boardLabel(i, cols)}</span>
                </div>
              ))}
            </div>
          </>
        );
      }}
    </PublicGameOverlay>
  );
}