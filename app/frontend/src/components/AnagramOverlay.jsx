import PublicGameOverlay from "./PublicGameOverlay.jsx";
import GameCountdown from "./GameCountdown.jsx";

// "Anagramma": il tabellone mostra le lettere di una parola mescolate (e un
// eventuale indizio); il pubblico indovina la parola. Alla rivelazione appare
// la parola corretta. Niente controllo vincite: chi indovina per primo vince.
export default function AnagramOverlay({ minigame }) {
  return (
    <PublicGameOverlay minigame={minigame}>
      {(data) => {
        const letters = data?.cells || [];
        const hint = data?.payload?.hint;
        const word = data?.payload?.word;
        const revealed = Boolean(data?.revealed);
        return (
          <>
            <div className="minigame-head">
              <h1>Anagramma</h1>
              <p className="minigame-sub">
                {hint ? <span className="anagram-hint">{hint}</span> : "Rimetti in ordine le lettere!"}
              </p>
            </div>
            <GameCountdown minigame={data} />
            <div className="anagram-tiles">
              {letters.map((ch, i) => (
                <div key={i} className="anagram-tile">
                  {ch}
                </div>
              ))}
            </div>
            {revealed && (
              <div className="count-answer">
                La parola era <strong>{word}</strong>
              </div>
            )}
          </>
        );
      }}
    </PublicGameOverlay>
  );
}
