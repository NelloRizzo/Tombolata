export default function ExtractedNumbers({ numbers = [], last }) {
  const recent = [...numbers].reverse();

  return (
    <div className="extracted-numbers">
      <h2>Numeri estratti ({numbers.length})</h2>
      <div className="extracted-list">
        {recent.length === 0 ? (
          <p className="empty">Nessun numero ancora</p>
        ) : (
          recent.map((num, i) => (
            <div
              key={num}
              className={`extracted-item ${num === last ? "last" : ""}`}
            >
              <span className="extracted-order">{numbers.length - i}</span>
              <span className="extracted-num">{num}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
