// Parsing del file .cards (XML DataContract "Tombolata") e utilita' sulle cartelle.
// Ogni <Card> ha: <Name> (es. "Tombolata 2025 [ S. 1] <n. 3>", "Primo Giro n. 42")
// e <Cells> con 15 <a:int> (i numeri della cartella, riga per riga: 3 righe da 5).

function decodeEntities(s) {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function extractCardName(block) {
  const m = /<Name[^>]*>([\s\S]*?)<\/Name>/.exec(block);
  return m ? decodeEntities(m[1]).trim() : "";
}

function extractCardCells(block) {
  const cells = [];
  const re = /<a:int[^>]*>(-?\d+)<\/a:int>/g;
  let m;
  while ((m = re.exec(block))) cells.push(parseInt(m[1], 10));
  return cells;
}

export function parseTombolataCards(xml) {
  const cards = [];
  const blockRe = /<Card>([\s\S]*?)<\/Card>/g;
  let m;
  while ((m = blockRe.exec(xml))) cards.push({ name: extractCardName(m[1]), cells: extractCardCells(m[1]) });
  return cards;
}

// Decompone il nome della cartella:
// - "Tombolata 2025 [ S. 1] <n. 3>"  → { title, setNumber: 1, cardNumber: 3 }
// - "Primo Giro n. 42"               → { title, setNumber: null, cardNumber: 42 }
export function parseCardName(name) {
  const setMatch = /^(.*?)\s*\[\s*S\.\s*(\d+)\s*\]\s*<\s*n\.\s*(\d+)\s*>$/.exec(name);
  if (setMatch) {
    return {
      title: setMatch[1].trim(),
      setNumber: parseInt(setMatch[2], 10),
      cardNumber: parseInt(setMatch[3], 10)
    };
  }
  const plainMatch = /^(.*?)\s*n\.\s*(\d+)\s*$/i.exec(name);
  if (plainMatch) {
    return {
      title: plainMatch[1].trim(),
      setNumber: null,
      cardNumber: parseInt(plainMatch[2], 10)
    };
  }
  return { title: name.trim(), setNumber: null, cardNumber: null };
}

export function toRows(cells) {
  return [cells.slice(0, 5), cells.slice(5, 10), cells.slice(10, 15)];
}

// Etichetta leggibile: "Tombolata 2025 · S.1 · n.3" / "Primo Giro · n.42"
export function cardLabel(card) {
  const parts = [];
  if (card?.title) parts.push(card.title);
  if (card?.setNumber != null) parts.push(`S.${card.setNumber}`);
  if (card?.cardNumber != null) parts.push(`n.${card.cardNumber}`);
  return parts.join(" · ");
}