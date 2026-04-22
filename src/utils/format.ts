export function formatNumber(n: number | null | undefined): string {
  if (n === null || n === undefined) return "-";
  return n.toLocaleString("ko-KR");
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, "0");
  const da = String(d.getDate()).padStart(2, "0");
  const h = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${y}-${mo}-${da} ${h}:${mi}`;
}

export function formatDateOnly(value: string | null | undefined): string {
  if (!value) return "-";
  return value.slice(0, 10);
}

export function truncate(text: string | null | undefined, len = 40): string {
  if (!text) return "-";
  return text.length > len ? `${text.slice(0, len)}…` : text;
}
