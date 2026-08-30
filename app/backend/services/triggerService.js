import Trigger from "../models/Trigger.js";
import Narration from "../models/Narration.js";
import { getGameState } from "./gameService.js";

// Risolve la narrazione della partita: se viene fornito gameId usa un
// documento dedicato (key "game:<gameId>"), altrimenti il doc legacy "main".
export async function getNarrationForGame(gameId) {
  const key = gameId ? `game:${gameId}` : "main";
  let narration = await Narration.findOne({ key });
  if (!narration) {
    narration = new Narration({ key, gameId: gameId || null });
    await narration.save();
  }
  return narration;
}

// Valuta una singola condizione contro lo stato di gioco
function evalCondition(cond, state) {
  switch (cond.type) {
    case "number":
      return state.lastExtracted === cond.value;
    case "termination":
      return state.lastExtracted !== null && state.lastExtracted % 10 === cond.value;
    case "dozen": {
      // dozen = 1..9 (1 = 1-10, ..., 9 = 81-90)
      const dozen = Math.floor((state.lastExtracted - 1) / 10) + 1;
      return dozen === cond.value;
    }
    case "range":
      return (
        state.lastExtracted !== null &&
        state.lastExtracted >= (cond.min ?? 0) &&
        state.lastExtracted <= (cond.max ?? 90)
      );
    case "win":
      return state.lastWin !== null && state.lastWin.type === cond.value;
    case "count":
      return state.extractionCount >= cond.value;
    default:
      return false;
  }
}

// Valuta un gruppo di condizioni (and/or)
function evalGroup(group, state) {
  if (!group.conditions || group.conditions.length === 0) return true;
  if (group.operator === "or") {
    return group.conditions.some((c) => evalCondition(c, state));
  }
  return group.conditions.every((c) => evalCondition(c, state));
}

// Valuta tutti i gruppi (gruppi multipli = AND tra loro)
function evalTrigger(trigger, state) {
  if (!trigger.conditions || trigger.conditions.length === 0) return true;
  return trigger.conditions.every((g) => evalGroup(g, state));
}

export async function buildGameState(gameId) {
  const game = await getGameState(gameId);
  if (!game) return null;
  const last = game.extractedNumbers[game.extractedNumbers.length - 1] ?? null;
  return {
    extractedNumbers: game.extractedNumbers,
    lastExtracted: last,
    extractionCount: game.extractedNumbers.length,
    currentNumber: game.currentNumber,
    lastWin: game.lastWin,
    wonTypes: game.wonTypes
  };
}

// Valuta e attiva i trigger automatici per la fase corrente
export async function evaluateTriggers(gameId) {
  const narration = await getNarrationForGame(gameId);
  const state = await buildGameState(gameId);
  if (!state) return [];

  const candidates = await Trigger.find({
    active: true,
    autoMode: true,
    gameId: { $in: [null, gameId] },
    $or: [{ phase: narration.phase }, { phase: "always" }]
  }).sort({ order: 1 });

  const fired = [];
  for (const trigger of candidates) {
    if (trigger.fired > 0) continue; // un trigger si attiva una volta per fase
    if (evalTrigger(trigger, state)) {
      await fireTrigger(trigger, { source: "auto" }, gameId);
      fired.push(trigger);
    }
  }
  return fired;
}

// Attivazione manuale da parte del regista
export async function fireManual(triggerId, gameId) {
  const trigger = await Trigger.findById(triggerId);
  if (!trigger) throw new Error("Trigger non trovato");
  await fireTrigger(trigger, { source: "manual" }, gameId);
  return trigger;
}

export async function fireTrigger(trigger, meta = {}, gameId) {
  trigger.fired += 1;
  trigger.lastFiredAt = new Date();

  const narration = await getNarrationForGame(gameId);
  const event = {
    id: trigger._id.toString(),
    name: trigger.name,
    actionType: trigger.actionType,
    actionRef: trigger.actionRef,
    targetActor: trigger.targetActor,
    source: meta.source,
    at: new Date()
  };

  // Aggiorna lo stato del player quando il trigger avvia un video
  if (trigger.actionType === "video") {
    narration.player.status = "playing";
    narration.player.videoId = trigger.actionRef;
    narration.player.videoName = trigger.name;
    narration.player.startedAt = new Date();
    narration.player.clockMs = 0;
    narration.overlayActive = true;
  }

  narration.firedEvents.push(event);
  if (narration.firedEvents.length > 200) {
    narration.firedEvents = narration.firedEvents.slice(-200);
  }

  await trigger.save();
  await narration.save();
  return event;
}

export async function setPhase(phase, gameId) {
  const narration = await getNarrationForGame(gameId);
  narration.phase = phase;
  await narration.save();
  return narration;
}

export async function getNarrationState(gameId) {
  return getNarrationForGame(gameId);
}