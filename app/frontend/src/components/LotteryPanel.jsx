import { useEffect, useRef, useState } from "react";
import { apiRequest, authHeaders } from "../api.js";
import ConfirmModal from "./ConfirmModal.jsx";
import { apiUrl } from "../hooks/useWebSocket.js";

export default function LotteryPanel({ mode = "all" }) {
  const isPrepOnly = mode === "prep";
  const isDrawOnly = mode === "draw";
  const showToggle = mode === "all";
  const [view, setView] = useState(isDrawOnly ? "draw" : "prep"); // "prep" | "draw"
  const isPrep = isPrepOnly || (showToggle && view === "prep");
  const isDraw = isDrawOnly || (showToggle && view === "draw");
  const [extractions, setExtractions] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [tab, setTab] = useState(isDrawOnly ? "draw" : "config");
  const [error, setError] = useState(null);
  const [msg, setMsg] = useState(null);
  const [confirm, setConfirm] = useState({ open: false, title: "", message: "", onConfirm: null });

  const selected = extractions.find((e) => String(e._id) === String(selectedId));

  const prevSelectedRef = useRef(selectedId);
  // Cambiando estrazione dall'elenco "Estrazione attiva", aggiorna anche
  // la presentazione sul tabellone (prepara la nuova estrazione).
  useEffect(() => {
    if (selectedId && prevSelectedRef.current && selectedId !== prevSelectedRef.current) {
      (async () => {
        try {
          const sess = await apiRequest("/api/lottery/draw/sessions", {
            method: "POST",
            body: JSON.stringify({ extractionId: selectedId })
          });
          if (sess.ok && sess.data?._id) {
            await apiRequest("/api/lottery/display/prepare", {
              method: "POST",
              body: JSON.stringify({ sessionId: sess.data._id, batchSize: 5 })
            });
          }
        } catch (e) {
          // non bloccare il cambio estrazione per errori di preparazione
        }
      })();
    }
    prevSelectedRef.current = selectedId;
  }, [selectedId]);

  async function loadExtractions() {
    try {
      const json = await apiRequest("/api/lottery/extractions");
      if (json.ok) {
        setExtractions(json.data || []);
        if (!selectedId && json.data?.length) setSelectedId(json.data[0]._id);
      }
    } catch (e) {
      setError(e.message);
    }
  }

  useEffect(() => {
    loadExtractions();
  }, []);

  function notify(m) { setMsg(m); setError(null); }
  function fail(e) { setError(e?.message || String(e)); setMsg(null); }

  return (
    <div className="admin-section lottery-panel">
      {showToggle && (
      <div className="admin-form">
        <h3>Modalità</h3>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button className={`btn-sm ${isPrep ? "btn-accent" : "btn-ghost"}`} onClick={() => { setView("prep"); setTab("config"); }}>Preparazione</button>
          <button className={`btn-sm ${isDraw ? "btn-accent" : "btn-ghost"}`} onClick={() => { setView("draw"); setTab("draw"); }}>Estrazione</button>
        </div>
      </div>
      )}
      <div className="admin-form">
        <h3>Estrazione attiva</h3>
        <label>
          Estrazione
          <select value={selectedId} onChange={(e) => setSelectedId(e.target.value)}>
            <option value="">-- nuova estrazione --</option>
            {extractions.map((e) => (
              <option key={e._id} value={e._id}>
                {e.name} ({e.ticketCount || 0} biglietti)
              </option>
            ))}
          </select>
        </label>
        <button className="btn-sm btn-ghost" onClick={loadExtractions}>Aggiorna elenco</button>
        {selectedId && (
          <button className="btn-sm btn-danger" onClick={() => {
            setConfirm({
              open: true,
              title: "Elimina estrazione",
              message: "Eliminare l'estrazione selezionata e tutti i dati collegati?",
              onConfirm: async () => {
                setConfirm((c) => ({ ...c, open: false }));
                try {
                  await apiRequest(`/api/lottery/extractions/${selectedId}`, { method: "DELETE" });
                  notify("Estrazione eliminata");
                  setSelectedId("");
                  loadExtractions();
                } catch (e) { fail(e); }
              }
            });
          }}>Elimina estrazione</button>
        )}
      </div>

      {error && <div className="error-text">{error}</div>}
      {msg && <div className="success-text">{msg}</div>}

      {!isDrawOnly && (
      <CreateExtractionForm onCreated={(doc) => { loadExtractions(); setSelectedId(doc._id); notify("Estrazione creata"); }} onError={fail} />
      )}

      {selectedId && (
        <>
          <nav className="page-tabs">
            {isPrep && ["config", "tickets", "prizes"].map((t) => (
              <button key={t} className={`role-tab${tab === t ? " active" : ""}`} onClick={() => setTab(t)}>
                {t === "config" ? "Configurazione" : t === "tickets" ? "Biglietti" : "Premi"}
              </button>
            ))}
            {isDraw && ["draw", "winners"].map((t) => (
              <button key={t} className={`role-tab${tab === t ? " active" : ""}`} onClick={() => setTab(t)}>
                {t === "draw" ? "Estrazione" : "Vincitori"}
              </button>
            ))}
          </nav>
          <div className="lottery-tab">
            {isPrep && tab === "config" && <ConfigTab extractionId={selectedId} onError={fail} onMsg={notify} />}
            {isPrep && tab === "tickets" && <TicketsTab extractionId={selectedId} onError={fail} onMsg={notify} />}
            {isPrep && tab === "prizes" && <PrizesTab extractionId={selectedId} onError={fail} onMsg={notify} />}
            {isDraw && tab === "draw" && <DrawTab extractionId={selectedId} onError={fail} onMsg={notify} />}
            {isDraw && tab === "winners" && <WinnersTab extractionId={selectedId} onError={fail} />}
          </div>
        </>
      )}
      <ConfirmModal
        open={confirm.open}
        title={confirm.title}
        message={confirm.message}
        danger
        onConfirm={confirm.onConfirm || (() => setConfirm((c) => ({ ...c, open: false })))}
        onCancel={() => setConfirm((c) => ({ ...c, open: false }))}
      />
    </div>
  );
}

