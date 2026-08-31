import { useEffect, useMemo, useRef, useState } from "react";
import { apiRequest } from "../api.js";

function cardLabel(card) {
  const parts = [];
  if (card.title) parts.push(card.title);
  if (card.setNumber != null) parts.push(`S.${card.setNumber}`);
  if (card.cardNumber != null) parts.push(`n.${card.cardNumber}`);
  return parts.join(" · ");
}

// Archivio globale di cartelle (slegate dalle partite). Qui si importa il file
// .cards e si selezionano le cartelle da "mettere in gioco" nella partita
// corrente (singole, per espressione regolare o tutte insieme).
export default function CardInventory({ game }) {
  const [cards, setCards] = useState([]);
  const [regex, setRegex] = useState("");
  const [regexError, setRegexError] = useState(null);
  const [selected, setSelected] = useState(new Set());
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

  function toggle(id) {
    setSelected((prev) => {
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
        {cards.map((card) => (
          <div className="ci-item" key={card._id}>
            <input
              type="checkbox"
              checked={selected.has(String(card._id))}
              onChange={() => toggle(String(card._id))}
            />
            <div className="ci-body">
              <div className="ci-label">{cardLabel(card) || "Cartella"}</div>
              <div className="ci-board">
                {card.rows.map((row, r) => (
                  <div className="bm-board-row" key={r}>
                    {row.map((n, c) => (
                      <span key={c}>{n}</span>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}