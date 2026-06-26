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

function readStored(): AuthState {
  if (typeof window === "undefined") {
    return { accessToken: null, refreshToken: null, adminId: null, email: null, name: null };
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
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
      if (typeof window === "undefined") return;
      window.localStorage.setItem(
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
      if (typeof window !== "undefined") {
        window.localStorage.removeItem(STORAGE_KEY);
      }
    }
  }
});
