/**
 * 사용자가 올린 값이 섞인 URL 을 :href / :src 에 넣기 전에 거른다.
 *
 * Vue 는 텍스트는 이스케이프하지만 속성의 URL 스킴은 검사하지 않는다. 신고 원문·일기 사진
 * 주소처럼 앱 사용자가 만든 값에 `javascript:` 가 들어오면 관리자가 누르는 순간 어드민
 * 권한으로 스크립트가 돈다. http(s) · blob(로컬 미리보기) · data:image 만 통과시킨다.
 */
const ALLOWED_PROTOCOLS = new Set(["https:", "http:", "blob:"]);

export function safeUrl(raw: string | null | undefined): string | undefined {
  if (!raw) return undefined;
  const value = raw.trim();
  if (/^data:image\/(png|jpe?g|gif|webp);base64,/i.test(value)) return value;
  try {
    const url = new URL(value, window.location.origin);
    return ALLOWED_PROTOCOLS.has(url.protocol) ? url.href : undefined;
  } catch {
    return undefined;
  }
}
