import PublicGameOverlay from "./PublicGameOverlay.jsx";
import GameCountdown from "./GameCountdown.jsx";

// "Parola a categorie" (indovina la parola): il tabellone mostra una categoria
// e, uno alla volta, gli indizi svelati dal regista; il pubblico indovina la
// parola segreta. Alla rivelazione appare la parola. Niente controllo vincite:
// chi indovina per primo (a voce) vince.
export default function CategoriesOverlay({ minigame }) {
  return (
    <PublicGameOverlay minigame={minigame}>
      {(data) => {
        const category = data?.payload?.category;
        const hints = data?.payload?.hints || [];
        const shown = Math.min(data?.revealedHints || 0, hints.length);
        const word = data?.payload?.word;
        const revealed = Boolean(data?.revealed);
        return (
          <>
            <div className="minigame-head">
              <h1>Indovina la parola</h1>
              {category && <p className="minigame-sub category-tag">{category}</p>}
            </div>
            <GameCountdown minigame={data} />
            <ul className="category-hints">
              {hints.slice(0, shown).map((h, i) => (
                <li key={i} className="category-hint">
                  <span className="category-hint-num">{i + 1}</span>
                  {h}
                </li>
              ))}
              {shown === 0 && !revealed && (
                <li className="category-hint empty">In attesa del primo indizio…</li>
              )}
            </ul>
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
