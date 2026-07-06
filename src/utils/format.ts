export function formatNumber(n: number | null | undefined): string {
  if (n === null || n === undefined) return "-";
  return n.toLocaleString("ko-KR");
}

const KST_TIME_ZONE = "Asia/Seoul";

/**
 * 서버 datetime 이 타임존 표기(Z 또는 ±HH:mm)를 가지는지 여부.
 */
function hasTimeZone(value: string): boolean {
  return /(?:[zZ]|[+-]\d{2}:?\d{2})$/.test(value);
}

/**
 * 서버는 JVM 시간대를 Asia/Seoul 로 고정(2026-06-28)했기 때문에, 타임존 표기가
 * 없는 naive LocalDateTime 을 **이미 KST** 로 내려준다(예: "2026-05-29T14:21:06").
 * 따라서 표기 없는 값은 그대로 KST 로 보고 표시하고(추가 환산 금지 — 예전처럼 'Z'
 * 를 붙이면 +9시간 어긋난다), Z/오프셋이 붙은 값만 실제 KST 로 환산한다.
 */
export function formatDate(value: string | null | undefined): string {
  if (!value) return "-";
  const hasTime = value.includes("T") || value.includes(" ");
  if (!hasTime) return value; // 날짜만 있는 LocalDate 는 그대로
  if (hasTimeZone(value)) {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    // sv-SE 로케일 = "YYYY-MM-DD HH:mm:ss" 형태로 KST 환산.
    return d.toLocaleString("sv-SE", { timeZone: KST_TIME_ZONE }).slice(0, 16);
  }
  // naive == 이미 KST wall-clock → 그대로 표시.
  return value.replace("T", " ").slice(0, 16);
}

export function formatDateOnly(value: string | null | undefined): string {
  if (!value) return "-";
  const hasTime = value.includes("T") || value.includes(" ");
  if (!hasTime) return value.slice(0, 10);
  if (hasTimeZone(value)) {
    const d = new Date(value);
    if (!Number.isNaN(d.getTime())) {
      return d.toLocaleDateString("sv-SE", { timeZone: KST_TIME_ZONE });
    }
  }
  // naive == 이미 KST → 날짜 부분 그대로.
  return value.slice(0, 10);
}

export function truncate(text: string | null | undefined, len = 40): string {
  if (!text) return "-";
  return text.length > len ? `${text.slice(0, len)}…` : text;
}
