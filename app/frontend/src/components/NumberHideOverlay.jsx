import PublicGameOverlay from "./PublicGameOverlay.jsx";
import GameCountdown from "./GameCountdown.jsx";

const REVEAL_MS = 5000;
const ACCENTS = ["#ef4444", "#22c55e", "#3b82f6", "#eab308", "#ec4899", "#14b8a6"];

// "Il numero nascosto": griglia di celle numerate che si colorano a cascata;
// una cella custodisce un numero segreto. Il pubblico scommette in quale
// casella è nascosto; il regista lo rivela ("is-hidden" + numero). Niente
// controllo vincite: chi chiama la casella giusta vince a voce.
export default function NumberHideOverlay({ minigame }) {
  return (
    <PublicGameOverlay minigame={minigame}>
      {(data) => {
        const cells = data?.cells || [];
        const cols = data?.cols || 4;
        const hiddenIndex = data?.hiddenIndex;
        const hiddenNumber = data?.hiddenNumber;
        const revealed = Boolean(data?.revealed);
        return (
          <>
            <div className="minigame-head">
              <h1>Il numero nascosto</h1>
              <p className="minigame-sub">
                Un numero si nasconde in una casella: quale sarà? Chiama la tua
              </p>
            </div>
            <GameCountdown minigame={data} />
            <div className="minigame-grid" style={{ "--cols": cols }}>
              {cells.map((label, i) => {
                const isHidden = revealed && i === hiddenIndex;
                return (
                  <div
                    key={i}
                    className={`hide-cell ${isHidden ? "is-hidden" : ""}`}
                    style={{
                      background: ACCENTS[i % ACCENTS.length],
                      animationDelay: `${(i / Math.max(cells.length, 1)) * REVEAL_MS}ms`
                    }}
                  >
                    <span className="cell-coord">{label}</span>
                    {isHidden && <span className="hide-num">{hiddenNumber}</span>}
                  </div>
                );
              })}
            </div>
          </>
        );
      }}
    </PublicGameOverlay>
  );
}