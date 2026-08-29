import { useState } from "react";
import { apiRequest } from "../api.js";

function BoardForm({ onAdd, onCancel }) {
  const [playerName, setPlayerName] = useState("");
  const [boardNumber, setBoardNumber] = useState("");
  const [rows, setRows] = useState([
    ["", "", "", "", ""],
    ["", "", "", "", ""],
    ["", "", "", "", ""]
  ]);
  const [error, setError] = useState(null);

  function updateCell(r, c, value) {
    const next = rows.map((row, ri) =>
      ri === r ? row.map((cell, ci) => (ci === c ? value : cell)) : row
    );
    setRows(next);
  }

  function autoFill() {
    const used = new Set();
    const random = () => {
      let n;
      do {
        n = Math.floor(Math.random() * 90) + 1;
      } while (used.has(n));
      used.add(n);
      return n;
    };
    setRows([
      [random(), random(), random(), random(), random()],
      [random(), random(), random(), random(), random()],
      [random(), random(), random(), random(), random()]
    ]);
  }

  function submit() {
    setError(null);
    if (!playerName.trim()) {
      setError("Inserisci il nome del giocatore");
      return;
    }
    const parsed = rows.map((row) => row.map((cell) => parseInt(cell, 10)));
    const flat = parsed.flat();
    if (flat.some((n) => Number.isNaN(n))) {
      setError("Tutti i 15 numeri sono obbligatori");
      return;
    }
    if (flat.some((n) => n < 1 || n > 90)) {
      setError("I numeri devono essere tra 1 e 90");
      return;
    }
    const uniq = new Set(flat);
    if (uniq.size !== flat.length) {
      setError("I numeri non devono ripetersi");
      return;
    }
    const boardNum = boardNumber.trim() === "" ? null : parseInt(boardNumber, 10);
    onAdd({
      playerName: playerName.trim(),
      boardNumber: boardNum,
      rows: parsed
    });
  }

  return (
    <div className="board-form">
      <h3>Nuova cartella</h3>

      <div className="bf-fields">
        <label>
          Nome giocatore
          <input
            type="text"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            placeholder="Es. Marco"
          />
        </label>
        <label>
          N. cartella (opzionale)
          <input
            type="number"
            value={boardNumber}
            onChange={(e) => setBoardNumber(e.target.value)}
            placeholder="Es. 1"
          />
        </label>
      </div>

      <div className="bf-rows">
        {rows.map((row, r) => (
          <div className="bf-row" key={r}>
            {row.map((cell, c) => (
              <input
                key={c}
                type="number"
                min="1"
                max="90"
                value={cell}
                onChange={(e) => updateCell(r, c, e.target.value)}
              />
            ))}
          </div>
        ))}
      </div>

      <div className="bf-actions">
        <button type="button" className="btn-sm" onClick={autoFill}>
          Compila casuale
        </button>
        <button type="button" className="btn-sm btn-accent" onClick={submit}>
          Aggiungi
        </button>
        <button type="button" className="btn-sm btn-ghost" onClick={onCancel}>
          Annulla
        </button>
      </div>

      {error && <div className="error-text">{error}</div>}
    </div>
  );
}

export default function BoardManager({ game }) {
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState(null);

  async function add(boardData) {
    setError(null);
    try {
      const json = await apiRequest(`/api/game/${game._id}/boards`, {
        method: "POST",
        body: JSON.stringify(boardData)
      });
      setShowForm(false);
    } catch (e) {
      setError(e.message);
    }
  }

  async function remove(index) {
    setError(null);
    try {
      await apiRequest(`/api/game/${game._id}/boards/${index}`, { method: "DELETE" });
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <div className="board-manager">
      <div className="bm-header">
        <h2>Cartelle in gioco ({game.boards?.length || 0})</h2>
        <button className="btn-sm btn-accent" onClick={() => setShowForm((v) => !v)}>
          {showForm ? "Chiudi" : "Aggiungi cartella"}
        </button>
      </div>

      {error && <div className="error-text">{error}</div>}

      {showForm && <BoardForm onAdd={add} onCancel={() => setShowForm(false)} />}

      <div className="bm-list">
        {game.boards?.length === 0 && <p className="empty">Nessuna cartella in gioco</p>}
        {game.boards?.map((board, i) => (
          <div className="bm-item" key={i}>
            <div className="bm-item-head">
              <span className="bm-player">{board.playerName}</span>
              {board.boardNumber ? (
                <span className="bm-number">Cartella n. {board.boardNumber}</span>
              ) : null}
              <button className="btn-sm btn-ghost" onClick={() => remove(i)}>
                Rimuovi
              </button>
            </div>
            <div className="bm-board">
              {board.rows.map((row, r) => (
                <div className="bm-board-row" key={r}>
                  {row.map((n, c) => (
                    <span key={c}>{n}</span>
                  ))}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
