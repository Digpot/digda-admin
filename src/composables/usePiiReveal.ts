import { reactive } from "vue";
import type { PiiTarget } from "@/types/api";

/**
 * 개인정보 원문 열람 팝업의 전역 상태. 팝업은 AdminShell 에 하나만 두고,
 * 어느 화면의 마스킹 값을 눌러도 같은 팝업이 열린다.
 *
 * 원문은 이 팝업 안에서만 보여 주고, 닫으면 바로 지운다 — 화면·스토어·스토리지 어디에도
 * 남기지 않는다. 비밀번호도 요청 직후 비운다.
 */
interface PiiRevealState {
  open: boolean;
  /** 팝업 제목 옆에 보여 줄 마스킹된 값 (예: 홍*동) */
  label: string;
  target: PiiTarget | null;
}

export const piiRevealState = reactive<PiiRevealState>({
  open: false,
  label: "",
  target: null
});

export function openPiiReveal(target: PiiTarget, label = "") {
  piiRevealState.target = target;
  piiRevealState.label = label;
  piiRevealState.open = true;
}

export function closePiiReveal() {
  piiRevealState.open = false;
  piiRevealState.target = null;
  piiRevealState.label = "";
}

/** 사용자 한 명의 이름·이메일 열람 대상. id 를 모르면 null — PiiText 가 눌리지 않는 칸이 된다. */
export function userPii(userId: string | null | undefined): PiiTarget | null {
  return userId ? { targetType: "USER", targetId: userId } : null;
}
