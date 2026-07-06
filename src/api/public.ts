import axios, { type AxiosInstance } from "axios";

// 비로그인 공개 삭제 요청 전용 클라이언트.
// 공유 http 인스턴스는 401 시 로그인으로 리다이렉트하는 인터셉터가 있어,
// 인증이 필요 없는 공개 페이지에는 부적절하다. 인터셉터 없는 별도 인스턴스를 쓴다.
const baseURL = import.meta.env.VITE_API_BASE_URL?.trim() || "http://localhost:8080";

const publicHttp: AxiosInstance = axios.create({
  baseURL,
  timeout: 15_000,
  headers: { "Content-Type": "application/json" }
});

const PATH = "/api/web/public/deletion-requests";

export const publicApi = {
  requestAccountDeletion: (body: { email: string }) =>
    publicHttp.post(`${PATH}/account`, body).then((r) => r.data),

  requestDataDeletion: (body: { email: string; groupRoomName: string; content: string }) =>
    publicHttp.post(`${PATH}/data`, body).then((r) => r.data)
};
