import crypto from "crypto";
import LotteryExtraction from "../models/LotteryExtraction.js";
import LotterySymbol from "../models/LotterySymbol.js";
import LotteryTicket from "../models/LotteryTicket.js";
import LotteryBooklet from "../models/LotteryBooklet.js";
import LotteryDrawSession from "../models/LotteryDrawSession.js";
import LotteryDrawEvent from "../models/LotteryDrawEvent.js";
import LotteryPrize from "../models/LotteryPrize.js";
import LotteryPrizeWinner from "../models/LotteryPrizeWinner.js";
import LotteryDisplay from "../models/LotteryDisplay.js";

// ---------- generator ported from AspettandoLaBefana ----------
function numberToBookletCode(n) {
  let result = "";
  for (let i = 0; i < 3; i++) {
    result = String.fromCharCode(65 + (n % 26)) + result;
    n = Math.floor(n / 26);
  }
  return result;
}

function createRng(seed) {
  let s = seed ?? Math.floor(Math.random() * 2 ** 31);
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

function shuffle(arr, rng) {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function generateTickets(params = {}) {
  const totalTickets = params.count ?? params.totalTickets ?? 10000;
  const symbolsCount = params.symbolsCount ?? 40;
  const startNumber = params.startNumber ?? 1;
  const perBooklet = params.bookletSize ?? 100;
  const rng = createRng(params.seed);

  const perSymbol = Math.floor((totalTickets * 3) / symbolsCount);
  let tickets = [];
  const counts = new Array(symbolsCount + 1).fill(0);
  const extra = (totalTickets * 3) % symbolsCount;

  for (let t = 0; t < totalTickets; t++) {
    const candidates = [];
    for (let s = 1; s <= symbolsCount; s++) {
      if (counts[s] < perSymbol) {
        candidates.push({ s, c: counts[s] });
      }
    }
    if (candidates.length < 3) {
      for (let s = 1; s <= symbolsCount; s++) {
        if (counts[s] === perSymbol && !candidates.find((c) => c.s === s)) {
          const target = perSymbol + (s <= extra ? 1 : 0);
          if (counts[s] < target) {
            candidates.push({ s, c: counts[s] });
          }
        }
      }
      if (candidates.length < 3) {
        for (let s = 1; s <= symbolsCount && candidates.length < 3; s++) {
          if (!candidates.find((c) => c.s === s)) {
            candidates.push({ s, c: counts[s] });
          }
        }
      }
    }
    candidates.sort((a, b) => {
      if (a.c !== b.c) return a.c - b.c;
      return rng() - 0.5;
    });

    const triple = [candidates[0].s, candidates[1].s, candidates[2].s];
    const shuffled = shuffle(triple, rng);

    tickets.push({
      number: t + 1,
      serial: String(t + 1).padStart(5, "0"),
      symbols: shuffled
    });

    for (let i = 0; i < 3; i++) {
      counts[shuffled[i]]++;
    }
  }

  const randomized = shuffle(tickets, rng);
  return randomized.map((t, i) => {
    const globalIndex = (startNumber - 1) + i;
    const bookletIndex = Math.floor(globalIndex / perBooklet);
    const serialInBooklet = (globalIndex % perBooklet) + 1;
    const bookletCode = numberToBookletCode(bookletIndex);
    return {
      ...t,
      number: startNumber + i,
      serial: `${bookletCode}-${String(serialInBooklet).padStart(3, "0")}`
    };
  });
}

export function validateTickets(tickets, symbolsCount = 40) {
  const totalT = tickets.length;
  const counts = {};
  for (let s = 1; s <= symbolsCount; s++) counts[s] = 0;

  const errors = [];
  const serials = new Set();
  for (const t of tickets) {
    if (serials.has(t.serial)) errors.push(`Seriale duplicato: ${t.serial}`);
    serials.add(t.serial);
    if (t.symbols.length !== 3) errors.push(`Biglietto ${t.serial}: deve avere 3 simbolo`);
    const set = new Set(t.symbols);
    if (set.size !== 3) errors.push(`Biglietto ${t.serial}: simbolo non distinti`);
    for (const s of t.symbols) {
      if (s < 1 || s > symbolsCount) errors.push(`Biglietto ${t.serial}: simbolo ${s} non valido`);
      else counts[s]++;
    }
  }

  const expected = Math.floor((totalT * 3) / symbolsCount);
  const extra = (totalT * 3) % symbolsCount;
  for (let s = 1; s <= symbolsCount; s++) {
    const target = expected + (s <= extra ? 1 : 0);
    if (counts[s] !== target) {
      errors.push(`Simbolo ${s}: ${counts[s]} presenze invece di ${target}`);
    }
  }

  return {
    totalTickets: tickets.length,
    totalSymbols: symbolsCount,
    expectedPerSymbol: expected,
    counts,
    isValid: errors.length === 0,
    errors
  };
}

export function generateBooklets(tickets, perBooklet = 100) {
  const size = perBooklet;
  const booklets = [];
  const total = tickets.length;
  let bookletId = 1;
  for (let i = 0; i < total; i += size) {
    const from = tickets[i].number;
    const to = tickets[Math.min(i + size - 1, total - 1)].number;
    const ticketNumbers = [];
    for (let j = i; j < Math.min(i + size, total); j++) ticketNumbers.push(tickets[j].number);
    booklets.push({ id: bookletId++, from, to, tickets: ticketNumbers });
  }
  return booklets;
}

// ---------- CRUD / business logic ----------

export async function createExtraction({ name, startDate, endDate }) {
  const doc = await LotteryExtraction.create({ name, startDate: startDate ? new Date(startDate) : null, endDate: endDate ? new Date(endDate) : null });
  // Resetta il display del tabellone per la nuova estrazione
  await clearLotteryDisplay();
  const wss = null;
  return doc;
}

export async function deleteExtraction(id) {
  const ext = await LotteryExtraction.findById(id);
  if (!ext) throw new Error("Estrazione non trovata");
  // rimuovi dati collegati
  await LotteryTicket.deleteMany({ extractionId: id });
  await LotterySymbol.deleteMany({ extractionId: id });
  await LotteryBooklet.deleteMany({ extractionId: id });
  await LotteryPrize.deleteMany({ extractionId: id });
  const sessions = await LotteryDrawSession.find({ extractionId: id }).lean();
  const sessionIds = sessions.map((s) => s._id);
  if (sessionIds.length) {
    await LotteryDrawEvent.deleteMany({ sessionId: { $in: sessionIds } });
    await LotteryPrizeWinner.deleteMany({ eventId: { $in: (await LotteryDrawEvent.find({ sessionId: { $in: sessionIds } }).distinct("_id")) } });
    await LotteryDrawSession.deleteMany({ extractionId: id });
  }
  await LotteryPrizeWinner.deleteMany({ prizeId: { $in: (await LotteryPrize.find({ extractionId: id }).distinct("_id")) } });
  // reset display se collegato a una sessione di questa estrazione
  const display = await LotteryDisplay.findOne({ key: "main" });
  if (display && display.sessionId && sessionIds.some((s) => String(s) === String(display.sessionId))) {
    await setLotteryDisplay({ active: false, sessionId: null, status: "idle", drawn: [], eliminated: [], finalists: [], pool: [], winnerSerial: "", winnerNumber: null, prizeName: "", revealSerial: "", revealBooklet: "", revealIndex: 0 });
  }
  await LotteryExtraction.findByIdAndDelete(id);
  return { deleted: true };
}

export async function listExtractions() {
  const exts = await LotteryExtraction.find().sort({ createdAt: -1 }).lean();
  const out = [];
  for (const e of exts) {
    const ticketCount = await LotteryTicket.countDocuments({ extractionId: e._id });
    const soldCount = await LotteryTicket.countDocuments({ extractionId: e._id, status: "sold" });
    const symbolCount = await LotterySymbol.countDocuments({ extractionId: e._id });
    out.push({ ...e, ticketCount, soldCount, symbolCount });
  }
  return out;
}

export async function getExtraction(id) {
  const e = await LotteryExtraction.findById(id).lean();
  if (!e) return null;
  const ticketCount = await LotteryTicket.countDocuments({ extractionId: id });
  const soldCount = await LotteryTicket.countDocuments({ extractionId: id, status: "sold" });
  const symbolCount = await LotterySymbol.countDocuments({ extractionId: id });
  return { ...e, ticketCount, soldCount, symbolCount };
}

export async function seedSymbols(extractionId, count = 40) {
  const existing = await LotterySymbol.countDocuments({ extractionId });
  if (existing > 0) return { seeded: false, count: existing };
  const symbols = [];
  for (let i = 1; i <= count; i++) {
    symbols.push({ extractionId, id: i, code: `S${String(i).padStart(2, "0")}`, name: `Simbolo ${i}` });
  }
  await LotterySymbol.insertMany(symbols);
  return { seeded: true, count: symbols.length };
}

export async function listSymbols(extractionId) {
  return LotterySymbol.find({ extractionId }).sort({ id: 1 }).lean();
}

export async function generateTicketsForExtraction(extractionId, params = {}) {
  const extraction = await LotteryExtraction.findById(extractionId);
  if (!extraction) throw new Error("Estrazione non trovata");

  const count = Number(params.count ?? params.totalTickets ?? 10000);
  const symbolsCount = Number(params.symbolsCount ?? 40);
  const bookletSize = Number(params.bookletSize ?? 100);
  if (!Number.isFinite(count) || count <= 0) throw new Error("count non valido");

  // seed symbols if missing
  await seedSymbols(extractionId, symbolsCount);

  const agg = await LotteryTicket.aggregate([
    { $match: { extractionId: extraction._id } },
    { $group: { _id: null, maxNum: { $max: "$number" } } }
  ]);
  const startNumber = (agg[0]?.maxNum ?? 0) + 1;

  const tickets = generateTickets({ count, symbolsCount, seed: Date.now(), startNumber, bookletSize });
  const report = validateTickets(tickets, symbolsCount);

  // persist tickets
  await LotteryTicket.insertMany(
    tickets.map((t) => ({
      extractionId,
      number: t.number,
      serial: t.serial,
      symbols: t.symbols,
      status: "available"
    }))
  );

  // booklets
  const booklets = generateBooklets(tickets, bookletSize);
  const maxB = await LotteryBooklet.aggregate([
    { $match: { extractionId: extraction._id } },
    { $group: { _id: null, maxNum: { $max: "$number" } } }
  ]);
  let bookletNumber = (maxB[0]?.maxNum ?? 0) + 1;
  const bookletDocs = booklets.map((b) => ({
    extractionId,
    number: bookletNumber++,
    fromNum: b.from,
    toNum: b.to,
    ticketNumbers: b.tickets
  }));
  if (bookletDocs.length) await LotteryBooklet.insertMany(bookletDocs);

  // link tickets to booklets (optional, skip for simplicity; booklet has ticketNumbers)

  return {
    extractionId,
    count: tickets.length,
    startNumber,
    endNumber: startNumber + count - 1,
    report
  };
}

export async function listTickets(extractionId, status) {
  const q = { extractionId };
  if (status) q.status = status;
  return LotteryTicket.find(q).sort({ number: 1 }).lean();
}

export async function listBooklets(extractionId) {
  return LotteryBooklet.find({ extractionId }).sort({ number: 1 }).lean();
}

const MM_TO_PT = 2.834645669;

export async function buildTicketsPdf(extractionId, bookletNumber) {
  const fsMod = await import("fs");
  const pathMod = await import("path");
  const fs = fsMod.default || fsMod;
  const path = pathMod.default || pathMod;

  const PDFDocument = (await import("pdfkit")).default;
  const booklets = await listBooklets(extractionId);
  const filteredBooklets = bookletNumber != null
    ? booklets.filter((b) => b.number === Number(bookletNumber))
    : booklets;

  // Determine which tickets to print
  let ticketNumbers = [];
  if (bookletNumber != null && filteredBooklets.length) {
    ticketNumbers = filteredBooklets[0].ticketNumbers || [];
  } else {
    // all tickets of extraction
    const all = await listTickets(extractionId);
    ticketNumbers = all.map((t) => t.number);
  }

  const tickets = await listTickets(extractionId);
  const byNumber = new Map(tickets.map((t) => [t.number, t]));
  const symbols = await listSymbols(extractionId);
  const symbolById = new Map(symbols.map((s) => [s.id, s]));

  // Resolve assets dir
  const assetCandidates = [
    process.env.LOTTERY_ASSETS_DIR,
    process.env.ASSETS_DIR,
    path.resolve(process.cwd(), "assets"),
    path.resolve(process.cwd(), "..", "assets"),
    path.resolve(process.cwd(), "..", "..", "assets"),
    "E:/UtentiLocali/Nello/Desktop/Uniamoci/AspettandoLaBefana/assets"
  ].filter(Boolean);
  let baseDir = null;
  for (const c of assetCandidates) {
    if (fs.existsSync(c)) { baseDir = c; break; }
  }
  if (!baseDir) baseDir = path.resolve(process.cwd(), "assets");

  function tryGetImagePath(symbolCode) {
    const exts = [".jpeg", ".jpg", ".png", ".webp"];
    for (const ext of exts) {
      const imgPath = path.join(baseDir, "symbols", symbolCode + ext);
      if (fs.existsSync(imgPath)) return imgPath;
    }
    return null;
  }
  function tryGetBackgroundPath() {
    const cands = ["background.png", "sfondo.png", "sfondo.jpg", "background.jpg"];
    for (const c of cands) {
      const p = path.join(baseDir, "branding", c);
      if (fs.existsSync(p)) return p;
    }
    // also flat
    for (const c of cands) {
      const p = path.join(baseDir, c);
      if (fs.existsSync(p)) return p;
    }
    return null;
  }
  function loadConfig() {
    try {
      const cands = [
        path.resolve(baseDir, "config", "app.json"),
        path.resolve(baseDir, "..", "config", "app.json"),
        path.resolve(baseDir, "..", "..", "config", "app.json")
      ];
      for (const cp of cands) {
        if (fs.existsSync(cp)) {
          return JSON.parse(fs.readFileSync(cp, "utf8"));
        }
      }
    } catch {}
    return {};
  }

  const bgPath = tryGetBackgroundPath();
  const config = loadConfig();
  const toPrint = ticketNumbers.map((n) => byNumber.get(n)).filter(Boolean);

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A3", layout: "portrait", margin: 0 });

    function drawRoundedImage(imgPath, x, y, size, radius = 6) {
      if (!imgPath) return;
      // ombra
      doc.save();
      doc.fillColor("#000000").opacity(0.22);
      doc.roundedRect(x + 2, y + 2, size, size, radius).fill();
      doc.restore();
      // immagine ritagliata con angoli arrotondati
      doc.save();
      doc.roundedRect(x, y, size, size, radius).clip();
      try { doc.image(imgPath, x, y, { width: size, height: size }); } catch {}
      doc.restore();
    }
    const chunks = [];
    doc.on("data", (c) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const cols = 2;
    const rows = 5;
    const perPage = cols * rows;
    // Allarga il biglietto per coprire il più possibile la pagina A3,
    // lasciando un margine sufficiente per il taglio (crop/bleed).
    const pageMargin = 8 * MM_TO_PT;
    const gapX = 4 * MM_TO_PT;
    const gapY = 4 * MM_TO_PT;
    const ticketWidth = ((doc.page.width - 2 * pageMargin) - (cols - 1) * gapX) / cols;
    const ticketHeight = ((doc.page.height - 2 * pageMargin) - (rows - 1) * gapY) / rows;
    const pageWidth = doc.page.width;
    const pageHeight = doc.page.height;
    const totalWidth = cols * ticketWidth + (cols - 1) * gapX;
    const totalHeight = rows * ticketHeight + (rows - 1) * gapY;
    const marginX = (pageWidth - totalWidth) / 2;
    const marginY = (pageHeight - totalHeight) / 2;

    for (let i = 0; i < toPrint.length; i += perPage) {
      if (i > 0) doc.addPage();
      for (let j = 0; j < perPage && i + j < toPrint.length; j++) {
        const t = toPrint[i + j];
        const col = j % cols;
        const row = Math.floor(j / cols);
        const x = marginX + col * (ticketWidth + gapX);
        const y = marginY + row * (ticketHeight + gapY);

        const matrixWidth = ticketWidth / 4;
        const splitX = x + matrixWidth;

        doc.save();
        doc.lineWidth(0.4);
        doc.dash(2, { space: 2 });
        doc.moveTo(splitX, y).lineTo(splitX, y + ticketHeight).stroke();
        doc.undash();
        doc.restore();

        const ticketSymbols = (t.symbols || [])
          .map((sid) => symbolById.get(sid))
          .filter(Boolean);

        // MATRICE: 3 immagini in verticale + numero sotto
        const matrixImgSize = Math.min(matrixWidth - 4, (ticketHeight - 16) / 3);
        ticketSymbols.forEach((sym, idx) => {
          const imgPath = tryGetImagePath(sym.code);
          const imgX = x + (matrixWidth - matrixImgSize) / 2;
          const imgY = y + 2 + idx * (matrixImgSize + 1);
          drawRoundedImage(imgPath, imgX, imgY, matrixImgSize, 6);
        });
        doc.font("Helvetica-Bold").fontSize(12).text(t.serial, x + 1, y + ticketHeight - 14, { width: matrixWidth - 2, align: "center" });
        doc.font("Helvetica");

        // FIGLIA: sfondo
        const figliaWidth = ticketWidth - matrixWidth;
        if (bgPath) {
          try { doc.image(bgPath, splitX, y, { width: figliaWidth, height: ticketHeight }); } catch {}
        }

        // FIGLIA: titolo (scalato per occupare tutto lo spazio disponibile)
        if (config.title) {
          let titleSize = 16;
          while (titleSize > 6 && doc.widthOfString(config.title, { size: titleSize }) > (figliaWidth - 4)) {
            titleSize -= 0.5;
          }
          doc.font("Helvetica-Bold").fontSize(titleSize).text(config.title, splitX + 2, y + 10, { width: figliaWidth - 4, align: "center" });
          doc.font("Helvetica");
        }

        // FIGLIA: 3 immagini in orizzontale
        const figliaImgSize = Math.min((figliaWidth - 12) / 3, ticketHeight - 38);
        const figliaImgY = y + 18 + (ticketHeight - 18 - 24 - figliaImgSize) / 2;
        ticketSymbols.forEach((sym, idx) => {
          const imgPath = tryGetImagePath(sym.code);
          const imgX = splitX + 2 + idx * (figliaImgSize + 2);
          const imgY = figliaImgY;
          drawRoundedImage(imgPath, imgX, imgY, figliaImgSize, 6);
        });

        // FIGLIA: numero sotto le immagini
        doc.save();
        const numY = figliaImgY + figliaImgSize + 2;
        const numW = figliaWidth * 0.75;
        const numH = 12;
        doc.rect(splitX + (figliaWidth - numW) / 2, numY, numW, numH).fillAndStroke("white", "white");
        doc.fillColor("black");
        doc.font("Helvetica-Bold").fontSize(10).text(t.serial, splitX + (figliaWidth - numW) / 2, numY + 2, { width: numW, align: "center", lineBreak: false });
        doc.font("Helvetica");
        doc.restore();
        // perimetro del biglietto disegnato per ultimo, per racchiudere tutto (rosso scuro)
        doc.strokeColor("#8B0000").lineWidth(0.6).rect(x, y, ticketWidth, ticketHeight).stroke();
        doc.strokeColor("black");
      }
    }

    if (toPrint.length === 0) {
      doc.fontSize(12).text("Nessun biglietto da stampare.");
    }

    doc.end();
  });
}

// ---------- Display su tabellone (proiettore) ----------
export async function getLotteryDisplay() {
  let doc = await LotteryDisplay.findOne({ key: "main" });
  if (!doc) {
    doc = await LotteryDisplay.create({ key: "main" });
  }
  return doc;
}

export async function setLotteryDisplay(data) {
  let doc = await LotteryDisplay.findOne({ key: "main" });
  if (!doc) doc = new LotteryDisplay({ key: "main" });
  if (data.active != null) doc.active = data.active;
  if (data.sessionId != null) doc.sessionId = data.sessionId;
  if (data.batchSize != null) doc.batchSize = data.batchSize;
  if (Array.isArray(data.pool)) doc.pool = data.pool;
  if (Array.isArray(data.drawn)) doc.drawn = data.drawn;
  if (Array.isArray(data.eliminated)) doc.eliminated = data.eliminated;
  if (Array.isArray(data.finalists)) doc.finalists = data.finalists;
  if (data.winnerSerial != null) doc.winnerSerial = data.winnerSerial;
  if (data.winnerNumber != null) doc.winnerNumber = data.winnerNumber;
  if (data.prizeName != null) doc.prizeName = data.prizeName;
  if (data.revealSerial != null) doc.revealSerial = data.revealSerial;
  if (data.revealBooklet != null) doc.revealBooklet = data.revealBooklet;
  if (data.revealIndex != null) doc.revealIndex = data.revealIndex;
  if (data.status != null) doc.status = data.status;
  await doc.save();
  return doc;
}

export async function clearLotteryDisplay() {
  return setLotteryDisplay({ active: false, drawn: [], eliminated: [], finalists: [], winnerSerial: "", winnerNumber: null, prizeName: "", status: "idle", pool: [], batchSize: 5, revealSerial: "", revealBooklet: "", revealIndex: 0 });
}

export async function prepareLotteryDraw(sessionId, batchSize) {
  const n = Number(batchSize) || 5;
  const sess = await LotteryDrawSession.findById(sessionId);
  // Resetta l'assegnazione dei premi della estrazione precedente
  if (sess?.extractionId) {
    const prizeIds = await LotteryPrize.find({ extractionId: sess.extractionId }).distinct("_id");
    if (prizeIds.length) {
      await LotteryPrizeWinner.deleteMany({ prizeId: { $in: prizeIds } });
    }
    await LotteryTicket.updateMany({ extractionId: sess.extractionId, status: "winning" }, { $set: { status: "sold" } });
  }
  const symbols = await LotterySymbol.find({ extractionId: sess?.extractionId }).lean();
  const ids = symbols.length ? symbols.map((s) => s.id) : Array.from({ length: 40 }, (_, i) => i + 1);
  // shuffle
  const pool = [...ids];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = crypto.randomInt(0, i + 1);
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return setLotteryDisplay({
    active: true,
    sessionId,
    batchSize: n,
    pool,
    drawn: [],
    eliminated: [],
    finalists: [],
    winnerSerial: "",
    winnerNumber: null,
    prizeName: "",
    status: "drawing",
    revealSerial: "",
    revealBooklet: "",
    revealIndex: 0
  });
}

export async function drawLotteryBatch() {
  const doc = await getLotteryDisplay();
  if (doc.status !== "drawing") return doc;
  const pool = doc.pool || [];
  const batchSize = doc.batchSize || 5;
  const remaining = pool.slice(doc.drawn.length);
  const next = remaining.slice(0, batchSize);
  // Lascia gli ultimi 3 simbodo come finalisti: si estraggono tutti gli altri.
  const targetDrawn = Math.max(0, pool.length - 3);
  const cap = Math.max(0, targetDrawn - doc.drawn.length);
  const cappedNext = next.slice(0, cap);
  const newDrawn = [...doc.drawn, ...cappedNext];
  const done = newDrawn.length >= targetDrawn;

  const update = { drawn: newDrawn, active: true };
  if (done) {
    // finalisti = gli ultimi 3 simbodo rimasti nel pool (non estratti)
    const finalists = pool.slice(newDrawn.length);
    const eliminated = newDrawn;
    update.finalists = finalists;
    update.eliminated = eliminated;
    update.status = "finalists";
  }
  return setLotteryDisplay(update);
}

export async function setLotteryReveal(serial, booklet) {
  return setLotteryDisplay({
    active: true,
    status: "reveal",
    revealSerial: String(serial || ""),
    revealBooklet: String(booklet || ""),
    revealIndex: 0
  });
}

// ---------- Estrazione casuale di blocchetto e biglietto ----------
async function getValidLotteryCandidates(doc) {
  const sess = doc?.sessionId ? await LotteryDrawSession.findById(doc.sessionId) : null;
  const extractionId = sess?.extractionId;
  if (!extractionId) throw new Error("Sessione/estrazione non valida");
  const finalists = Array.isArray(doc?.finalists) ? doc.finalists : [];
  const sold = await LotteryTicket.find({ extractionId, status: "sold" }).lean();
  let candidates = sold;
  if (finalists.length) {
    candidates = sold.filter((t) => (t.symbols || []).some((s) => finalists.includes(s)));
  }
  if (!candidates.length) {
    // fallback: tutti i venduti
    candidates = sold;
  }
  return candidates;
}

export async function drawLotteryBooklet() {
  const doc = await getLotteryDisplay();
  const candidates = await getValidLotteryCandidates(doc);
  if (!candidates.length) throw new Error("Nessun biglietto valido rimasto (verifica che i biglietti siano segnati come venduti)");
  const booklets = [...new Set(candidates.map((t) => String(t.serial || "").split("-")[0]).filter(Boolean))];
  if (!booklets.length) throw new Error("Nessun blocchetto valido");
  const pick = booklets[Math.floor(Math.random() * booklets.length)];
  return setLotteryDisplay({
    active: true,
    status: "reveal",
    revealBooklet: pick,
    revealSerial: "",
    revealIndex: 0
  });
}

export async function drawLotteryTicket() {
  const doc = await getLotteryDisplay();
  let candidates = await getValidLotteryCandidates(doc);
  if (!candidates.length) throw new Error("Nessun biglietto valido rimasto (verifica che i biglietti siano segnati come venduti)");
  const booklet = doc?.revealBooklet;
  if (booklet) {
    const filtered = candidates.filter((t) => String(t.serial || "").split("-")[0] === String(booklet));
    if (filtered.length) candidates = filtered;
  }
  const ticket = candidates[Math.floor(Math.random() * candidates.length)];
  const parts = String(ticket.serial || "").split("-");
  const serial = parts.length > 1 ? parts[1] : String(ticket.number);
  const bk = parts.length > 1 ? parts[0] : (doc?.revealBooklet || "");
  // marca il biglietto come vincente
  await LotteryTicket.updateOne({ _id: ticket._id }, { $set: { status: "winning" } });
  return setLotteryDisplay({
    active: true,
    status: "reveal",
    revealSerial: serial,
    revealBooklet: bk,
    revealIndex: 0
  });
}

// Keep a simple booklet-list PDF helper (legacy)
export async function buildBookletsPdf(extractionId, bookletNumber) {
  const PDFDocument = (await import("pdfkit")).default;
  const booklets = await listBooklets(extractionId);
  const filtered = bookletNumber != null
    ? booklets.filter((b) => b.number === Number(bookletNumber))
    : booklets;

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 40 });
    const chunks = [];
    doc.on("data", (c) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    filtered.forEach((bk, idx) => {
      if (idx > 0) doc.addPage();
      doc.fontSize(16).text(`Blocchetto n. ${bk.number}`, { align: "center" });
      doc.fontSize(10).text(`Biglietti ${bk.fromNum} - ${bk.toNum}`, { align: "center" });
    });
    if (filtered.length === 0) doc.fontSize(12).text("Nessun blocchetto trovato.");
    doc.end();
  });
}

