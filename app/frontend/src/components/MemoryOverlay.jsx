import PublicGameOverlay from "./PublicGameOverlay.jsx";
import GameCountdown from "./GameCountdown.jsx";
import { boardLabel } from "../utils/boardLabels.js";

// Memory a coppie: griglia di carte numerate (scacchiera). Coppie coperte;
// il regista scopre due carte alla volta (mismatch → si rigirano da sole).
// Niente controllo vincite: la coppia la dà il pubblico a voce.
export default function MemoryOverlay({ minigame }) {
  return (
    <PublicGameOverlay minigame={minigame}>
      {(data) => {
        const cards = data?.cards || [];
        const cols = data?.cols || 4;
        const rows = data?.rows || 3;
        return (
          <>
            <div className="minigame-head">
              <h1>Memory a coppie</h1>
              <p className="minigame-sub">
                Chiama due caselle (lettera+numero): le carte si scoprono e mostrano i simboli
              </p>
            </div>
            <GameCountdown minigame={data} />
            <div
              className="minigame-grid memory-grid"
              style={{ "--cols": cols, aspectRatio: `${cols} / ${rows}` }}
            >
              {cards.map((card, i) => (
                <div key={i} className={`memory-card ${card.face}`}>
                  <span className="cell-coord">{boardLabel(i, cols)}</span>
                  <span className="memory-sym">
                    {card.face === "down" ? "?" : card.sym}
                  </span>
                </div>
              ))}
            </div>
          </>
        );
      }}
    </PublicGameOverlay>
  );
}