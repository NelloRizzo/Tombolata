import PublicGameOverlay from "./PublicGameOverlay.jsx";
import GameCountdown from "./GameCountdown.jsx";

// "Trova l'intruso": il tabellone mostra alcune parole; una non c'entra col
// tema. Il pubblico chiama la parola sbagliata; alla rivelazione l'intruso
// viene evidenziato e compare il tema. Niente controllo vincite: vince chi
// indovina per primo.
export default function IntruderOverlay({ minigame }) {
  return (
    <PublicGameOverlay minigame={minigame}>
      {(data) => {
        const words = data?.payload?.words || data?.cells || [];
        const intruderIndex = data?.payload?.intruderIndex;
        const theme = data?.payload?.theme;
        const revealed = Boolean(data?.revealed);
        return (
          <>
            <div className="minigame-head">
              <h1>Trova l'intruso</h1>
              <p className="minigame-sub">Una di queste parole non c'entra: quale?</p>
            </div>
            <GameCountdown minigame={data} />
            <div className="intruder-grid">
              {words.map((w, i) => (
                <div
                  key={i}
                  className={`intruder-card${revealed && i === intruderIndex ? " is-intruder" : ""}`}
                >
                  {w}
                </div>
              ))}
            </div>
            {revealed && (
              <div className="count-answer">
                L'intruso era <strong>{words[intruderIndex]}</strong>
                {theme ? <> · {theme}</> : null}
              </div>
            )}
          </>
        );
      }}
    </PublicGameOverlay>
  );
}
