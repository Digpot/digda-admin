import axios, { AxiosError, type AxiosInstance } from "axios";
import { useAuthStore } from "@/stores/auth";
import router from "@/router";

// 주의: `??` 는 빈 문자열("")을 통과시켜 baseURL 이 비면 모든 요청이 같은 오리진
// (Vercel 정적 호스트)으로 가 비-GET 이 405 가 된다. 빈/공백 값도 폴백되도록 `||` 사용.
const baseURL = import.meta.env.VITE_API_BASE_URL?.trim() || "http://localhost:8080";

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
  // FormData(파일 업로드) 요청은 기본 Content-Type(application/json)을 제거해야 한다.
  // 헤더가 남아 있으면 브라우저가 boundary 가 포함된 `multipart/form-data; boundary=...`
  // 를 못 붙여 서버가 멀티파트를 못 읽고 500 이 난다. 헤더를 비우면 브라우저(XHR)가
  // boundary 까지 자동으로 채워 준다.
  if (typeof FormData !== "undefined" && config.data instanceof FormData) {
    config.headers.delete("Content-Type");
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
