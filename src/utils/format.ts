export function formatNumber(n: number | null | undefined): string {
  if (n === null || n === undefined) return "-";
  return n.toLocaleString("ko-KR");
}

const KST_TIME_ZONE = "Asia/Seoul";

/**
 * 서버 datetime 문자열을 Date 로 파싱한다.
 *
 * 서버는 타임존 표기가 없는 UTC LocalDateTime 을 내려준다(예: "2026-05-29T14:21:06").
 * JS `new Date()` 는 오프셋 없는 datetime 을 *로컬* 로 해석해 9시간 어긋나므로,
 * 오프셋/Z 가 없으면 UTC 로 간주하도록 'Z' 를 붙여서 파싱한다.
 * (날짜만 있는 "2026-05-29" 같은 LocalDate 는 그대로 둔다 — 특정 시각이 아닌 달력 날짜)
 */
function parseServerDate(value: string): Date {
  const hasTime = value.includes("T") || value.includes(" ");
  const hasTz = /(?:[zZ]|[+-]\d{2}:?\d{2})$/.test(value);
  const normalized = hasTime && !hasTz ? `${value.replace(" ", "T")}Z` : value;
  return new Date(normalized);
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return "-";
  const d = parseServerDate(value);
  if (Number.isNaN(d.getTime())) return value;
  // sv-SE 로케일은 "YYYY-MM-DD HH:mm:ss" 형태라 기존 표기를 유지하면서 KST 로 변환된다.
  return d
    .toLocaleString("sv-SE", { timeZone: KST_TIME_ZONE })
    .slice(0, 16);
}

export function formatDateOnly(value: string | null | undefined): string {
  if (!value) return "-";
  // datetime 이면 KST 기준 날짜로 변환(자정 부근 하루 밀림 방지), date-only 면 그대로 슬라이스.
  if (value.includes("T") || value.includes(" ")) {
    const d = parseServerDate(value);
    if (!Number.isNaN(d.getTime())) {
      return d.toLocaleDateString("sv-SE", { timeZone: KST_TIME_ZONE });
    }
  }
  return value.slice(0, 10);
}

export function truncate(text: string | null | undefined, len = 40): string {
  if (!text) return "-";
  return text.length > len ? `${text.slice(0, len)}…` : text;
}