export async function markTicketsSold(extractionId, payload = {}) {
  const { ticketNumbers, bookletNumber, all } = payload;
  if (all) {
    await LotteryTicket.updateMany({ extractionId }, { $set: { status: "sold" } });
    return { updated: "all" };
  }
  if (bookletNumber != null) {
    const booklet = await LotteryBooklet.findOne({ extractionId, number: Number(bookletNumber) });
    if (!booklet) throw new Error("Blocchetto non trovato");
    await LotteryTicket.updateMany(
      { extractionId, number: { $in: booklet.ticketNumbers } },
      { $set: { status: "sold" } }
    );
    return { updated: booklet.ticketNumbers.length };
  }
  if (Array.isArray(ticketNumbers) && ticketNumbers.length) {
    await LotteryTicket.updateMany(
      { extractionId, number: { $in: ticketNumbers.map(Number) } },
      { $set: { status: "sold" } }
    );
    return { updated: ticketNumbers.length };
  }
  throw new Error("Parametri non validi");
}

export async function createPrize(extractionId, { name, symbolId, value, order }) {
  return LotteryPrize.create({ extractionId, name, symbolId: symbolId != null ? Number(symbolId) : null, value: value ?? "", order: order ?? 0 });
}

export async function listPrizes(extractionId) {
  return LotteryPrize.find({ extractionId }).sort({ order: 1, createdAt: 1 }).lean();
}

