export default function NumberGrid({ extracted = [], fill = false }) {
  const groups = [];
  for (let g = 0; g < 9; g++) {
    const start = g * 10 + 1;
    const numbers = [];
    for (let i = 0; i < 10; i++) numbers.push(start + i);
    groups.push(numbers);
  }

  const extractedSet = new Set(extracted);

  return (
    <div className={`number-grid ${fill ? "fill" : ""}`}>
      {groups.map((group, gi) => (
        <div className="grid-group" key={gi}>
          {group.map((num) => (
            <div
              key={num}
              className={`grid-cell ${extractedSet.has(num) ? "extracted" : ""}`}
            >
              {num}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
