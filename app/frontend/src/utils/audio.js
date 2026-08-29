let ctx = null;
let enabled = true;

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
  const base = 440 + Math.random() * 300;
  tone(base, 0, 0.15, "triangle", 0.3);
  tone(base * 1.5, 0.1, 0.2, "triangle", 0.25);
}

export function playWin() {
  if (!enabled) return;
  const notes = [523.25, 659.25, 783.99, 1046.5];
  notes.forEach((f, i) => {
    tone(f, i * 0.12, 0.25, "sine", 0.3);
  });
}

export function playTombola() {
  if (!enabled) return;
  const notes = [523.25, 587.33, 659.25, 783.99, 880, 1046.5];
  notes.forEach((f, i) => {
    tone(f, i * 0.15, 0.3, "square", 0.2);
  });
  tone(784, 0.15 * notes.length, 0.6, "sine", 0.35);
}

// Riproduce una definizione di suono generica (synth o sequenza di note)
export function playSound(sound) {
  if (!enabled || !sound) return;
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
