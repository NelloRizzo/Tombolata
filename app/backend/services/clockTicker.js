import Narration from "../models/Narration.js";
import { broadcastToClients } from "./broadcast.js";

// Gestisce il tick dell'orologio di riproduzione (clockMs) per i player
// video attivi. Evita di scansionare tutte le narrazioni a ogni tick: tiene
// traccia solo delle partite con un player in riproduzione.
let wssRef = null;

const watchGameIds = new Map(); // key("main"|"game:<id>") -> timer

export function setClockWss(wss) {
  wssRef = wss;
}

function timerKey(gameId) {
  return gameId ? `game:${gameId}` : "main";
}

function schedule(key) {
  if (watchGameIds.has(key)) return;
  const timer = setInterval(() => tick(key), 1000);
  watchGameIds.set(key, timer);
}

function stopTimer(key) {
  const timer = watchGameIds.get(key);
  if (timer) {
    clearInterval(timer);
    watchGameIds.delete(key);
  }
}

// Avvia il ticker per la partita (da chiamare quando un video parte).
export function startClock(gameId) {
  schedule(timerKey(gameId));
}

// Ferma il ticker (da chiamare quando il player va in pausa/stop/ended).
export function stopClock(gameId) {
  stopTimer(timerKey(gameId));
}

async function tick(key) {
  try {
    const narration = await Narration.findOne({ key });
    if (!narration || narration.player?.status !== "playing" || !narration.player?.startedAt) {
      stopTimer(key);
      return;
    }
    narration.player.clockMs = (narration.player.clockMs || 0) + (Date.now() - new Date(narration.player.startedAt).getTime());
    narration.player.startedAt = new Date();
    await narration.save();
    const gameId = narration.gameId || null;
    if (wssRef) {
      await broadcastToClients(wssRef, "narration:clock", { clockMs: narration.player.clockMs, videoId: narration.player.videoId }, gameId);
    }
  } catch (error) {
    stopTimer(key);
  }
}
