import axios, { AxiosError, type AxiosInstance } from "axios";
import { useAuthStore } from "@/stores/auth";
import router from "@/router";

const baseURL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8080";

export const http: AxiosInstance = axios.create({
  baseURL,
  timeout: 15_000,
  headers: { "Content-Type": "application/json" }
});

http.interceptors.request.use((config) => {
  const auth = useAuthStore();
  if (auth.accessToken) {
    config.headers.Authorization = `Bearer ${auth.accessToken}`;
  }
  return config;
});

// 401 응답이 짧은 시간에 여러 번 떠도 라우팅을 한 번만 트리거하기 위한 가드.
// (예: 대시보드가 summary+logs 를 병렬로 호출하다가 둘 다 401 → 두 번 push 되는 문제)
let redirectingToLogin = false;

http.interceptors.response.use(
  (res) => res,
  (err: AxiosError) => {
    if (err.response?.status === 401) {
      const auth = useAuthStore();
      auth.clear();
      if (!redirectingToLogin) {
        redirectingToLogin = true;
        // window.location.replace 를 쓰면 SPA 가 풀로드되며 잠깐 흰 화면이 깜빡인다.
        // router.replace 로 SPA 내부 이동만 하고, 현재 경로를 redirect 쿼리로 보존해
        // 로그인 후 원래 화면으로 자연스럽게 복귀하도록 한다.
        const target = router.currentRoute.value.fullPath;
        const isLogin = router.currentRoute.value.name === "login";
        if (!isLogin) {
          router
            .replace({ name: "login", query: { redirect: target } })
            .catch(() => {})
            .finally(() => {
              // 다음 401 이 와도 재로그인 후 다시 401 이 발생하면 다시 리다이렉트해야 하므로
              // 짧은 지연 후 가드를 해제한다 (idle 상태 가정).
              setTimeout(() => {
                redirectingToLogin = false;
              }, 600);
            });
        } else {
          redirectingToLogin = false;
        }
      }
    }
    return Promise.reject(err);
  }
);

export interface ApiError {
  code?: string;
  message?: string;
}

export function extractErrorMessage(err: unknown, fallback = "요청을 처리하지 못했습니다."): string {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as ApiError | undefined;
    return data?.message ?? data?.code ?? err.message ?? fallback;
  }
  return fallback;
}
