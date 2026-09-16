import { useMemo, useState } from "react";
import { WIN_ORDER, boardLabel, boardWinState } from "../utils/gameLogic.js";

// Controllo vincite: per ogni cartella in gioco mostra la vincita di riga
// raggiunta sui numeri estratti, evidenziando le celle che la compongono.
// Cliccando su una vincita nel riepilogo si filtrano le cartelle, mostrando
// solo quelle che l'hanno raggiunta.
// E' una postazione di lettura/verifica: le vincite vengono reclamate dalla
// console regia (DirectorPanel), qui compare solo cosa e' stato gia' reclamato.
export default function WinCheckPanel({ game }) {
  const extracted = game?.extractedNumbers || [];
  const extractedSet = new Set(extracted);
  const wonTypes = new Set(game?.wonTypes || []);
  const boards = game?.boards || [];
  const [filter, setFilter] = useState(null);

  const ranked = useMemo(() => {
    const rank = WIN_ORDER.reduce((m, t, i) => (m[t] = i, m), {});
    return boards
      .map((board, index) => {
        const state = boardWinState(board, extracted);
        return { board, index, state, claimed: wonTypes.has(state.type) };
      })
      .sort((a, b) => {
        const ra = a.state.type != null ? rank[a.state.type] : -1;
        const rb = b.state.type != null ? rank[b.state.type] : -1;
        return rb - ra;
      });
  }, [boards, extracted, wonTypes]);

  const summary = useMemo(() => {
    const countBy = {};
    ranked.forEach((r) => {
      if (r.state.type) countBy[r.state.type] = (countBy[r.state.type] || 0) + 1;
    });
    return WIN_ORDER.map((type) => ({
      type,
      claimed: wonTypes.has(type),
      count: countBy[type] || 0
    }));
  }, [ranked, wonTypes]);

  if (!game) return null;

  function toggleFilter(type) {
    setFilter((current) => (current === type ? null : type));
  }

  const visible = filter ? ranked.filter((r) => r.state.type === filter) : ranked;

  return (
    <div className="board-manager">
      <div className="bm-header">
        <h2>Controllo vincite ({boards.length} cartelle in gioco)</h2>
      </div>

      <div className="wc-summary">
        {summary.map((s) => (
          <button
            type="button"
            className={`wc-chip${s.claimed ? " wc-claimed" : ""}${s.count > 0 ? " wc-hit" : ""}${filter === s.type ? " wc-active" : ""}`}
            key={s.type}
            onClick={() => toggleFilter(s.type)}
            title={
              s.claimed
                ? "Vincita gia' reclamata nella console regia"
                : s.count > 0
                  ? `${s.count} cartella/e pronta/e: da reclamare?`
                  : "Nessuna cartella ha raggiunto questa vincita"
            }
          >
            <strong>{s.type}</strong>
            <span>
              {s.claimed ? " ✓ reclamato" : s.count > 0 ? ` · ${s.count} ${s.count === 1 ? "cartella" : "cartelle"}` : " · —"}
            </span>
          </button>
        ))}
        {filter && (
          <button type="button" className="wc-chip wc-reset" onClick={() => setFilter(null)}>
            Mostra tutte ({ranked.length})
          </button>
        )}
      </div>

      <div className="bm-list">
        {boards.length === 0 && <p className="empty">Nessuna cartella in gioco</p>}
        {boards.length > 0 && filter && visible.length === 0 && (
          <p className="empty">
            Nessuna cartella ha raggiunto la vincita "{filter}" ·{" "}
            <button className="btn-sm btn-ghost" onClick={() => setFilter(null)}>
              Mostra tutte
            </button>
          </p>
        )}
        {visible.map(({ board, index, state, claimed }) => (
          <div className="bm-item" key={index}>
            <div className="bm-item-head">
              <span className="bm-player">{boardLabel(board)}</span>
              {state.type && (
                <span className={`bm-win-tag${claimed ? " bm-win-claimed" : ""}`}>{state.type}</span>
              )}
              {board.boardNumber ? <span className="bm-number">Cartella n. {board.boardNumber}</span> : null}
              <span className="bm-number">{state.matched}/{state.total}</span>
            </div>
            <div className="bm-board">
              {board.rows.map((row, r) => (
                <div className="bm-board-row" key={r}>
                  {row.map((n, c) => {
                    let cls = "";
                    if (n != null && state.winning.has(n)) cls = "bm-cell-win";
                    else if (n != null && extractedSet.has(n)) cls = "bm-cell-matched";
                    return (
                      <span key={c} className={cls}>
                        {n ?? ""}
                      </span>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}