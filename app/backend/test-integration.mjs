import { MongoMemoryServer } from "mongodb-memory-server";
import { spawn } from "child_process";

async function run() {
  const mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();

  const env = {
    ...process.env,
    MONGODB_URI: uri,
    MONGODB_DB_NAME: "tombolata_test",
    PORT: "3999",
    JWT_SECRET: "test-secret",
    ADMIN_USERNAME: "admin",
    ADMIN_PASSWORD: "admin"
  };
  const child = spawn("node", ["index.js"], { cwd: process.cwd(), env });

  await new Promise((res, rej) => {
    child.stdout.on("data", (d) => {
      if (d.toString().includes("in ascolto")) res();
    });
    child.stderr.on("data", (d) => {
      if (d.toString().includes("ERRORE")) rej(new Error(d.toString()));
    });
  });

  const base = "http://localhost:3999";

  async function req(path, method = "GET", body = null, token = null) {
    const headers = { "Content-Type": "application/json" };
    if (token) headers.Authorization = `Bearer ${token}`;
    const res = await fetch(`${base}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined
    });
    return res.json();
  }

  async function assert(cond, msg) {
    if (!cond) throw new Error("ASSERT FAILED: " + msg);
    console.log("  ok -", msg);
  }

  console.log("== TEST AUTH ==");
  const adminLogin = await req("/api/auth/login", "POST", { username: "admin", password: "admin" });
  assert(adminLogin.ok, "admin login");
  const adminToken = adminLogin.token;

  // crea utente drawer
  const createdUser = await req("/api/auth/users", "POST",
    { username: "drawer1", password: "pw", displayName: "Drawer Uno", roles: ["drawer", "video"] }, adminToken);
  assert(createdUser.ok, "creazione utente drawer");

  const drawerLogin = await req("/api/auth/login", "POST", { username: "drawer1", password: "pw" });
  assert(drawerLogin.ok, "drawer login");
  const drawerToken = drawerLogin.token;
  assert(drawerLogin.user.roles.includes("drawer"), "roll drawer assegnato");

  // crea un video
  const vid = await req("/api/videos", "POST", { name: "Ritrovamento", source: "https://example.com/v.mp4" }, adminToken);
  assert(vid.ok, "creazione video");

  // crea un trigger "count >= 3" actionType live per TestActor
  const trigger = await req("/api/triggers", "POST", {
    name: "CueTest",
    phase: "always",
    actionType: "live",
    targetActor: "TestActor",
    conditions: [{ operator: "and", conditions: [{ type: "count", value: 3 }] }],
    autoMode: true
  }, adminToken);
  assert(trigger.ok, "creazione trigger count=3");
  const triggerId = trigger.data._id;

  console.log("== TEST GAME + TRIGGER ==");
  const game = await req("/api/game/start", "POST", { name: "Partita Test" }, adminToken);
  assert(game.ok, "creazione partita (admin)");

  const gid = game.data._id;
  assert(game.data.actors.length === 0, "nessun cast di default alla creazione");

  // il cast appartiene alla partita: si aggiunge un personaggio specifico
  const castActor = await req(`/api/game/${gid}/actors`, "POST",
    { name: "TestActor", description: "test", object: "x" }, adminToken);
  assert(castActor.ok, "aggiunta personaggio al cast della partita");

  const board = await req(`/api/game/${gid}/boards`, "POST",
    { playerName: "Marco", boardNumber: 1, rows: [[1,2,3,4,5],[10,20,30,40,50],[11,12,13,14,15]] }, drawerToken);
  assert(board.ok, "aggiunta cartella");

  // archivio globale di cartelle: import .cards (slegate dalle partite)
  const cardXml = (name, nums) =>
    `<Card><Name>${name}</Name><Cells>${nums.map((n) => `<a:int>${n}</a:int>`).join("")}</Cells></Card>`;
  const xmlCards =
    `<Card i:type="ArrayOfCard" xmlns="x">` +
    cardXml("Tombolata 2025 [ S. 1] &lt;n. 1&gt;", [5,23,63,71,82,16,27,34,73,86,35,42,55,74,88]) +
    cardXml("Primo Giro n. 42", [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15]) +
    cardXml("Bad card", [1,2,3,4,5,6,7,8,9,10,11,12,13,14,91]) +
    `</Card>`;
  const imp = await req("/api/cards/import", "POST", { xml: xmlCards }, drawerToken);
  assert(imp.ok, "import cartelle nell'archivio (slegate dalle partite)");
  assert(imp.summary.imported === 2 && imp.summary.skipped === 1, "importate 2 / saltate 1");
  const archive = await req("/api/cards", "GET", null, drawerToken);
  assert(archive.ok && archive.data.length === 2, "archivio contiene le cartelle importate");
  const cardA = archive.data[0];
  assert(cardA.title === "Tombolata 2025" && cardA.setNumber === 1 && cardA.cardNumber === 1, "cartella in set: titolo + set + numero");
  const cardB = archive.data[1];
  assert(cardB.title === "Primo Giro" && cardB.cardNumber === 42 && cardB.setNumber === null, "cartella singola: solo numero");

  // messa in gioco: dall'archivio alla partita
  const play = await req(`/api/game/${gid}/boards/from-cards`, "POST",
    { cardIds: [cardA._id] }, drawerToken);
  assert(play.ok && play.summary.added === 1, "messa in gioco cartella selezionata");
  assert(play.data.boards.length === 2, "2 cartelle in partita (1 manuale + 1 dall'archivio)");
  const play2 = await req(`/api/game/${gid}/boards/from-cards`, "POST",
    { cardIds: [cardA._id, cardB._id] }, drawerToken);
  assert(play2.ok && play2.summary.added === 1 && play2.summary.skipped === 1, "no duplicati, aggiunta solo cartella mancante");
  assert(play2.data.boards.length === 3, "3 cartelle in partita");
  const playAll = await req(`/api/game/${gid}/boards/from-cards`, "POST", { all: true }, drawerToken);
  assert(playAll.ok && playAll.summary.skipped === 2, "ri-selezione 'tutte': nessuna nuova aggiunta");

  // estrai 4 volte: al terzo estratto il trigger count=3 (fase "always" + condizione)
  // è automatico e deve essersi attivato da solo.
  for (let i = 0; i < 4; i++) {
    const ex = await req("/api/game/extract", "POST", null, drawerToken);
    assert(ex.ok, `estrazione ${i + 1}`);
  }

  // verifica stato trigger: condizione presente ⇒ automatico ⇒ fired === 1
  const triggers = await req("/api/triggers", "GET", null, adminToken);
  const t = triggers.data.find((x) => x._id === triggerId);
  assert(t && t.fired === 1, "trigger automatico (condizione) attivato da solo");

  // attore vede il proprio trigger live (personaggio associato per partita)
  const actorUser = await req("/api/auth/users", "POST",
    { username: "actorX", password: "pw", roles: ["actor"] }, adminToken);
  assert(actorUser.ok, "creazione utente attore");

  const assignment = await req(`/api/game/${gid}/assignments`, "POST",
    { userId: actorUser.data._id, character: "TestActor" }, adminToken);
  assert(assignment.ok, "associazione attore→personaggio per la partita");

  const actorLogin = await req("/api/auth/login", "POST", { username: "actorX", password: "pw" });
  assert(actorLogin.ok, "login attore");
  const actorTriggers = await req("/api/triggers", "GET", null, actorLogin.token);
  assert(actorTriggers.ok && actorTriggers.data.length >= 1, "attore vede i propri trigger live");

  // reclama vincite: ogni chiamata registra la vincita successiva e avanza la fase
  const claim1 = await req(`/api/game/${gid}/claim-win`, "POST", {}, adminToken);
  assert(claim1.ok && claim1.data.wonTypes.includes("ambo"), "reclamo ambo: registrato");
  assert(claim1.phase === "post-ambo", "reclamo ambo: fase post-ambo");
  const claim2 = await req(`/api/game/${gid}/claim-win`, "POST", {}, adminToken);
  assert(claim2.ok && claim2.data.wonTypes.includes("terno") && claim2.phase === "post-terno", "reclamo terno: registrato e fase post-terno");
  const claim5 = await req(`/api/game/${gid}/claim-win`, "POST", { winType: "tombola" }, adminToken);
  assert(claim5.ok && claim5.data.wonTypes.includes("tombola") && claim5.phase === "finale", "reclamo tombola: fase finale");

  // avvia/ferma partita (più giri): ferma → finished, riavvia → nuovo giro
  // azzerando i numeri estratti ma mantenendo le cartelle.
  const boardsBefore = claim5.data.boards.length;
  const stop = await req(`/api/game/${gid}/toggle-run`, "POST", null, adminToken);
  assert(stop.ok && stop.data.status === "finished", "ferma partita → finished");
  const again = await req(`/api/game/${gid}/toggle-run`, "POST", null, adminToken);
  assert(again.ok && again.data.status === "active", "riavvia partita → active");
  assert(again.data.extractedNumbers.length === 0 && again.data.wonTypes.length === 0, "nuovo giro: numeri e vincite azzerati");
  assert(again.data.boards.length === boardsBefore, "nuovo giro: cartelle mantenute");

  console.log("== TEST PROGRAMMA ==");
  const sched = await req("/api/game/start", "POST", {
    name: "Partita di Pasqua",
    description: "Seconda serata benefica",
    scheduledAt: "2030-06-15T20:00:00.000Z"
  }, adminToken);
  assert(sched.ok && sched.data.status === "scheduled", "creazione partita programmata (scheduled)");

  const program = await req("/api/game/program");
  assert(program.ok, "endpoint pubblico /program");
  assert(program.data.future.some((g) => g._id === sched.data._id), "partita programmata visibile in future");

  const activated = await req(`/api/game/${sched.data._id}/select`, "POST", null, adminToken);
  assert(activated.ok && activated.data.status === "active", "attivazione partita programmata");

  console.log("== TEST MULTI-PARTITA (gameId) ==");
  const altro = await req("/api/game/start", "POST", { name: "Partita Corrente" }, adminToken);
  assert(altro.ok && altro.data.status === "active", "creazione altra partita attiva");

  // estrazione sulla partita scelta (gameId) senza toccare quella attiva
  const spec = await req("/api/game/extract", "POST", { gameId: sched.data._id }, adminToken);
  assert(spec.ok && spec.data.extractedNumbers.length === 1, "estrazione sulla partita scelta (gameId)");

  const checkExplicit = await req(`/api/game/state?gameId=${sched.data._id}`);
  assert(checkExplicit.ok && checkExplicit.data.extractedNumbers.length === 1, "state?gameId mostra la partita scelta");

  // senza gameId l'estrazione va sulla partita attiva (una diversa da sched)
  const auto = await req("/api/game/extract", "POST", null, adminToken);
  assert(auto.ok && auto.data.extractedNumbers.length === 1 && auto.data._id !== sched.data._id, "estrazione senza gameId sulla partita attiva");

  const checkActive = await req("/api/game/state");
  assert(checkActive.ok && checkActive.data.extractedNumbers.length === 1 && checkActive.data._id !== sched.data._id, "state (senza gameId) è la partita attiva");

  console.log("== TEST PER-GAME CONTENT (trigger/video per partita) ==");
  // crea un trigger e un video dedicati alla partita sched
  const perGameTrigger = await req("/api/triggers", "POST", {
    name: "Trigger Partita",
    actionType: "live",
    phase: "finale",
    gameId: sched.data._id
  }, adminToken);
  assert(perGameTrigger.ok && perGameTrigger.data.gameId === sched.data._id, "creazione trigger per partita");

  const perGameVideo = await req("/api/videos", "POST", {
    name: "Video Partita",
    source: "https://example.com/v.mp4",
    gameId: sched.data._id
  }, adminToken);
  assert(perGameVideo.ok && perGameVideo.data.gameId === sched.data._id, "creazione video per partita");

  // lista filtrata per la partita: include il trigger/video per-partita
  const listPerGameTriggers = await req(`/api/triggers?gameId=${sched.data._id}`, "GET", null, adminToken);
  assert(
    listPerGameTriggers.ok && listPerGameTriggers.data.some((t) => t._id === perGameTrigger.data._id),
    "lista trigger filtrata include il trigger per-partita"
  );
  const listPerGameVideos = await req(`/api/videos?gameId=${sched.data._id}`, "GET", null, adminToken);
  assert(
    listPerGameVideos.ok && listPerGameVideos.data.some((v) => v._id === perGameVideo.data._id),
    "lista video filtrata include il video per-partita"
  );

  // lista globale (senza gameId) NON include i contenuti per-partita
  const globalTriggers = await req("/api/triggers", "GET", null, adminToken);
  assert(
    globalTriggers.ok && !globalTriggers.data.some((t) => t._id === perGameTrigger.data._id),
    "lista globale esclude i trigger per-partita"
  );
  const globalVideos = await req("/api/videos", "GET", null, adminToken);
  assert(
    globalVideos.ok && !globalVideos.data.some((v) => v._id === perGameVideo.data._id),
    "lista globale esclude i video per-partita"
  );

  console.log("== TEST VIDEO ==");
  const playRes = await req(`/api/videos/${vid.data._id}/play`, "POST", null, adminToken);
  assert(playRes.ok && playRes.data.player.status === "playing", "avvio video player");

  const stopRes = await req("/api/videos/stop", "POST", null, adminToken);
  assert(stopRes.ok && stopRes.data.player.status === "idle", "stop video player");

  console.log("== TEST MINIGIOCO (colorCount) ==");
  // il drawer (senza ruoli regia) NON può avviare il gioco
  const denyStart = await req("/api/games/color/start", "POST",
    { totalSquares: 100, numColors: 3 }, drawerToken);
  assert(!denyStart.ok, "drawer senza ruoli regia NON puo avviare il gioco (403)");

  const startGame = await req("/api/games/color/start", "POST",
    { totalSquares: 100, numColors: 3, presentSeconds: 12 }, adminToken);
  assert(startGame.ok && startGame.data.status === "running" && startGame.data.overlayActive, "avvio gioco colorCount");
  assert(startGame.data.colors.length === 100 && startGame.data.palette.length === 3, "layout generato (100 quadrati, 3 colori)");
  assert(startGame.data.presentSeconds === 12 && startGame.data.expiresAt, "durata presentazione salvata con expiry");

  const stateGame = await req("/api/games/color", "GET", null, adminToken);
  assert(stateGame.ok && stateGame.data.overlayActive, "stato minigioco attivo");

  const stopGame = await req("/api/games/color/stop", "POST", null, adminToken);
  assert(stopGame.ok && stopGame.data.status === "idle" && !stopGame.data.overlayActive, "stop gioco → idle e torna al tabellone");
  assert(
    stopGame.data.solution?.kind === "colorCount" &&
      stopGame.data.solution.total === 100 &&
      stopGame.data.solution.color,
    "soluzione colorCount (colore più presente) persistita dopo lo stop"
  );

  console.log("== TEST MINIGIOCO (memory) ==");
  const denyMemory = await req("/api/games/memory/start", "POST",
    { rows: 2, cols: 3 }, drawerToken);
  assert(!denyMemory.ok, "drawer NON puo avviare il memory (403)");

  const startMem = await req("/api/games/memory/start", "POST",
    { rows: 2, cols: 3, presentSeconds: 10 }, adminToken);
  assert(startMem.ok && startMem.data.type === "memory" && startMem.data.status === "running", "avvio memory 2x3");
  assert(startMem.data.cards.length === 6, "deck da 6 carte (3 coppie)");
  const symCount = {};
  startMem.data.cards.forEach((c) => { symCount[c.sym] = (symCount[c.sym] || 0) + 1; });
  assert(Object.values(symCount).every((n) => n === 2), "ogni simbolo ha esattamente 2 carte (coppie)");
  assert(startMem.data.rows * startMem.data.cols === 6 && (startMem.data.cols || 0) > 0 && (startMem.data.rows || 0) > 0, "griglia 2 righe x 3 colonne con coordinate");

  // trova due carte dello stesso simbolo (coppia) e fra due simboli diversi (mismatch)
  const bySym = {};
  startMem.data.cards.forEach((c, i) => { (bySym[c.sym] = bySym[c.sym] || []).push(i); });
  const same = Object.values(bySym).find((g) => g.length === 2);
  const a = same[0];
  const b = same[1];
  await req("/api/games/memory/flip", "POST", { index: a }, adminToken);
  const flipMatch = await req("/api/games/memory/flip", "POST", { index: b }, adminToken);
  assert(flipMatch.ok && flipMatch.data.cards[a].face === "found" && flipMatch.data.cards[b].face === "found", "coppia indovinata → carte restano scoperte (found)");

  const otherCard = startMem.data.cards.findIndex((c, i) => i !== a && i !== b && c.sym !== startMem.data.cards[a].sym);
  const flipUp = await req("/api/games/memory/flip", "POST", { index: otherCard }, adminToken);
  assert(flipUp.ok && flipUp.data.cards[otherCard].face === "up", "carta scoperta (up) in attesa della coppia");

  const stopMem = await req("/api/games/memory/stop", "POST", null, adminToken);
  assert(stopMem.ok && stopMem.data.status === "idle", "stop memory → idle");

  console.log("== TEST MINIGIOCO (numero nascosto) ==");
  const denyHide = await req("/api/games/numberhide/start", "POST",
    { rows: 3, cols: 3 }, drawerToken);
  assert(!denyHide.ok, "drawer NON puo avviare il numero nascosto (403)");

  const startHide = await req("/api/games/numberhide/start", "POST",
    { rows: 3, cols: 3, presentSeconds: 8, hiddenNumber: 47 }, adminToken);
  assert(startHide.ok && startHide.data.type === "numberHide" && startHide.data.status === "running", "avvio numero nascosto 3x3");
  assert(startHide.data.cells.length === 9 && startHide.data.hiddenNumber === 47, "griglia 9 celle con coordinate e numero segreto 47");
  assert(startHide.data.hiddenIndex !== null && startHide.data.hiddenIndex >= 0 && startHide.data.hiddenIndex < 9, "cella segreta assegnata (coordinate implementate)");
  assert(!startHide.data.revealed, "numero non ancora rivelato");

  const revealHide = await req("/api/games/numberhide/reveal", "POST", null, adminToken);
  assert(revealHide.ok && revealHide.data.revealed === true, "regista rivela il numero nascosto");

  const stopHide = await req("/api/games/numberhide/stop", "POST", null, adminToken);
  assert(stopHide.ok && stopHide.data.status === "idle" && !stopHide.data.overlayActive, "stop numero nascosto → idle");
  assert(
    stopHide.data.solution?.kind === "numberHide" &&
      stopHide.data.solution.number === 47 &&
      stopHide.data.solution.cell,
    "soluzione numero nascosto (numero + casella) persistita dopo lo stop"
  );

  console.log("== TEST MINIGIOCO (conta e grida) ==");
  const denyCount = await req("/api/games/countshout/start", "POST",
    { rows: 4, cols: 4 }, drawerToken);
  assert(!denyCount.ok, "drawer NON puo avviare 'conta e grida' (403)");

  const startCount = await req("/api/games/countshout/start", "POST",
    { rows: 4, cols: 5, presentSeconds: 10, numSymbols: 3, target: "⭐" }, adminToken);
  assert(startCount.ok && startCount.data.type === "countShout" && startCount.data.status === "running", "avvio conta e grida 4x5");
  assert(startCount.data.cells.length === 20, "griglia 20 celle di simboli");
  const countAnswer = startCount.data.cells.filter((s) => s === "⭐").length;
  assert(startCount.data.payload.answer === countAnswer && countAnswer > 0, "conteggio obiettivo salvato (target presente)");
  assert(startCount.data.payload.target === "⭐", "simbolo obiettivo configurato");

  const revealCount = await req("/api/games/countshout/reveal", "POST", null, adminToken);
  assert(revealCount.ok && revealCount.data.revealed === true && revealCount.data.status === "done", "rivelazione conteggio");

  const stopCount = await req("/api/games/countshout/stop", "POST", null, adminToken);
  assert(stopCount.ok && stopCount.data.status === "idle", "stop conta e grida → idle");
  assert(
    stopCount.data.solution?.kind === "countShout" &&
      stopCount.data.solution.target === "⭐" &&
      stopCount.data.solution.answer === countAnswer,
    "soluzione conta e grida persistita dopo lo stop"
  );

  console.log("== TEST MINIGIOCO (che numero manca?) ==");
  const denyMissing = await req("/api/games/missingnumber/start", "POST",
    { rows: 3, cols: 3 }, drawerToken);
  assert(!denyMissing.ok, "drawer NON puo avviare 'che numero manca?' (403)");

  const startMissing = await req("/api/games/missingnumber/start", "POST",
    { rows: 3, cols: 3, presentSeconds: 8 }, adminToken);
  assert(startMissing.ok && startMissing.data.type === "missingNumber" && startMissing.data.status === "running", "avvio che numero manca? 3x3");
  const totalCells = startMissing.data.cells.length;
  const missingVal = startMissing.data.payload.missing;
  assert(totalCells === 9 && missingVal >= 1 && missingVal <= 9, "griglia 9 celle e numero mancante nel range");
  assert(startMissing.data.cells.includes(""), "una cella vuota (il numero mancante)");
  assert(!startMissing.data.cells.includes(String(missingVal)), "numero mancante assente dalla griglia");
  assert(startMissing.data.cells.filter((c) => c !== "").length === 8, "gli altri 8 numeri presenti");

  const revealMissing = await req("/api/games/missingnumber/reveal", "POST", null, adminToken);
  assert(revealMissing.ok && revealMissing.data.revealed === true, "rivelazione numero mancante");

  const stopMissing = await req("/api/games/missingnumber/stop", "POST", null, adminToken);
  assert(stopMissing.ok && stopMissing.data.status === "idle", "stop che numero manca? → idle");
  assert(
    stopMissing.data.solution?.kind === "missingNumber" &&
      stopMissing.data.solution.missing === missingVal,
    "soluzione numero mancante persistita dopo lo stop"
  );

  console.log("== TEST MINIGIOCO (anagramma) ==");
  const denyAnagram = await req("/api/games/anagram/start", "POST", { word: "REGALO" }, drawerToken);
  assert(!denyAnagram.ok, "drawer NON puo avviare l'anagramma (403)");

  const startAnagram = await req("/api/games/anagram/start", "POST",
    { word: "regalo", presentSeconds: 15 }, adminToken);
  assert(startAnagram.ok && startAnagram.data.type === "anagram" && startAnagram.data.status === "running", "avvio anagramma");
  assert(startAnagram.data.payload.word === "REGALO", "parola normalizzata in maiuscolo");
  const sortedScrambled = [...startAnagram.data.payload.scrambled].sort().join("");
  assert(sortedScrambled === [..."REGALO"].sort().join(""), "le lettere mescolate sono un anagramma della parola");
  assert(startAnagram.data.cells.length === 6, "6 celle (una per lettera)");
  assert(!startAnagram.data.payload.word.includes(startAnagram.data.payload.scrambled) || startAnagram.data.payload.scrambled !== "REGALO", "parola mescolata (non identica)");
  assert(startAnagram.data.payload.hint, "indizio presente");

  const revealAnagram = await req("/api/games/anagram/reveal", "POST", null, adminToken);
  assert(revealAnagram.ok && revealAnagram.data.revealed === true && revealAnagram.data.status === "done", "rivelazione anagramma");
  assert(revealAnagram.data.solution?.kind === "anagram" && revealAnagram.data.solution.word === "REGALO", "soluzione anagramma (parola)");

  const stopAnagram = await req("/api/games/anagram/stop", "POST", null, adminToken);
  assert(stopAnagram.ok && stopAnagram.data.status === "idle", "stop anagramma → idle");
  assert(stopAnagram.data.solution?.word === "REGALO", "soluzione anagramma persistita dopo lo stop");

  console.log("== TEST MINIGIOCO (trova l'intruso) ==");
  const denyIntruder = await req("/api/games/intruder/start", "POST", {}, drawerToken);
  assert(!denyIntruder.ok, "drawer NON puo avviare 'trova l'intruso' (403)");

  const startIntruder = await req("/api/games/intruder/start", "POST",
    { words: ["pallina", "stella", "nastro", "padella"], intruder: 3, theme: "Addobbi di Natale", presentSeconds: 15 }, adminToken);
  assert(startIntruder.ok && startIntruder.data.type === "intruder" && startIntruder.data.status === "running", "avvio trova l'intruso");
  assert(startIntruder.data.cells.length === 4 && startIntruder.data.payload.intruderIndex === 3, "4 parole con indice intruso salvato");
  assert(startIntruder.data.payload.words[3] === "PADELLA" && startIntruder.data.payload.theme === "Addobbi di Natale", "parole normalizzate e tema salvato");

  const revealIntruder = await req("/api/games/intruder/reveal", "POST", null, adminToken);
  assert(revealIntruder.ok && revealIntruder.data.revealed === true, "rivelazione intruso");
  assert(revealIntruder.data.solution?.kind === "intruder" && revealIntruder.data.solution.word === "PADELLA", "soluzione intruso (parola)");

  const stopIntruder = await req("/api/games/intruder/stop", "POST", null, adminToken);
  assert(stopIntruder.ok && stopIntruder.data.status === "idle", "stop intruso → idle");
  assert(stopIntruder.data.solution?.word === "PADELLA", "soluzione intruso persistita dopo lo stop");

  console.log("== TEST MINIGIOCO (parola a categorie) ==");
  const denyCategories = await req("/api/games/categories/start", "POST", {}, drawerToken);
  assert(!denyCategories.ok, "drawer NON puo avviare 'parola a categorie' (403)");

  const startCategories = await req("/api/games/categories/start", "POST",
    { category: "Un oggetto", word: "presepe", hints: ["indizio uno", "indizio due", "indizio tre"], presentSeconds: 20 }, adminToken);
  assert(startCategories.ok && startCategories.data.type === "categories" && startCategories.data.status === "running", "avvio parola a categorie");
  assert(startCategories.data.payload.word === "PRESEPE" && startCategories.data.payload.hints.length === 3, "parola e 3 indizi salvati");
  assert(startCategories.data.revealedHints === 0, "nessun indizio ancora svelato");

  const hint1 = await req("/api/games/categories/hint", "POST", null, adminToken);
  assert(hint1.ok && hint1.data.revealedHints === 1, "primo indizio svelato");
  const hint2 = await req("/api/games/categories/hint", "POST", null, adminToken);
  assert(hint2.ok && hint2.data.revealedHints === 2, "secondo indizio svelato");

  const revealCategories = await req("/api/games/categories/reveal", "POST", null, adminToken);
  assert(revealCategories.ok && revealCategories.data.revealed === true && revealCategories.data.status === "done", "rivelazione parola a categorie");
  assert(revealCategories.data.solution?.kind === "categories" && revealCategories.data.solution.word === "PRESEPE", "soluzione parola a categorie");

  const stopCategories = await req("/api/games/categories/stop", "POST", null, adminToken);
  assert(stopCategories.ok && stopCategories.data.status === "idle", "stop parola a categorie → idle");
  assert(stopCategories.data.solution?.word === "PRESEPE" && stopCategories.data.revealedHints === 0, "soluzione persistita e indizi azzerati allo stop");

  console.log("== TEST PERMESSI ==");
  // un utente senza ruoli non puo estrarre
  const spett = await req("/api/auth/users", "POST",
    { username: "utentesemplice", password: "pw", roles: [] }, adminToken);
  const spettLogin = await req("/api/auth/login", "POST", { username: "utentesemplice", password: "pw" });
  const forbidden = await req("/api/game/extract", "POST", null, spettLogin.token);
  assert(!forbidden.ok, "utente senza ruoli NON puo estrarre (403)");

  child.kill();
  await mongod.stop();
  console.log("\n✓ TUTTI I TEST SUPERATI");
}

run().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
