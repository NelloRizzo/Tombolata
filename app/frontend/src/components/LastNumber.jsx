export default function LastNumber({ number }) {
  return (
    <div className="last-number-container">
      <div className={`last-number ${number ? "active" : ""}`}>
        {number || "—"}
      </div>
      <div className="last-label">Ultimo numero estratto</div>
    </div>
  );
}
