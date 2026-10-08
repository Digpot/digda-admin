import { reactive } from "vue";
import { adminApi } from "@/api/admin";
import { useAuthStore } from "@/stores/auth";

/**
 * 민감한 화면(DB 탭·일기 전문·신고 원문·사용자 ID)에 들어가기 전에 관리자 비밀번호를 다시 묻는다.
 * 팝업은 AdminShell 에 하나만 두고, `requestAdminPassword()` 가 확인 결과를 Promise 로 돌려준다.
 *
 * 검사는 서버의 개인정보 열람 API 를 "내 계정" 대상으로 호출해 한다 — 비밀번호가 맞아야만
 * 200 이 오고, 5회 틀리면 서버가 10분 잠근다(429). 열람 이력도 서버 로그에 남는다.
 * 비밀번호는 요청 직후 버리고 어디에도 저장하지 않는다.
 */
interface PasswordGateState {
  open: boolean;
  title: string;
  description: string;
  /** 확인 후 팝업 안에 보여 줄 값(예: 사용자 ID). 없으면 확인 즉시 닫힌다. */
  reveal: Record<string, string> | null;
  revealed: boolean;
  resolve: ((ok: boolean) => void) | null;
}

export const passwordGateState = reactive<PasswordGateState>({
  open: false,
  title: "",
  description: "",
  reveal: null,
  revealed: false,
  resolve: null
});

export function requestAdminPassword(options: {
  title: string;
  description?: string;
  reveal?: Record<string, string>;
}): Promise<boolean> {
  // 이미 열린 요청이 있으면 취소로 끝낸다 — 한 번에 하나만.
  passwordGateState.resolve?.(false);
  return new Promise((resolve) => {
    passwordGateState.title = options.title;
    passwordGateState.description = options.description ?? "";
    passwordGateState.reveal = options.reveal ?? null;
    passwordGateState.revealed = false;
    passwordGateState.resolve = resolve;
    passwordGateState.open = true;
  });
}

/** 비밀번호가 맞으면 resolve, 틀리면 서버 에러를 그대로 던진다. */
export async function verifyAdminPassword(password: string): Promise<void> {
  const auth = useAuthStore();
  if (!auth.adminId) throw new Error("로그인 정보가 없습니다. 다시 로그인해 주세요.");
  await adminApi.revealPii({ targetType: "USER", targetId: auth.adminId, password });
}

export function finishPasswordGate(ok: boolean) {
  const resolve = passwordGateState.resolve;
  passwordGateState.open = false;
  passwordGateState.resolve = null;
  passwordGateState.reveal = null;
  passwordGateState.revealed = false;
  resolve?.(ok);
}

/** 화면에 보여 줄 ID — 앞 4자리만. 원문은 비밀번호 확인 후 팝업에서. */
export function maskId(id: string | number | null | undefined): string {
  if (id === null || id === undefined || id === "") return "-";
  const s = String(id);
  return s.length <= 4 ? "••••" : `${s.slice(0, 4)}••••`;
}
