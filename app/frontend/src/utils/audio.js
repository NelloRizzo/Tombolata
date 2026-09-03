let ctx = null;
let enabled = true;

// Effetti sonori "divertenti" scaricati in public/sounds (MP3).
// Vengono riprodotti come file con fallback al sintetizzatore se il file
// non è disponibile o il caricamento fallisce.
const SOUND_FILES = {
  extract: "/sounds/estrazione.mp3",
  win: "/sounds/vincita.mp3",
  wrong: "/sounds/errore.mp3"
};

const audioCache = {};

function playFile(key) {
  const url = SOUND_FILES[key];
  if (!url) return false;
  return playUrl(url);
}

export function playUrl(url) {
  if (!url) return false;
  try {
    const key = url;
    let el = audioCache[key];
    if (!el) {
      el = new Audio(url);
      audioCache[key] = el;
    }
    el.currentTime = 0;
    const p = el.play();
    if (p && typeof p.catch === "function") p.catch(() => {});
    return true;
  } catch (e) {
    return false;
  }
}

function getCtx() {
  if (!ctx) {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (ctx.state === "suspended") ctx.resume();
  return ctx;
}

export function setSoundEnabled(value) {
  enabled = value;
}

export function isSoundEnabled() {
  return enabled;
}

function tone(freq, start, duration, type = "sine", gainVal = 0.2) {
  const c = getCtx();
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, c.currentTime + start);
  gain.gain.setValueAtTime(0.0001, c.currentTime + start);
  gain.gain.exponentialRampToValueAtTime(
    gainVal,
    c.currentTime + start + 0.02
  );
  gain.gain.exponentialRampToValueAtTime(
    0.0001,
    c.currentTime + start + duration
  );
  osc.connect(gain);
  gain.connect(c.destination);
  osc.start(c.currentTime + start);
  osc.stop(c.currentTime + start + duration + 0.05);
}

export function playExtract() {
  if (!enabled) return;
  if (playFile("extract")) return;
  const base = 440 + Math.random() * 300;
  tone(base, 0, 0.15, "triangle", 0.3);
  tone(base * 1.5, 0.1, 0.2, "triangle", 0.25);
}

export function playWin() {
  if (!enabled) return;
  if (playFile("win")) return;
  const notes = [523.25, 659.25, 783.99, 1046.5];
  notes.forEach((f, i) => {
    tone(f, i * 0.12, 0.25, "sine", 0.3);
  });
}

export function playTombola() {
  if (!enabled) return;
  if (playFile("win")) return;
  const notes = [523.25, 587.33, 659.25, 783.99, 880, 1046.5];
  notes.forEach((f, i) => {
    tone(f, i * 0.15, 0.3, "square", 0.2);
  });
  tone(784, 0.15 * notes.length, 0.6, "sine", 0.35);
}

// Suono "vincita sbagliata" / errore (fallback: buzzer sintetizzato).
export function playWrong() {
  if (!enabled) return;
  if (playFile("wrong")) return;
  tone(180, 0, 0.4, "sawtooth", 0.25);
  tone(140, 0.35, 0.5, "sawtooth", 0.25);
}

// Riproduce una definizione di suono generica (synth, sequenza di note o file)
export function playSound(sound) {
  if (!enabled || !sound) return;
  if (sound.kind === "file" && sound.fileUrl) {
    playUrl(sound.fileUrl);
    return;
  }
  const notes = sound.notes || [];
  if (notes.length > 0) {
    notes.forEach((n, i) => {
      const freq = n.frequency || 440;
      const dur = n.duration || 0.3;
      const type = n.type || "sine";
      const gain = n.gain || 0.25;
      tone(freq, n.delay ?? i * 0.12, dur, type, gain);
    });
    return;
  }
  const synth = sound.synth || {};
  const type = synth.type || "sine";
  const freq = synth.frequency || 440;
  const duration = synth.duration || 1;
  const gain = synth.gain || 0.3;
  tone(freq, 0, duration, type, gain);
}
