import { useEffect, useMemo, useRef, useState } from "react";
import { apiRequest } from "../api.js";
import ConfirmModal from "./ConfirmModal.jsx";

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

// Vincita piu' alta raggiunta da una cartella sui numeri estratti, coerente
// con la logica del gioco: vincite di riga (ambo…cinquina) o tombola completa.
const CARD_WIN_ORDER = ["cinquina", "quaterna", "terno", "ambo"];
function cardHighestWin(rows, extracted) {
  const extractedSet = new Set(extracted);
  const all = rows.flat().filter((n) => n != null);
  if (all.length > 0 && all.every((n) => extractedSet.has(n))) return "tombola";
  for (const type of CARD_WIN_ORDER) {
    const count = { ambo: 2, terno: 3, quaterna: 4, cinquina: 5 }[type];
    for (const row of rows) {
      const hit = row.filter((n) => n != null && extractedSet.has(n)).length;
      if (hit >= count) return type;
    }
  }
  return null;
}

// Numero di celle della cartella occupate da numeri estratti.
function cardMatchedCount(rows, extracted) {
  const extractedSet = new Set(extracted);
  return rows.flat().filter((n) => n != null && extractedSet.has(n)).length;
}

// Archivio globale di cartelle (slegate dalle partite). Qui si importa il file
// .cards e si selezionano le cartelle da "mettere in gioco" o "togliere dal
// gioco" nella partita corrente. Il filtro si applica automaticamente dal
// secondo carattere digitato; con una selezione si puo' anche mostrare la
// vincita attuale calcolata sui numeri estratti.
export default function CardInventory({ game }) {
  const [cards, setCards] = useState([]);
  const [regex, setRegex] = useState("");
  const [regexError, setRegexError] = useState(null);
  const [selected, setSelected] = useState(new Set());
  const [expanded, setExpanded] = useState(new Set());
  const [showWins, setShowWins] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
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
    const term = regex.trim();
    // Filtro automatico: si applica dal secondo carattere digitato.
    if (term.length < 2) return cards;
    let re;
    try {
      re = new RegExp(term, "i");
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

  async function takeOutOfPlay() {
    if (!game) {
      setError("Nessuna partita selezionata: scegline una dal menu in alto");
      return;
    }
    if (selected.size === 0) {
      setError("Seleziona almeno una cartella da togliere dal gioco");
      return;
    }
    setError(null);
    setMsg(null);
    setBusy(true);
    try {
      const json = await apiRequest(`/api/game/${game._id}/boards/remove-from-cards`, {
        method: "POST",
        body: JSON.stringify({ cardIds: [...selected] })
      });
      setMsg(
        `Tolte dal gioco ${json.summary.removed ?? 0} cartelle`
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
          className={`btn-sm${showWins ? " btn-accent" : ""}`}
          onClick={() => setShowWins((v) => !v)}
          disabled={selected.size === 0}
          title="Mostra accanto a ogni cartella selezionata la vincita attuale sui numeri estratti"
        >
          {showWins ? "Nascondi vincite" : "Mostra vincita attuale"}
        </button>

        <button
          className="btn-sm btn-accent"
          onClick={() => setConfirmAction({ type: "putInPlay" })}
          disabled={busy || selected.size === 0 || !game}
          title={game ? "Copia le cartelle selezionate nella partita corrente" : "Scegli una partita dal menu in alto"}
        >
          Metti in gioco ({selected.size})
        </button>
        <button
          className="btn-sm btn-ghost"
          onClick={() => setConfirmAction({ type: "takeOut" })}
          disabled={busy || selected.size === 0 || !game}
          title={game ? "Rimuove dalla partita corrente le cartelle selezionate già in gioco" : "Scegli una partita dal menu in alto"}
        >
          Togli dal gioco
        </button>
      </div>

      {regexError && <div className="error-text">{regexError}</div>}
      {regex.trim() && regex.trim().length < 2 && (
        <div className="ci-hint">Digita almeno 2 caratteri per filtrare l'archivio.</div>
      )}
      {(!game || (showWins && !game)) && <div className="error-text">Seleziona una partita dal menu in alto per mettere/togliere le cartelle dal gioco.</div>}

      <div className="ci-list">
        {cards.length === 0 && <p className="empty">Archivio vuoto: importa un file .cards/.xml.</p>}
        {filtered.length === 0 && cards.length > 0 && <p className="empty">Nessuna cartella corrisponde al filtro.</p>}
        {filtered.map((card) => {
          const isSelected = selected.has(String(card._id));
          const isExpanded = expanded.has(String(card._id));
          const rows9 = toNineCols(card.rows || []);
          const extracted = game?.extractedNumbers || [];
          const win = showWins && isSelected ? cardHighestWin(rows9, extracted) : null;
          const matched = showWins && isSelected ? cardMatchedCount(rows9, extracted) : 0;
          return (
            <div
              className={`ci-item${isExpanded ? " ci-expanded" : ""}${isSelected ? " ci-selected" : ""}`}
              key={card._id}
            >
              <input
                type="checkbox"
                checked={isSelected}
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
                  {showWins && isSelected && (
                    <span className={`ci-win-tag${win ? "" : " ci-win-none"}`} title={`${matched} numeri estratti su 15`}>
                      {win || `☐ ${matched}/15`}
                    </span>
                  )}
                  <span className="ci-chevron">{isExpanded ? "▲" : "▼"}</span>
                </div>
                {isExpanded && (
                  <div className="ci-board">
                    {rows9.map((row, r) => (
                      <div className="ci-board-row" key={r}>
                        {row.map((n, c) => (
                          <span
                            key={c}
                            className={`ci-cell${n == null ? " ci-empty" : ""}${showWins && isSelected && n != null && extracted.includes(n) ? " ci-cell-win" : ""}`}
                          >
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

      <ConfirmModal
        open={confirmAction !== null}
        title={
          confirmAction?.type === "takeOut" ? "Togli dal gioco" : "Mettere in gioco"
        }
        message={
          confirmAction?.type === "takeOut"
            ? `Confermi di togliere dal gioco ${selected.size} cartella/e selezionate?`
            : `Confermi di mettere in gioco ${selected.size} cartella/e selezionate nella partita "${game?.name || ""}"?`
        }
        confirmLabel={confirmAction?.type === "takeOut" ? "Togli" : "Metti in gioco"}
        danger={confirmAction?.type === "takeOut"}
        onConfirm={() => {
          const a = confirmAction?.type;
          setConfirmAction(null);
          if (a === "takeOut") takeOutOfPlay();
          else putInPlay();
        }}
        onCancel={() => setConfirmAction(null)}
      />
    </div>
  );
}