export const TOTAL_NUMBERS = 90;
export const ROWS_PER_GROUP = 10;

export function getGroupTitle(num) {
  const group = Math.floor((num - 1) / 10); // 0-8
  const start = group * 10 + 1;
  const end = start + 9;
  return `${start} - ${end}`;
}

export function formatTimestamp(date) {
  if (!date) return "";
  const d = new Date(date);
  return d.toLocaleTimeString("it-IT", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });
}

export function totalBoards(game) {
  return game?.boards?.length || 0;
}
