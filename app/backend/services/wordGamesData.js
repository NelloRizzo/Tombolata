// Dati interni dei giochi di parole (a tema Natale/paese). Servono come
// "mazzo" predefinito da cui i servizi pescano una carta a caso; il regista può
// sempre sovrascriverli inserendo parole/indizi propri dal pannello.

// Anagramma: parola + indizio facoltativo (mostrato sul tabellone).
export const ANAGRAM_WORDS = [
  { word: "REGALO", hint: "Si scarta sotto l'albero" },
  { word: "ALBERO", hint: "Il protagonista del soggiorno a dicembre" },
  { word: "PRESEPE", hint: "La capanna con Gesù Bambino" },
  { word: "CAMPANA", hint: "Suona a mezzanotte" },
  { word: "STELLA", hint: "Brilla in cima all'albero" },
  { word: "SLITTA", hint: "La guida di Babbo Natale" },
  { word: "RENNA", hint: "L'aiutante a quattro zampe di Babbo Natale" },
  { word: "CALZA", hint: "Dove finiscono i doni la notte del 24" },
  { word: "NEVE", hint: "Cade bianca d'inverno" },
  { word: "CAMINO", hint: "Da qui scende Babbo Natale" },
  { word: "PANETTONE", hint: "Dolce milanese del Natale" },
  { word: "PANDORO", hint: "Dolce veronese a forma di stella" },
  { word: "CANDELA", hint: "Si accende e scalda la tavola" },
  { word: "GHIRLANDA", hint: "Decora la porta" },
  { word: "VILLAGGIO", hint: "Tante casette in miniatura" },
  { word: "TORRONE", hint: "Dolce duro con le mandorle" },
  { word: "PATTINI", hint: "Si usano sul ghiaccio" },
  { word: "MERCATINO", hint: "Bancarelle in piazza" },
  { word: "MANDARINO", hint: "Agrume profumato delle feste" },
  { word: "CAPPOTTO", hint: "Lo indossi quando fa freddo" },
  { word: "SCIARPA", hint: "Tiene caldo il collo" },
  { word: "CAMPANELLA", hint: "Piccola campana di Natale" }
];

// Trova l'intruso: 3 parole che appartengono al tema + 1 che non c'entra.
export const INTRUDER_ROUNDS = [
  { theme: "Cose che si appendono all'albero di Natale", members: ["PALLINA", "STELLA", "NASTRO"], intruder: "PADELLA" },
  { theme: "Dolci di Natale", members: ["PANETTONE", "PANDORO", "TORRONE"], intruder: "GELATO" },
  { theme: "Animali della slitta di Babbo Natale", members: ["RENNA", "ALCE", "CAVALLO"], intruder: "PINGUINO" },
  { theme: "Indumenti per il freddo", members: ["SCIARPA", "CAPPOTTO", "GUANTI"], intruder: "COSTUME" },
  { theme: "Addobbi di Natale", members: ["GHIRLANDA", "CAMPANELLA", "PALLINA"], intruder: "ZAINO" },
  { theme: "Sono rossi", members: ["POMODORO", "PEPERONE", "FRAGOLA"], intruder: "CETRIOLO" },
  { theme: "Si usano per apparecchiare", members: ["CANDELA", "TOVAGLIA", "PIATTO"], intruder: "MARTELLO" },
  { theme: "Fanno rumore", members: ["CAMPANA", "TROMBA", "FISCHIETTO"], intruder: "CUSCINO" },
  { theme: "Cose che si vedono in cielo d'inverno", members: ["NEVE", "STELLA", "LUNA"], intruder: "TRENO" },
  { theme: "Cibi del cenone", members: ["TORRONE", "PANDORO", "PANETTONE"], intruder: "ANGURIA" }
];

// Parola a categorie: parola segreta + categoria + indizi (dal vago all'ovvio).
export const CATEGORY_CARDS = [
  { category: "Un oggetto di Natale", word: "PRESEPE", hints: ["Si allestisce in salotto", "Ci sono Maria, Giuseppe e il Bambinello", "Ha la capanna e tante statuine"] },
  { category: "Un dolce", word: "PANETTONE", hints: ["Si mangia a fette", "Ha l'uvetta e i canditi", "È il re della tavola milanese"] },
  { category: "Un personaggio", word: "BABBO NATALE", hints: ["Arriva di notte", "Ha la barba bianca", "Porta i regali"] },
  { category: "Un addobbo", word: "STELLA", hints: ["Sta in alto", "Brilla", "È in cima all'albero"] },
  { category: "Un luogo", word: "MERCATINO", hints: ["Si trova in piazza", "Ci sono le bancarelle", "Ha le luci e il vin brulé"] },
  { category: "Un indumento", word: "SCIARPA", hints: ["Si mette quando fa freddo", "Sta al collo", "Tiene caldo"] },
  { category: "Un animale", word: "RENNA", hints: ["Vive al freddo", "Ha le corna", "Tira la slitta di Babbo Natale"] },
  { category: "Un cibo", word: "TORRONE", hints: ["È duro", "Si spezza", "Ha le mandorle"] },
  { category: "Una bevanda", word: "CIOCCOLATA", hints: ["È dolce e calda", "Si beve in tazza", "Spesso con la panna"] },
  { category: "Un albero", word: "ABETE", hints: ["È sempreverde", "Ha gli aghi", "È l'albero di Natale per eccellenza"] }
];
