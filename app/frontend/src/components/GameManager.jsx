import { useEffect, useState } from "react";
import { apiRequest } from "../api.js";
import { AdminTriggers, AdminVideos, AdminSounds } from "./AdminPanel.jsx";
import ConfirmModal from "./ConfirmModal.jsx";

function toLocalInput(value) {
  if (!value) return "";
  const d = new Date(value);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function GameManager({ game }) {
  const [history, setHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(true);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newScheduled, setNewScheduled] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editScheduled, setEditScheduled] = useState("");
  const [error, setError] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null); // { id, name } | null

  async function refresh() {
    try {
      const json = await apiRequest("/api/game/history");
      if (json.ok) setHistory(json.data);
    } catch (e) {
      setError(e.message);
    }
  }

  useEffect(() => {
    refresh();
  }, [game]);

  async function createGame() {
    setError(null);
    try {
      const json = await apiRequest("/api/game/start", {
        method: "POST",
        body: JSON.stringify({
          name: newName.trim() || undefined,
          description: newDesc.trim() || undefined,
          scheduledAt: newScheduled ? new Date(newScheduled).toISOString() : undefined
        })
      });
      setNewName("");
      setNewDesc("");
      setNewScheduled("");
      refresh();
    } catch (e) {
      setError(e.message);
    }
  }

  function startEdit(g) {
    setEditingId(g._id);
    setEditName(g.name || "");
    setEditDesc(g.description || "");
    setEditScheduled(toLocalInput(g.scheduledAt));
  }

  // Avvia/Ferma la partita (può essere giocata più volte): se è attiva la ferma,
  // se è chiusa la avvia per un nuovo giro (riazzerando i numeri estratti ma
  // mantenendo le cartelle in gioco).
  async function runGame(id) {
    setError(null);
    try {
      await apiRequest(`/api/game/${id}/toggle-run`, { method: "POST" });
      refresh();
    } catch (e) {
      setError(e.message);
    }
  }

  async function saveEdit(id) {
    setError(null);
    try {
      await apiRequest(`/api/game/${id}`, {
        method: "PUT",
        body: JSON.stringify({
          name: editName.trim(),
          description: editDesc.trim(),
          scheduledAt: editScheduled ? new Date(editScheduled).toISOString() : null
        })
      });
      setEditingId(null);
      refresh();
    } catch (e) {
      setError(e.message);
    }
  }

  async function removeGame(id, name) {
    setError(null);
    try {
      await apiRequest(`/api/game/${id}`, { method: "DELETE" });
      if (editingId === id) setEditingId(null);
      refresh();
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <div className="game-manager">
      <div className="gm-toolbar">
        <button className="btn-sm" onClick={() => setShowHistory((v) => !v)}>
          {showHistory ? "Chiudi tutte" : "Espandi tutte"}
        </button>
      </div>

      {showHistory && (
        <div className="game-manager-panel">
          <div className="gm-new">
            <input
              type="text"
              placeholder="Nome partita"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
            />
            <input
              type="text"
              placeholder="Descrizione"
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
            />
            <label className="gm-date-label">
              Inizia il (opzionale)
              <input
                type="datetime-local"
                value={newScheduled}
                onChange={(e) => setNewScheduled(e.target.value)}
              />
            </label>
            <button className="btn-sm btn-accent" onClick={createGame}>
              Nuova partita
            </button>
          </div>

          {error && <div className="error-text">{error}</div>}

          <div className="gm-list">
            {history.length === 0 && <p className="empty">Nessuna partita</p>}
            {history.map((g) => {
              const active = game && g._id === game._id;
              const submitting = editingId === g._id;
              const sub = [
                g.scheduledAt
                  ? new Date(g.scheduledAt).toLocaleString("it-IT", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })
                  : null,
                g.status === "scheduled" ? "programmata" : null,
                g.status === "finished" ? "chiusa" : null,
                active ? "in corso" : null
              ].filter(Boolean).join(" · ");
              return (
                <div key={g._id} className={`gm-item ${active ? "active" : ""}`}>
                  {submitting ? (
                    <div className="gm-edit">
                      <input value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Nome" />
                      <input value={editDesc} onChange={(e) => setEditDesc(e.target.value)} placeholder="Descrizione" />
                      <input type="datetime-local" value={editScheduled} onChange={(e) => setEditScheduled(e.target.value)} />
                      <div className="gm-edit-actions">
                        <button className="btn-sm btn-accent" onClick={() => saveEdit(g._id)}>Salva</button>
                        <button className="btn-sm" onClick={() => setEditingId(null)}>Annulla</button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="gm-item-info">
                        <span className="gm-name">{g.name}</span>
                        <span className="gm-sub">
                          {g.boards.length} cartelle · {g.extractedNumbers.length} estratti · {g.actors ? g.actors.length : 0} attori
                          {sub ? " · " + sub : ""}
                        </span>
                      </div>
                      <div className="gm-actions">
                        <button className="btn-sm" onClick={() => startEdit(g)}>Modifica</button>
                        <button
                          className="btn-sm btn-ghost"
                          onClick={() => setConfirmDelete({ id: g._id, name: g.name })}
                        >
                          Elimina
                        </button>
                        <button
                          className="btn-sm"
                          onClick={() => setExpandedId((v) => (v === g._id ? null : g._id))}
                        >
                          {expandedId === g._id ? "Chiudi contenuti" : "Trigger / Video"}
                        </button>
                        <button
                          className={`btn-sm ${g.status === "active" ? "btn-ghost" : "btn-accent"}`}
                          onClick={() => runGame(g._id)}
                        >
                          {g.status === "active" ? "Ferma partita" : "Avvia partita"}
                        </button>
                      </div>
                      {expandedId === g._id && (
                        <div className="gm-expanded">
                          <AdminTriggers gameId={g._id} />
                          <AdminVideos gameId={g._id} />
                          <AdminSounds gameId={g._id} />
                        </div>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <ConfirmModal
        open={!!confirmDelete}
        title="Eliminare la partita?"
        message={`Eliminare definitivamente la partita "${confirmDelete?.name}"? Questa azione non può essere annullata.`}
        confirmLabel="Elimina"
        danger
        onCancel={() => setConfirmDelete(null)}
        onConfirm={() => {
          const { id, name } = confirmDelete;
          setConfirmDelete(null);
          removeGame(id, name);
        }}
      />
    </div>
  );
}