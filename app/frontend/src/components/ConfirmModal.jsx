// Modale di conferma riutilizzabile. Mostra titolo + messaggio con due azioni:
// "Conferma" (danger optionale) e "Annulla".
export default function ConfirmModal({
  open,
  title,
  message,
  confirmLabel = "Conferma",
  cancelLabel = "Annulla",
  danger = false,
  onConfirm,
  onCancel
}) {
  if (!open) return null;

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3 className="modal-title">{title}</h3>
        {message && <p className="modal-message">{message}</p>}
        <div className="modal-actions">
          <button className="btn-sm btn-ghost" onClick={onCancel}>
            {cancelLabel}
          </button>
          <button
            className={`btn-sm ${danger ? "btn-danger" : "btn-accent"}`}
            onClick={onConfirm}
            autoFocus
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}