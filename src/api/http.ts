import axios, {
  AxiosError,
  type AxiosInstance,
  type InternalAxiosRequestConfig
} from "axios";
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

// 토큰 갱신 전용 클라이언트 — http 의 인터셉터(401 → 로그인)에 다시 걸리지 않도록
// 인터셉터 없는 별도 인스턴스로 /auth/refresh 를 호출한다.
const refreshClient = axios.create({ baseURL, timeout: 15_000 });

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

// 동시에 여러 요청이 401 을 받아도 토큰 갱신은 한 번만 수행하고, 나머지는
// 그 결과를 함께 기다리게 하기 위한 in-flight 프로미스.
let refreshing: Promise<string | null> | null = null;

/** 저장된 refresh 토큰으로 새 access 토큰을 받아 저장한다. 실패 시 null. */
async function refreshAccessToken(): Promise<string | null> {
  const auth = useAuthStore();
  const token = auth.refreshToken;
  if (!token) return null;
  try {
    const res = await refreshClient.post<{ accessToken: string; refreshToken: string }>(
      "/auth/refresh",
      { refreshToken: token }
    );
    auth.setTokens(res.data.accessToken, res.data.refreshToken);
    return res.data.accessToken;
  } catch {
    return null;
  }
}

/** 만료(401)로 더 이상 살릴 수 없을 때 세션을 비우고 로그인 화면으로 보낸다. */
function forceLogin() {
  const auth = useAuthStore();
  auth.clear();
  if (redirectingToLogin) return;
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

http.interceptors.response.use(
  (res) => res,
  async (err: AxiosError) => {
    const original = err.config as (InternalAxiosRequestConfig & { _retried?: boolean }) | undefined;
    const auth = useAuthStore();

    // access 토큰 만료(401)는 곧장 로그아웃하지 않고, refresh 토큰으로 한 번 갱신한 뒤
    // 원요청을 재시도한다. (refresh 호출 자체의 401, 이미 한 번 재시도한 요청은 제외)
    const isRefreshCall = original?.url?.includes("/auth/refresh");
    if (
      err.response?.status === 401 &&
      original &&
      !original._retried &&
      !isRefreshCall &&
      auth.refreshToken
    ) {
      original._retried = true;
      refreshing ??= refreshAccessToken().finally(() => {
        refreshing = null;
      });
      const newToken = await refreshing;
      if (newToken) {
        // 새 토큰으로 원요청 재시도 (요청 인터셉터가 최신 access 토큰을 자동 주입).
        return http(original);
      }
    }

    if (err.response?.status === 401) {
      forceLogin();
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
