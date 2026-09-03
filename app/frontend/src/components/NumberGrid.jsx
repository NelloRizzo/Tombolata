export default function NumberGrid({ extracted = [], fill = false }) {
  // Il tabellone è diviso in 6 card (2 colonne x 3 righe): ogni card
  // contiene 15 numeri (3 righe x 5 colonne) della tombola italiana.
  const cards = [
    // banda 1-30
    [[1, 2, 3, 4, 5], [11, 12, 13, 14, 15], [21, 22, 23, 24, 25]],
    [[6, 7, 8, 9, 10], [16, 17, 18, 19, 20], [26, 27, 28, 29, 30]],
    // banda 31-60
    [[31, 32, 33, 34, 35], [41, 42, 43, 44, 45], [51, 52, 53, 54, 55]],
    [[36, 37, 38, 39, 40], [46, 47, 48, 49, 50], [56, 57, 58, 59, 60]],
    // banda 61-90
    [[61, 62, 63, 64, 65], [71, 72, 73, 74, 75], [81, 82, 83, 84, 85]],
    [[66, 67, 68, 69, 70], [76, 77, 78, 79, 80], [86, 87, 88, 89, 90]],
  ];

  const extractedSet = new Set(extracted);

  return (
    <div className={`number-grid ${fill ? "fill" : ""}`}>
      {cards.map((card, ci) => (
        <div className="board-card" key={ci}>
          {card.map((row, ri) => (
            <div className="card-row" key={ri}>
              {row.map((num) => (
                <div
                  key={num}
                  className={`grid-cell ${extractedSet.has(num) ? "extracted" : ""}`}
                >
                  <span className="cell-num">{num}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
