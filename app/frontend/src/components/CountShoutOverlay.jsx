import PublicGameOverlay from "./PublicGameOverlay.jsx";
import GameCountdown from "./GameCountdown.jsx";

const REVEAL_MS = 5000;

// "Conta e grida": griglia di simboli natalizi; il pubblico conta quante volte
// compare il simbolo richiesto (a voce). Alla rivelazione le occorrenze del
// simbolo target vengono evidenziate e mostrato il conteggio. Niente controllo
// vincite: chi grida la cifra giusta vince.
export default function CountShoutOverlay({ minigame }) {
  return (
    <PublicGameOverlay minigame={minigame}>
      {(data) => {
        const cells = data?.cells || [];
        const cols = data?.cols || 5;
        const target = data?.payload?.target || "?";
        const answer = data?.payload?.answer;
        const revealed = Boolean(data?.revealed);
        return (
          <>
            <div className="minigame-head">
              <h1>Conta e grida!</h1>
              <p className="minigame-sub">
                Quanti <span className="count-target">{target}</span> ci sono? Grida il numero giusto!
              </p>
            </div>
            <GameCountdown minigame={data} />
            <div className="minigame-grid count-grid" style={{ "--cols": cols }}>
              {cells.map((sym, i) => (
                <div
                  key={i}
                  className={`count-cell${revealed && sym === target ? " is-target" : ""}`}
                  style={{ animationDelay: `${(i / Math.max(cells.length, 1)) * REVEAL_MS}ms` }}
                >
                  <span className="count-sym">{sym}</span>
                </div>
              ))}
            </div>
            {revealed && (
              <div className="count-answer">
                <span className="count-answer-sym">{target}</span> &times; {answer}
              </div>
            )}
          </>
        );
      }}
    </PublicGameOverlay>
  );
}