import NumberGrid from "./NumberGrid.jsx";
import ExtractedNumbers from "./ExtractedNumbers.jsx";

export default function SpettatorePanel({ ws }) {
  const { game, narration, firedTriggers } = ws;

  return (
    <div className="spettatore-panel">
      <div className="panel-block">
        <h2>Tabellone pubblico</h2>
        <p className="empty">
          Partita: <strong>{game?.name || "-"}</strong> · Fase: {narration?.phase || "-"}
        </p>
        <div className="console-grid">
          <NumberGrid extracted={game?.extractedNumbers || []} />
          <ExtractedNumbers numbers={game?.extractedNumbers || []} last={game?.currentNumber} />
        </div>
      </div>

      <div className="panel-block">
        <h2>Vincite</h2>
        <div className="wins-list">
          {game?.wins?.length === 0 && <p className="empty">Nessuna vincita ancora</p>}
          {game?.wins?.map((w, i) => (
            <div className="win-row" key={i}>
              <span className="win-type">{w.type.toUpperCase()}</span>
              <span className="win-player">{w.playerName || "?"}</span>
              {w.boardNumber ? <span>cart. {w.boardNumber}</span> : null}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
