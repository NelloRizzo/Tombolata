// Banner "Soluzione" della console di regia: mostra la risposta corretta
// dell'ultimo gioco terminato (campo `solution` del documento Minigame, che il
// backend persiste anche dopo lo stop). Ignora i giochi senza risposta (memory).
const LABELS = {
  countShout: "Conta e grida",
  missingNumber: "Che numero manca?",
  numberHide: "Il numero nascosto",
  colorCount: "Colore più presente",
  anagram: "Anagramma",
  intruder: "Trova l'intruso",
  categories: "Parola a categorie"
};

export default function GameSolutionBanner({ solution, type }) {
  if (!solution || solution.kind !== type) return null;

  let content = null;
  if (type === "countShout") {
    content = (
      <>
        Risposta: <strong>{solution.target}</strong> &times; <strong>{solution.answer}</strong>
      </>
    );
  } else if (type === "missingNumber") {
    content = (
      <>
        Numero mancante: <strong>{solution.missing}</strong>
      </>
    );
  } else if (type === "numberHide") {
    content = (
      <>
        Numero <strong>{solution.number}</strong> nascosto in <strong>{solution.cell || "-"}</strong>
      </>
    );
  } else if (type === "colorCount") {
    content = (
      <>
        Colore più presente:{" "}
        <span className="color-swatch" style={{ background: solution.color || "transparent" }} />{" "}
        <strong>
          {solution.count}/{solution.total}
        </strong>
      </>
    );
  } else if (type === "anagram" || type === "intruder" || type === "categories") {
    content = (
      <>
        Parola: <strong>{solution.word}</strong>
        {solution.theme ? <> · {solution.theme}</> : null}
      </>
    );
  } else {
    return null;
  }

  return (
    <div className="game-solution">
      <span className="game-solution-tag">Soluzione</span>
      <span className="game-solution-text">
        <em>{LABELS[type]}:</em> {content}
      </span>
    </div>
  );
}
