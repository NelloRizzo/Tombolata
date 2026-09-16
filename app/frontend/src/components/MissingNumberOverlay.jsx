import PublicGameOverlay from "./PublicGameOverlay.jsx";
import GameCountdown from "./GameCountdown.jsx";

const REVEAL_MS = 5000;

// "Che numero manca?": griglia con i numeri da 1 a N in ordine sparso, uno è
// assente (cella vuota). Il pubblico grida quale numero manca; alla rivelazione
// la cella vuota mostra il numero mancante. Niente controllo vincite: chi
// indovina per primo vince.
export default function MissingNumberOverlay({ minigame }) {
  return (
    <PublicGameOverlay minigame={minigame}>
      {(data) => {
        const cells = data?.cells || [];
        const cols = data?.cols || 3;
        const missing = data?.payload?.missing;
        const revealed = Boolean(data?.revealed);
        return (
          <>
            <div className="minigame-head">
              <h1>Che numero manca?</h1>
              <p className="minigame-sub">
                Da 1 a {data?.payload?.total || cells.length}, un numero non c'è: quale?
              </p>
            </div>
            <GameCountdown minigame={data} />
            <div className="minigame-grid missing-grid" style={{ "--cols": cols }}>
              {cells.map((n, i) => (
                <div
                  key={i}
                  className={`missing-cell${revealed && n === "" ? " is-missing" : ""}`}
                  style={{ animationDelay: `${(i / Math.max(cells.length, 1)) * REVEAL_MS}ms` }}
                >
                  <span className={`missing-num${revealed && n === "" ? " is-missing" : ""}`}>
                    {revealed && n === "" ? missing : n || "…"}
                  </span>
                </div>
              ))}
            </div>
            {revealed && (
              <div className="count-answer">
                Manca il <strong>{missing}</strong>
              </div>
            )}
          </>
        );
      }}
    </PublicGameOverlay>
  );
}