export async function deletePrize(prizeId) {
  await LotteryPrize.findByIdAndDelete(prizeId);
  await LotteryPrizeWinner.deleteMany({ prizeId });
}

export async function createDrawSession(extractionId) {
  const agg = await LotteryDrawSession.aggregate([
    { $group: { _id: null, maxNum: { $max: "$number" } } }
  ]);
  const number = (agg[0]?.maxNum ?? 0) + 1;
  const session = await LotteryDrawSession.create({ extractionId: extractionId || null, number });
  return session;
}

function cryptoShuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = crypto.randomInt(0, i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export async function drawCards(sessionId) {
  const session = await LotteryDrawSession.findById(sessionId);
  if (!session) throw new Error("Sessione non trovata");
  if (session.closed) throw new Error("Sessione chiusa");

  const symbols = await LotterySymbol.find({ extractionId: session.extractionId }).lean();
  const list = symbols.length ? symbols : Array.from({ length: 40 }, (_, i) => ({ id: i + 1 }));
  const shuffled = cryptoShuffle(list);
  const drawn = shuffled.slice(0, 40);
  const eliminated = drawn.slice(0, 35);
  const finalists = drawn.slice(35, 40);

  for (let i = 0; i < drawn.length; i++) {
    await LotteryDrawEvent.create({
      sessionId: session._id,
      type: "CARD_DRAWN",
      symbolId: drawn[i].id
    });
  }

  return { drawn, eliminated, finalists };
}

export async function drawNextPrize() {
  const doc = await getLotteryDisplay();
  const sess = doc?.sessionId ? await LotteryDrawSession.findById(doc.sessionId) : null;
  const extractionId = sess?.extractionId;
  if (!extractionId) throw new Error("Sessione/estrazione non valida");

  const prizes = await LotteryPrize.find({ extractionId }).sort({ order: -1, createdAt: -1 }).lean();
  if (!prizes.length) throw new Error("Nessun premio configurato");

  const winners = await LotteryPrizeWinner.find().lean();
  const wonPrizeIds = new Set(winners.map((w) => String(w.prizeId)));
  const nextPrize = prizes.find((p) => !wonPrizeIds.has(String(p._id)));
  if (!nextPrize) throw new Error("Tutti i premi sono già stati estratti");

  const finalists = Array.isArray(doc?.finalists) ? doc.finalists : [];
  const sold = await LotteryTicket.find({ extractionId, status: "sold" }).lean();
  let candidates = sold;
  if (finalists.length) {
    const f = sold.filter((t) => (t.symbols || []).some((s) => finalists.includes(s)));
    if (f.length) candidates = f;
  }
  if (!candidates.length) throw new Error("Nessun biglietto valido rimasto (verifica che i biglietti siano segnati come venduti)");

  const ticket = candidates[Math.floor(Math.random() * candidates.length)];
  await LotteryTicket.updateOne({ _id: ticket._id }, { $set: { status: "winning" } });

  const event = await LotteryDrawEvent.create({
    sessionId: sess._id,
    type: "PRIZE_ASSIGNED",
    symbolId: null,
    ticketId: ticket._id,
    winnerTicketNumber: ticket.number,
    winnerSerial: ticket.serial,
    candidateTicketNumbers: candidates.map((c) => c.number),
    prizeId: nextPrize._id
  });
  await LotteryPrizeWinner.create({
    prizeId: nextPrize._id,
    ticketId: ticket._id,
    ticketNumber: ticket.number,
    serial: ticket.serial,
    eventId: event._id
  });

  const parts = String(ticket.serial || "").split("-");
  return setLotteryDisplay({
    active: true,
    status: "reveal",
    winnerSerial: parts.length > 1 ? parts[1] : String(ticket.number),
    winnerNumber: ticket.number,
    prizeName: nextPrize.name || "",
    revealSerial: parts.length > 1 ? parts[1] : String(ticket.number),
    revealBooklet: parts.length > 1 ? parts[0] : (doc?.revealBooklet || ""),
    revealIndex: 0
  });
}

export async function assignPrize(sessionId, prizeId, symbolId) {
  const session = await LotteryDrawSession.findById(sessionId);
  if (!session) throw new Error("Sessione non trovata");
  if (session.closed) throw new Error("Sessione chiusa");

  const soldTickets = await LotteryTicket.find({
    extractionId: session.extractionId,
    status: "sold"
  }).lean();

  const candidates = soldTickets.filter((t) =>
    (t.symbols || []).includes(Number(symbolId))
  );

  const winners = await LotteryPrizeWinner.find().lean();
  const winnerTicketIds = new Set(winners.map((w) => String(w.ticketId)));
  const available = candidates.filter((c) => !winnerTicketIds.has(String(c._id)));

  if (available.length === 0) {
    throw new Error("Nessun biglietto candidato disponibile");
  }

  const winner = available[crypto.randomInt(0, available.length)];

  const event = await LotteryDrawEvent.create({
    sessionId: session._id,
    type: "PRIZE_ASSIGNED",
    symbolId: Number(symbolId),
    ticketId: winner._id,
    winnerTicketNumber: winner.number,
    winnerSerial: winner.serial,
    candidateTicketNumbers: available.map((c) => c.number),
    prizeId
  });

  const prizeWinner = await LotteryPrizeWinner.create({
    prizeId,
    ticketId: winner._id,
    ticketNumber: winner.number,
    serial: winner.serial,
    eventId: event._id
  });

  // mark ticket as winning
  await LotteryTicket.updateOne({ _id: winner._id }, { $set: { status: "winning" } });

  return { winner: { serial: winner.serial, number: winner.number, id: winner._id }, prizeWinner, eventId: event._id, candidateCount: available.length };
}

// remove placeholder call by redefining assignPrize without it — we'll just not call placeholder.
// (The above function references a non-existent function; fix by editing.)

export async function closeSession(sessionId) {
  const session = await LotteryDrawSession.findByIdAndUpdate(sessionId, { $set: { closed: true } }, { new: true });
  return session;
}

export async function listWinners(sessionId) {
  const events = await LotteryDrawEvent.find({ sessionId, type: "PRIZE_ASSIGNED" }).lean();
  const out = [];
  for (const e of events) {
    out.push({
      eventId: e._id,
      prizeId: e.prizeId,
      symbolId: e.symbolId,
      ticketNumber: e.winnerTicketNumber,
      serial: e.winnerSerial,
      candidateCount: (e.candidateTicketNumbers || []).length
    });
  }
  return out;
}

export async function getSession(sessionId) {
  return LotteryDrawSession.findById(sessionId).lean();
}

export async function listSessions(extractionId) {
  const q = extractionId ? { extractionId } : {};
  return LotteryDrawSession.find(q).sort({ createdAt: -1 }).lean();
}
