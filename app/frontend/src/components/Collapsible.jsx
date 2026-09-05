import { useState } from "react";

// Sezione collassabile con titolo cliccabile. Usata nella Regia per
// raggruppare i giochi ("Giochi") e per aprire/chiudere ogni singolo gioco.
export default function Collapsible({ title, defaultOpen = true, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={`panel-block collapsible ${open ? "" : "collapsed"}`}>
      <button
        type="button"
        className="collapsible-head"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        <span className="collapsible-caret">{open ? "▾" : "▸"}</span>
        <span className="collapsible-title">{title}</span>
      </button>
      {open && <div className="collapsible-body">{children}</div>}
    </div>
  );
}