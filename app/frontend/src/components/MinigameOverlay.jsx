import ColorCountOverlay from "./ColorCountOverlay.jsx";
import MemoryOverlay from "./MemoryOverlay.jsx";
import NumberHideOverlay from "./NumberHideOverlay.jsx";

// Router degli overlay pubblici dei giochi: mostra l'overlay giusto in base al
// tipo di minigioco attivo. Solo le pagine Board e Monitor lo montano.
export default function MinigameOverlay({ minigame }) {
  if (!minigame) return null;
  if (minigame.type === "memory") return <MemoryOverlay minigame={minigame} />;
  if (minigame.type === "numberHide") return <NumberHideOverlay minigame={minigame} />;
  return <ColorCountOverlay minigame={minigame} />;
}