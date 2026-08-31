import { useEffect, useMemo, useRef, useState } from "react";
import { apiRequest } from "../api.js";

function cardLabel(card) {
  const parts = [];
  if (card.title) parts.push(card.title);
  if (card.setNumber != null) parts.push(`S.${card.setNumber}`);
  if (card.cardNumber != null) parts.push(`n.${card.cardNumber}`);
  return parts.join(" · ");
}

// Espone le righe a 9 colonne (tombola italiana) indipendentemente dal formato
// di存储: 5 celle → mappa nella colonna giusta; 9 celle → già pronto.
function toNineCols(rows) {
  return rows.map((row) => {
    if (row.length === 9) return row;
    const out = Array(9).fill(null);
    for (const n of row) {
      if (n == null) continue;
      let col;
      if (n <= 10) col = 0;
      else if (n <= 19) col = 1;
      else if (n <= 29) col = 2;
      else if (n <= 39) col = 3;
      else if (n <= 49) col = 4;
      else if (n <= 59) col = 5;
      else if (n <= 69) col = 6;
      else if (n <= 79) col = 7;
      else col = 8;
      if (out[col] == null) out[col] = n;
    }
    return out;
  });
}

// Archivio globale di cartelle (slegate dalle partite). Qui si importa il file
// .cards e si selezionano le cartelle da "mettere in gioco" nella partita
// corrente (singole, per espressione regolare o tutte insieme).
export default function CardInventory({ game }) {
  const [cards, setCards] = useState([]);
  const [regex, setRegex] = useState("");
  const [regexError, setRegexError] = useState(null);
  const [selected, setSelected] = useState(new Set());
  const [expanded, setExpanded] = useState(new Set());
  const [error, setError] = useState(null);
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef(null);

  async function refresh() {
    try {
      const json = await apiRequest("/api/cards");
      if (json.ok) setCards(json.data || []);
    } catch (e) {
      setError(e.message);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  const filtered = useMemo(() => {
    if (!regex.trim()) return cards;
    let re;
    try {
      re = new RegExp(regex.trim(), "i");
    } catch {
      return cards;
    }
    return cards.filter((c) => re.test(cardLabel(c)));
  }, [cards, regex]);

  function toggleSelect(id) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleExpand(id) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function onRegexChange(value) {
    setRegex(value);
    setRegexError(null);
    if (value.trim()) {
      try {
        new RegExp(value.trim(), "i");
      } catch {
        setRegexError("Espressione regolare non valida");
      }
    }
  }

  async function onImportFile(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError(null);
    setMsg(null);
    setBusy(true);
    try {
      const text = await file.text();
      const json = await apiRequest("/api/cards/import", {
        method: "POST",
        body: JSON.stringify({ xml: text })
      });
      setMsg(
        `Importate ${json.summary.imported} cartelle nell'archivio · saltate ${json.summary.skipped}`
      );
      await refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function putInPlay() {
    if (!game) {
      setError("Nessuna partita selezionata: scegline una dal menu in alto");
      return;
    }
    if (selected.size === 0) {
      setError("Seleziona almeno una cartella (oppure usa 'Tutte')");
      return;
    }
    setError(null);
    setMsg(null);
    setBusy(true);
    try {
      const json = await apiRequest(`/api/game/${game._id}/boards/from-cards`, {
        method: "POST",
        body: JSON.stringify({ cardIds: [...selected] })
      });
      setMsg(
        `Messe in gioco ${json.summary.added} cartelle · ${json.summary.skipped} già presenti`
      );
      setSelected(new Set());
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="board-manager">
      <div className="bm-header">
        <h2>Archivio cartelle ({cards.length})</h2>
        <div className="bm-actions">
          <input ref={fileRef} type="file" accept=".cards,.xml,text/xml" hidden onChange={onImportFile} />
          <button
            className="btn-sm"
            onClick={() => fileRef.current?.click()}
            disabled={busy}
            title="Importa un file .cards/.xml (es. tombola.cards)"
          >
            Importa da file…
          </button>
        </div>
      </div>

      {error && <div className="error-text">{error}</div>}
      {msg && <div className="import-ok">{msg}</div>}

      <div className="ci-toolbar">
        <label className="ci-regex">
          <span>Filtro (regex):</span>
          <input
            type="text"
            value={regex}
            onChange={(e) => onRegexChange(e.target.value)}
            placeholder='Es. "Primo Giro" o "S\. 1"'
          />
        </label>

        <div className="ci-select-all">
          <button className="btn-sm" onClick={() => setSelected(new Set(filtered.map((c) => String(c._id))))}>
            Tutte (filtrate)
          </button>
          <button className="btn-sm" onClick={() => setSelected(new Set(cards.map((c) => String(c._id))))}>
            Tutte
          </button>
          <button className="btn-sm btn-ghost" onClick={() => setSelected(new Set())}>
            Nessuna
          </button>
        </div>

        <button
          className="btn-sm btn-accent"
          onClick={putInPlay}
          disabled={busy || selected.size === 0 || !game}
          title={game ? "Copia le cartelle selezionate nella partita corrente" : "Scegli una partita dal menu in alto"}
        >
          Metti in gioco ({selected.size})
        </button>
      </div>

      {regexError && <div className="error-text">{regexError}</div>}
      {!game && <div className="error-text">Seleziona una partita dal menu in alto per mettere le cartelle in gioco.</div>}

      <div className="ci-list">
        {cards.length === 0 && <p className="empty">Archivio vuoto: importa un file .cards/.xml.</p>}
        {cards.map((card) => {
          const isExpanded = expanded.has(String(card._id));
          const rows9 = toNineCols(card.rows || []);
          return (
            <div
              className={`ci-item${isExpanded ? " ci-expanded" : ""}`}
              key={card._id}
            >
              <input
                type="checkbox"
                checked={selected.has(String(card._id))}
                onChange={() => toggleSelect(String(card._id))}
                onClick={(e) => e.stopPropagation()}
              />
              <div className="ci-body">
                <div
                  className="ci-label"
                  onClick={() => toggleExpand(String(card._id))}
                  title={isExpanded ? "Comprimi" : "Espandi"}
                >
                  {cardLabel(card) || "Cartella"}
                  <span className="ci-chevron">{isExpanded ? "▲" : "▼"}</span>
                </div>
                {isExpanded && (
                  <div className="ci-board">
                    {rows9.map((row, r) => (
                      <div className="ci-board-row" key={r}>
                        {row.map((n, c) => (
                          <span key={c} className={n != null ? "ci-cell" : "ci-cell ci-empty"}>
                            {n ?? ""}
                          </span>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}