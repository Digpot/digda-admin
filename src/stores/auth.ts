import { defineStore } from "pinia";
import { adminApi } from "@/api/admin";
import type { AdminLoginRequest } from "@/types/api";

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  adminId: string | null;
  email: string | null;
  name: string | null;
}

const STORAGE_KEY = "digda-admin-auth";

/**
 * 토큰은 sessionStorage 에 둔다. localStorage 는 브라우저를 닫아도 남아서, 공용 PC 나
 * 탈취된 브라우저 프로필에서 관리자 토큰이 그대로 살아 있었다. sessionStorage 는 탭을
 * 닫으면 사라진다(새 탭에서는 다시 로그인).
 */
function storage(): Storage | null {
  if (typeof window === "undefined") return null;
  return window.sessionStorage;
}

/** 예전 버전이 localStorage 에 남긴 토큰을 지운다. */
function purgeLegacy() {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* 스토리지 접근이 막힌 환경 — 지울 것도 없다 */
  }
}

function readStored(): AuthState {
  if (typeof window === "undefined") {
    return { accessToken: null, refreshToken: null, adminId: null, email: null, name: null };
  }
  purgeLegacy();
  try {
    const raw = storage()?.getItem(STORAGE_KEY);
    if (!raw) throw new Error("empty");
    return JSON.parse(raw) as AuthState;
  } catch {
    return { accessToken: null, refreshToken: null, adminId: null, email: null, name: null };
  }
}

export const useAuthStore = defineStore("auth", {
  state: (): AuthState => ({
    accessToken: null,
    refreshToken: null,
    adminId: null,
    email: null,
    name: null
  }),
  getters: {
    isAuthenticated: (s) => Boolean(s.accessToken)
  },
  actions: {
    hydrate() {
      const stored = readStored();
      this.accessToken = stored.accessToken;
      this.refreshToken = stored.refreshToken;
      this.adminId = stored.adminId;
      this.email = stored.email;
      this.name = stored.name;
    },
    async login(payload: AdminLoginRequest) {
      const res = await adminApi.login(payload);
      this.accessToken = res.accessToken;
      this.refreshToken = res.refreshToken;
      this.adminId = res.adminId;
      this.email = res.email;
      this.name = res.name;
      this.persist();
    },
    // 토큰 갱신(/auth/refresh) 성공 시 새 access/refresh 토큰만 교체·저장한다.
    setTokens(accessToken: string, refreshToken: string) {
      this.accessToken = accessToken;
      this.refreshToken = refreshToken;
      this.persist();
    },
    persist() {
      storage()?.setItem(
        STORAGE_KEY,
        JSON.stringify({
          accessToken: this.accessToken,
          refreshToken: this.refreshToken,
          adminId: this.adminId,
          email: this.email,
          name: this.name
        })
      );
    },
    clear() {
      this.accessToken = null;
      this.refreshToken = null;
      this.adminId = null;
      this.email = null;
      this.name = null;
      storage()?.removeItem(STORAGE_KEY);
      if (typeof window !== "undefined") purgeLegacy();
    }
  }
});
