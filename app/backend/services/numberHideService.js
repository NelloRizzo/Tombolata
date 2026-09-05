import {
  buildCells,
  clamp,
  getMinigameForGame,
  presentationDurationMs
} from "./minigameService.js";

// "Il numero nascosto": una griglia di celle numerate a scacchiera che si
// colorano a cascata; una delle celle custodisce un numero segreto. Il pubblico
// scommette in quale casella è nascosto; il regista alla fine lo rivela.
// Niente controllo vincite: vince chi chiama la casella giusta (a voce).

export async function startNumberHideGame(gameId, opts = {}) {
  const rows = clamp(opts.rows, 2, 7, 4);
  const cols = clamp(opts.cols, 2, 7, 4);
  const cells = buildCells(rows * cols, cols);
  const hiddenIndex = Math.floor(Math.random() * cells.length);
  const hiddenNumber = clamp(opts.hiddenNumber, 1, 90, 1 + Math.floor(Math.random() * 90));
  const presentSeconds = clamp(opts.presentSeconds, 5, 120, 10);

  const doc = await getMinigameForGame(gameId);
  doc.type = "numberHide";
  doc.status = "running";
  doc.rows = rows;
  doc.cols = cols;
  doc.cells = cells;
  doc.hiddenIndex = hiddenIndex;
  doc.hiddenNumber = hiddenNumber;
  doc.revealed = false;
  doc.startedAt = new Date();
  doc.presentSeconds = presentSeconds;
  doc.overlayActive = true;
  doc.expiresAt = new Date(Date.now() + presentationDurationMs(doc));
  await doc.save();
  return doc;
}

// Il regista rivela la casella che custodisce il numero segreto.
export async function revealNumberHideGame(gameId) {
  const doc = await getMinigameForGame(gameId);
  if (doc.type !== "numberHide" || doc.status !== "running") {
    throw new Error("Nessun gioco 'numero nascosto' attivo");
  }
  doc.revealed = true;
  await doc.save();
  return doc;
}