function CreateExtractionForm({ onCreated, onError }) {
  const [name, setName] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [busy, setBusy] = useState(false);

  async function create() {
    if (!name.trim()) return;
    setBusy(true);
    try {
      const json = await apiRequest("/api/lottery/extractions", {
        method: "POST",
        body: JSON.stringify({ name, startDate: start || null, endDate: end || null })
      });
      if (json.ok) {
        onCreated(json.data);
        setName(""); setStart(""); setEnd("");
      }
    } catch (e) {
      onError(e);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="admin-form">
      <h3>Nuova estrazione</h3>
      <label>
        Nome estrazione
        <input placeholder="Es. Lotteria Natale 2026" value={name} onChange={(e) => setName(e.target.value)} />
      </label>
      <label>
        Data inizio
        <input type="date" value={start} onChange={(e) => setStart(e.target.value)} />
      </label>
      <label>
        Data fine
        <input type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
      </label>
      <button className="btn-sm btn-accent" onClick={create} disabled={busy}>Crea estrazione</button>
    </div>
  );
}

function ConfigTab({ extractionId, onError, onMsg }) {
  const [count, setCount] = useState(10000);
  const [symbolsCount, setSymbolsCount] = useState(40);
  const [bookletSize, setBookletSize] = useState(100);
  const [report, setReport] = useState(null);
  const [symbols, setSymbols] = useState([]);
  const [booklets, setBooklets] = useState([]);
  const [busy, setBusy] = useState(false);

  async function seed() {
    setBusy(true);
    try {
      const json = await apiRequest(`/api/lottery/extractions/${extractionId}/symbols/seed`, {
        method: "POST",
        body: JSON.stringify({ count: symbolsCount })
      });
      onMsg(`Semina completata: ${json.data?.count || 0} simbolo`);
      await loadSymbols();
    } catch (e) { onError(e); }
    finally { setBusy(false); }
  }

  async function loadSymbols() {
    try {
      const json = await apiRequest(`/api/lottery/extractions/${extractionId}/symbols`);
      if (json.ok) setSymbols(json.data || []);
    } catch (e) { onError(e); }
  }

  async function generate() {
    setBusy(true);
    try {
      const json = await apiRequest(`/api/lottery/extractions/${extractionId}/generate`, {
        method: "POST",
        body: JSON.stringify({ count, symbolsCount, bookletSize })
      });
      if (json.ok) {
        setReport(json.data.report);
        onMsg(`Generati ${json.data.count} biglietti (${json.data.startNumber}-${json.data.endNumber})`);
        await loadBooklets();
      }
    } catch (e) { onError(e); }
    finally { setBusy(false); }
  }

  async function loadBooklets() {
    try {
      const json = await apiRequest(`/api/lottery/extractions/${extractionId}/booklets`);
      if (json.ok) setBooklets(json.data || []);
    } catch (e) { onError(e); }
  }

  async function markAllSold() {
    setBusy(true);
    try {
      await apiRequest(`/api/lottery/extractions/${extractionId}/tickets/sell`, {
        method: "POST",
        body: JSON.stringify({ all: true })
      });
      onMsg("Tutti i biglietti segnati come venduti");
    } catch (e) { onError(e); }
    finally { setBusy(false); }
  }

  async function downloadPdf() {
    try {
      const res = await fetch(apiUrl(`/api/lottery/extractions/${extractionId}/booklets/pdf`), { headers: authHeaders() });
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `blocchetti-${extractionId}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) { onError(e); }
  }

  useEffect(() => { loadSymbols(); loadBooklets(); }, [extractionId]);

  return (
    <div>
      <div className="admin-form">
        <h3>Simbolo</h3>
        <label>
          Numero simbolo
          <input type="number" value={symbolsCount} onChange={(e) => setSymbolsCount(Number(e.target.value))} />
        </label>
        <button className="btn-sm btn-accent" onClick={seed} disabled={busy}>Semina simbolo</button>
        <span className="tab-sub">Presenti: {symbols.length}</span>
      </div>
      <div className="admin-form">
        <h3>Generazione biglietti</h3>
        <label>
          Quantità biglietti
          <input type="number" value={count} onChange={(e) => setCount(Number(e.target.value))} />
        </label>
        <label>
          Simbolo
          <input type="number" value={symbolsCount} onChange={(e) => setSymbolsCount(Number(e.target.value))} />
        </label>
        <label>
          Biglietti per blocchetto
          <input type="number" value={bookletSize} onChange={(e) => setBookletSize(Number(e.target.value))} />
        </label>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button className="btn-sm btn-accent" onClick={generate} disabled={busy}>Genera biglietti</button>
          <button className="btn-sm btn-ghost" onClick={downloadPdf}>Scarica PDF blocchetti</button>
        </div>
      </div>
      {report && (
        <div className="admin-form">
          <h3>Report validazione</h3>
          <p>Totale: {report.totalTickets} — Valido: {report.isValid ? "SÌ" : "NO"}</p>
          {report.errors?.length > 0 && <ul>{report.errors.map((e, i) => <li key={i}>{e}</li>)}</ul>}
        </div>
      )}
      <div className="admin-form">
        <h3>Blocchetti ({booklets.length})</h3>
        <ul className="tab-list" style={{ maxHeight: 160, overflow: "auto" }}>
          {booklets.map((b) => (
            <li className="tab-item" key={b._id}>
              <div className="tab-item-info">
                <span className="tab-name">Blocchetto #{b.number}</span>
                <span className="tab-sub">Biglietti {b.fromNum} - {b.toNum}</span>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function TicketsTab({ extractionId, onError, onMsg }) {
  const [tickets, setTickets] = useState([]);
  const [status, setStatus] = useState("");
  const [bookletNo, setBookletNo] = useState("");
  const [sellModal, setSellModal] = useState(false);
  const [sellMode, setSellMode] = useState("all"); // all | booklet | manual
  const [sellInput, setSellInput] = useState("");
  const [sellBusy, setSellBusy] = useState(false);
  const [sellStatus, setSellStatus] = useState("sold"); // sold | available

  async function load() {
    try {
      const q = status ? `?status=${status}` : "";
      const json = await apiRequest(`/api/lottery/extractions/${extractionId}/tickets${q}`);
      if (json.ok) setTickets(json.data || []);
    } catch (e) { onError(e); }
  }

  useEffect(() => { load(); }, [extractionId, status]);

  async function markBooklet() {
    if (!bookletNo.trim()) { onError(new Error("Inserisci un numero di blocchetto")); return; }
    try {
      const json = await apiRequest(`/api/lottery/extractions/${extractionId}/tickets/sell`, {
        method: "POST",
        body: JSON.stringify({ bookletNumber: Number(bookletNo) })
      });
      onMsg(`Aggiornati ${json.data?.updated} biglietti`);
      load();
    } catch (e) { onError(e); }
  }

  return (
    <div>
      <div className="admin-form">
        <label>
          Filtra per stato
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">tutti</option>
            <option value="available">disponibili</option>
            <option value="sold">venduti</option>
            <option value="winning">vincenti</option>
          </select>
        </label>
        <button className="btn-sm btn-ghost" onClick={load}>Aggiorna</button>
        <span className="tab-sub">Totale: {tickets.length}</span>
        <button className="btn-sm btn-accent" onClick={() => setSellModal(true)}>Gestisci vendite</button>
      </div>
      <div className="admin-form">
        <label>
          Numero del blocchetto
          <input value={bookletNo} onChange={(e) => setBookletNo(e.target.value)} placeholder="Es. 1" />
          <span className="tab-sub">Inserisci il numero del blocchetto stampato sul blocchetto (es. 1, 2, 3...).</span>
        </label>
        <button className="btn-sm btn-accent" onClick={markBooklet} disabled={!bookletNo.trim()}>Segna blocchetto venduto</button>
      </div>
      <ul className="tab-list" style={{ maxHeight: 240, overflow: "auto" }}>
        {tickets.slice(0, 80).map((t) => (
          <li className="tab-item" key={t._id}>
            <div className="tab-item-info">
              <span className="tab-name">#{t.number} — {t.serial}</span>
              <span className="tab-sub">{(t.symbols || []).join(", ")} · {t.status}</span>
            </div>
          </li>
        ))}
      </ul>
      {sellModal && (
        <div className="modal-overlay" onClick={() => setSellModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 420, width: "90%" }}>
            <h3 className="modal-title">Gestisci vendite</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <div style={{ fontSize: "0.8rem", color: "#aaa", marginBottom: 4 }}>Modalità</div>
                <select value={sellMode} onChange={(e) => setSellMode(e.target.value)} style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #444", background: "#1a1a2e", color: "#fff" }}>
                  <option value="all">Tutto venduto / invenduto</option>
                  <option value="booklet">Per blocchetto</option>
                  <option value="manual">Selezione manuale (numeri)</option>
                </select>
              </div>
              <div>
                <div style={{ fontSize: "0.8rem", color: "#aaa", marginBottom: 4 }}>Stato da impostare</div>
                <select value={sellStatus} onChange={(e) => setSellStatus(e.target.value)} style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #444", background: "#1a1a2e", color: "#fff" }}>
                  <option value="sold">Venduto</option>
                  <option value="available">Invenduto (disponibile)</option>
                </select>
              </div>
              {sellMode === "booklet" && (
                <div>
                  <div style={{ fontSize: "0.8rem", color: "#aaa", marginBottom: 4 }}>Numero blocchetto</div>
                  <input value={sellInput} onChange={(e) => setSellInput(e.target.value)} placeholder="Es. 1" style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #444", background: "#1a1a2e", color: "#fff" }} />
                </div>
              )}
              {sellMode === "manual" && (
                <div>
                  <div style={{ fontSize: "0.8rem", color: "#aaa", marginBottom: 4 }}>Numeri biglietto (separati da virgola)</div>
                  <textarea value={sellInput} onChange={(e) => setSellInput(e.target.value)} placeholder="Es. 1,2,3" rows={3} style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #444", background: "#1a1a2e", color: "#fff", resize: "vertical" }} />
                </div>
              )}
            </div>
            <div className="modal-actions" style={{ marginTop: 12 }}>
              <button className="btn-sm btn-ghost" onClick={() => setSellModal(false)}>Annulla</button>
              <button className="btn-sm btn-accent" disabled={sellBusy || (sellMode === "booklet" && !sellInput.trim()) || (sellMode === "manual" && !sellInput.trim())} onClick={async () => {
                setSellBusy(true);
                try {
                  let body = { status: sellStatus };
                  if (sellMode === "all") body = { ...body, all: true };
                  else if (sellMode === "booklet") body = { ...body, bookletNumber: Number(sellInput) };
                  else body = { ...body, ticketNumbers: sellInput.split(",").map((s) => Number(s.trim())).filter(Boolean) };
                  const json = await apiRequest(`/api/lottery/extractions/${extractionId}/tickets/sell`, {
                    method: "POST",
                    body: JSON.stringify(body)
                  });
                  onMsg(`Aggiornati ${json.data?.updated ?? "ok"} biglietti`);
                  setSellModal(false);
                  load();
                } catch (e) { onError(e); }
                finally { setSellBusy(false); }
              }}>Conferma</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PrizesTab({ extractionId, onError, onMsg }) {
  const [prizes, setPrizes] = useState([]);
  const [count, setCount] = useState(1);

  async function load() {
    try {
      const json = await apiRequest(`/api/lottery/extractions/${extractionId}/prizes`);
      if (json.ok) setPrizes(json.data || []);
    } catch (e) { onError(e); }
  }
  useEffect(() => { load(); }, [extractionId]);

  async function setPrizeCount() {
    const n = Math.max(1, Math.min(5, Number(count) || 1));
    try {
      // rimuovi premi esistenti
      for (const p of prizes) {
        await apiRequest(`/api/lottery/prizes/${p._id}`, { method: "DELETE" });
      }
      // crea N premi senza nome/valore
      for (let i = 1; i <= n; i++) {
        await apiRequest(`/api/lottery/extractions/${extractionId}/prizes`, {
          method: "POST",
          body: JSON.stringify({ name: `Premio ${i}`, value: "", order: i })
        });
      }
      onMsg(`Configurati ${n} premi`);
      load();
    } catch (e) { onError(e); }
  }

  return (
    <div>
      <div className="admin-form">
        <h3>Numero premi in palio</h3>
        <label>
          Quantità (1-5)
          <input type="number" min={1} max={5} value={count} onChange={(e) => setCount(Number(e.target.value))} />
        </label>
        <button className="btn-sm btn-accent" onClick={setPrizeCount}>Imposta numero premi</button>
        <span className="tab-sub">Premi configurati: {prizes.length}</span>
      </div>
      <ul className="tab-list">
        {prizes.map((p) => (
          <li className="tab-item" key={p._id}>
            <div className="tab-item-info">
              <span className="tab-name">{p.name}</span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function DrawTab({ extractionId, onError, onMsg }) {
  const [sessionId, setSessionId] = useState("");
  const [batchSize, setBatchSize] = useState(1);
  const [confirm, setConfirm] = useState({ open: false, title: "", message: "", onConfirm: null });
  const [display, setDisplay] = useState(null);
  const [prizes, setPrizes] = useState([]);
  const [prizeId, setPrizeId] = useState("");
  const [symbolId, setSymbolId] = useState("");
  const [revealSerial, setRevealSerial] = useState("");
  const [revealBooklet, setRevealBooklet] = useState("");
  const [busy, setBusy] = useState(false);

  async function ensureSession() {
    if (sessionId) return sessionId;
    try {
      const json = await apiRequest("/api/lottery/draw/sessions", {
        method: "POST",
        body: JSON.stringify({ extractionId })
      });
      if (json.ok) {
        setSessionId(json.data._id);
        return json.data._id;
      }
    } catch (e) { onError(e); }
    return null;
  }

  async function loadPrizes() {
    try {
      const json = await apiRequest(`/api/lottery/extractions/${extractionId}/prizes`);
      if (json.ok) setPrizes(json.data || []);
    } catch (e) { onError(e); }
  }
  async function loadDisplay() {
    try {
      const json = await apiRequest("/api/lottery/display");
      if (json.ok) setDisplay(json.data);
    } catch (e) { onError(e); }
  }
  useEffect(() => { loadPrizes(); loadDisplay(); }, [extractionId]);
  // Cambiando estrazione dalla combo: ricarica premi e stato del tabellone.
  // La preparazione della nuova estrazione è gestita a livello di LotteryPanel.
  useEffect(() => {
    if (display?.winnerSerial && !revealSerial) setRevealSerial(display.winnerSerial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [display?.winnerSerial]);

  async function prepare() {
    setBusy(true);
    try {
      const sid = await ensureSession();
      if (!sid) return;
      const json = await apiRequest("/api/lottery/display/prepare", {
        method: "POST",
        body: JSON.stringify({ sessionId: sid, batchSize })
      });
      if (json.ok) {
        setDisplay(json.data);
        onMsg(`Estrazione preparata (batch di ${batchSize})`);
      }
    } catch (e) { onError(e); }
    finally { setBusy(false); }
  }

  async function nextBatch() {
    setBusy(true);
    try {
      const json = await apiRequest("/api/lottery/display/batch", { method: "POST" });
      if (json.ok) {
        setDisplay(json.data);
        const drawn = (json.data.drawn || []).length;
        const total = (json.data.pool || []).length || 40;
        onMsg(drawn >= total ? "Estrazione simbolo completata" : `Estratti ${drawn}/${total}`);
      }
    } catch (e) { onError(e); }
    finally { setBusy(false); }
  }

  async function assign() {
    if (!prizeId || !symbolId) return;
    setBusy(true);
    try {
      const sid = await ensureSession();
      if (!sid) return;
      const json = await apiRequest(`/api/lottery/draw/sessions/${sid}/assign-prize`, {
        method: "POST",
        body: JSON.stringify({ prizeId, symbolId: Number(symbolId) })
      });
      if (json.ok) {
        onMsg(`Vincitore: ${json.data.winner.serial} (candidati: ${json.data.candidateCount})`);
        const prize = prizes.find((p) => String(p._id) === String(prizeId));
        await apiRequest("/api/lottery/display", {
          method: "POST",
          body: JSON.stringify({
            active: true,
            sessionId: sid,
            winnerSerial: json.data.winner.serial,
            winnerNumber: json.data.winner.number,
            prizeName: prize?.name || "",
            status: "winner"
          })
        });
        loadDisplay();
      }
    } catch (e) { onError(e); }
    finally { setBusy(false); }
  }

  async function close() {
    if (!sessionId) return;
    try {
      await apiRequest(`/api/lottery/draw/sessions/${sessionId}/close`, { method: "POST" });
      onMsg("Sessione chiusa");
    } catch (e) { onError(e); }
  }

  const drawnCount = (display?.drawn || []).length;
  const total = (display?.pool || []).length || 40;
  const done = display && drawnCount >= total && total > 0;

  return (
    <div>
      <div className="admin-form">
        <h3>Estrazione simbolo</h3>
        <label>
          simbolo per estrazione (N)
          <input type="number" value={batchSize} onChange={(e) => setBatchSize(Number(e.target.value))} min={1} max={40} />
        </label>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
           <button className="btn-sm btn-accent" onClick={() => {
            if (!extractionId) { onError(new Error("Seleziona una estrazione dalla lista")); return; }
            const already = display && (display.active || display.status !== "idle");
            if (already) {
              setConfirm({
                open: true,
                title: "Prepara estrazione",
                message: "Preparare una nuova estrazione sul tabellone? Questo resetta l'estrazione in corso.",
                onConfirm: () => { setConfirm((c) => ({ ...c, open: false })); prepare(); }
              });
            } else {
              prepare();
            }
          }} disabled={busy || !extractionId}>Prepara estrazione</button>
           <button className="btn-sm btn-accent" onClick={nextBatch} disabled={busy || display?.status !== "drawing"}>{batchSize === 1 ? "Estrai prossimo simbolo" : `Estrai prossimi ${batchSize} simbolo`}</button>
          <button className="btn-sm btn-accent" onClick={async () => {
            setBusy(true);
            try {
              const json = await apiRequest("/api/lottery/display", {
                method: "POST",
                body: JSON.stringify({ active: true })
              });
              if (json.ok) { setDisplay(json.data); onMsg("Estrazione mostrata sul tabellone"); }
            } catch (e) { onError(e); }
            finally { setBusy(false); }
          }} disabled={busy || !display || display.active}>Mostra sul tabellone</button>
 
          <button className="btn-sm btn-ghost" onClick={async () => {
            try {
              const json = await apiRequest("/api/lottery/display", {
                method: "POST",
                body: JSON.stringify({ active: false })
              });
              if (json.ok) { setDisplay(json.data); onMsg("Presentazione nascosta dal tabellone"); }
            } catch (e) { onError(e); }
          }}>Nascondi dal tabellone</button>
        </div>
        {display && (
          <div className="tab-sub" style={{ marginTop: 8 }}>
            {display.active && <>Estratti {drawnCount}/{total} {done ? "— FINALISTI: " + (display.finalists || []).map((n) => "S" + String(n).padStart(2, "0")).join(", ") : ""}<br /></>}
            Biglietti in gioco: {display?.validTickets ?? 0}
          </div>
        )}
      </div>

      <div className="admin-form">
        <h3>Estrazione premi (ordine inverso)</h3>
        <p className="tab-sub">I premi vengono estratti dal più alto al più basso (es. dal 5° al 1°).</p>
        <button className="btn-sm btn-accent" onClick={async () => {
          setBusy(true);
          try {
            if (!display?.active) {
              const show = await apiRequest("/api/lottery/display", { method: "POST", body: JSON.stringify({ active: true }) });
              if (show.ok) setDisplay(show.data);
            }
            const json = await apiRequest("/api/lottery/display/draw-prize", { method: "POST" });
            if (json.ok) { setDisplay(json.data); onMsg(`Premio estratto: ${json.data.prizeName}`); }
          } catch (e) { onError(e); }
          finally { setBusy(false); }
        }} disabled={busy}>Estrai prossimo premio</button>
      </div>

    <ConfirmModal
      open={confirm.open}
      title={confirm.title}
      message={confirm.message}
      danger
      onConfirm={confirm.onConfirm || (() => setConfirm((c) => ({ ...c, open: false })))}
      onCancel={() => setConfirm((c) => ({ ...c, open: false }))}
    />
    </div>
  );
}
function WinnersTab({ extractionId, onError }) {
  const [sessions, setSessions] = useState([]);
  const [sessionId, setSessionId] = useState("");
  const [winners, setWinners] = useState([]);

  async function loadSessions() {
    try {
      const json = await apiRequest(`/api/lottery/draw/sessions?extractionId=${extractionId}`);
      if (json.ok) setSessions(json.data || []);
    } catch (e) { onError(e); }
  }
  useEffect(() => { loadSessions(); }, [extractionId]);

  async function loadWinners() {
    if (!sessionId) return;
    try {
      const json = await apiRequest(`/api/lottery/draw/sessions/${sessionId}/winners`);
      // winners endpoint requires auth; apiRequest already sends token
      if (json.ok) setWinners(json.data || []);
    } catch (e) { onError(e); }
  }
  useEffect(() => { loadWinners(); }, [sessionId]);

  return (
    <div>
      <div className="admin-form">
        <label>
          Sessione
          <select value={sessionId} onChange={(e) => setSessionId(e.target.value)}>
            <option value="">-- seleziona --</option>
            {sessions.map((s) => <option key={s._id} value={s._id}>{s._id}</option>)}
          </select>
        </label>
        <button className="btn-sm btn-ghost" onClick={loadWinners}>Aggiorna vincitori</button>
      </div>
      <ul className="tab-list">
        {winners.map((w, i) => (
          <li className="tab-item" key={i}>
            <div className="tab-item-info">
              <span className="tab-name">Premio {String(w.prizeId).slice(-6)}</span>
              <span className="tab-sub">Biglietto #{w.ticketNumber} — {w.serial} · Simbolo {w.symbolId} · Candidati {w.candidateCount}</span>
            </div>
          </li>
        ))}
        {winners.length === 0 && <li className="tab-sub">Nessun vincitore registrato.</li>}
      </ul>
    </div>
  );
}
