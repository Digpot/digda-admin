import { http } from "./http";
import type {
  AdminAnnouncement,
  AdminCharacter,
  AdminColumnInfo,
  AdminDiary,
  AdminExhibitAccess,
  AdminGroupRoom,
  AdminLoginRequest,
  AdminLoginResponse,
  AdminNicknameExhibit,
  AdminPageResponse,
  AdminSchedule,
  AdminTableInfo,
  AdminTableRows,
  AdminUpdateCharacterRequest,
  AdminUpsertRowRequest,
  CoinGrant,
  AdminUser,
  AdminUserTitle,
  AdminWriteResult,
  AppConfig,
  CreateNicknameExhibitRequest,
  TitleCatalogItem,
  DashboardSummary,
  ExpEvent,
  GrantCoinRequest,
  GroupRoomAction,
  Role,
  SendAnnouncementRequest,
  SendAnnouncementResponse,
  UpdateExpEventRequest,
  UpdateNicknameExhibitRequest,
  UploadImageResponse,
  UserActionLog,
  UserActionType,
  RevealPiiRequest,
  RevealPiiResponse
} from "@/types/api";
import type {
  AdminReport,
  ReportStatus,
  ReportTargetType,
  AdminInquiry,
  InquiryStatus,
  AdminDeletionRequest,
  DeletionRequestStatus,
  AdminFeedbackQuestion,
  FeedbackQuestionItem,
  AdminFeedbackSubmission
} from "@/types/api";

const API = "/api/admin";

export const adminApi = {
  login: (body: AdminLoginRequest) =>
    http.post<AdminLoginResponse>(`${API}/auth/login`, body).then((r) => r.data),

  summary: () => http.get<DashboardSummary>(`${API}/dashboard/summary`).then((r) => r.data),

  searchUsers: (params: { keyword?: string; role?: Role; page?: number; size?: number }) =>
    http
      .get<AdminPageResponse<AdminUser>>(`${API}/users`, { params })
      .then((r) => r.data),

  getUser: (userId: string) =>
    http.get<AdminUser>(`${API}/users/${userId}`).then((r) => r.data),

  updateUserRole: (userId: string, role: Role) =>
    http.patch<AdminUser>(`${API}/users/${userId}/role`, { role }).then((r) => r.data),

  updateUserRestriction: (userId: string, restricted: boolean) =>
    http
      .patch<AdminUser>(`${API}/users/${userId}/restriction`, { restricted })
      .then((r) => r.data),

  searchGroupRooms: (params: {
    keyword?: string;
    includeDeleted?: boolean;
    page?: number;
    size?: number;
  }) =>
    http
      .get<AdminPageResponse<AdminGroupRoom>>(`${API}/group-rooms`, { params })
      .then((r) => r.data),

  getGroupRoom: (id: number) =>
    http.get<AdminGroupRoom>(`${API}/group-rooms/${id}`).then((r) => r.data),

  changeGroupRoomStatus: (id: number, action: GroupRoomAction) =>
    http
      .patch<AdminGroupRoom>(`${API}/group-rooms/${id}/status`, { action })
      .then((r) => r.data),

  searchDiaries: (params: { keyword?: string; page?: number; size?: number }) =>
    http
      .get<AdminPageResponse<AdminDiary>>(`${API}/diaries`, { params })
      .then((r) => r.data),

  getDiary: (id: number) => http.get<AdminDiary>(`${API}/diaries/${id}`).then((r) => r.data),

  deleteDiary: (id: number) => http.delete<void>(`${API}/diaries/${id}`).then((r) => r.data),

  searchSchedules: (params: { keyword?: string; page?: number; size?: number }) =>
    http
      .get<AdminPageResponse<AdminSchedule>>(`${API}/schedules`, { params })
      .then((r) => r.data),

  getSchedule: (id: number) =>
    http.get<AdminSchedule>(`${API}/schedules/${id}`).then((r) => r.data),

  listTables: () => http.get<AdminTableInfo[]>(`${API}/db/tables`).then((r) => r.data),

  listColumns: (name: string) =>
    http.get<AdminColumnInfo[]>(`${API}/db/tables/${name}/columns`).then((r) => r.data),

  readRows: (
    name: string,
    params: { page?: number; size?: number; orderBy?: string; direction?: "ASC" | "DESC" }
  ) =>
    http
      .get<AdminTableRows>(`${API}/db/tables/${name}/rows`, { params })
      .then((r) => r.data),

  insertRow: (name: string, body: AdminUpsertRowRequest) =>
    http.post<AdminWriteResult>(`${API}/db/tables/${name}/rows`, body).then((r) => r.data),

  updateRow: (name: string, pk: Record<string, string>, body: AdminUpsertRowRequest) =>
    http
      .patch<AdminWriteResult>(`${API}/db/tables/${name}/rows`, body, { params: pk })
      .then((r) => r.data),

  deleteRow: (name: string, pk: Record<string, string>) =>
    http
      .delete<AdminWriteResult>(`${API}/db/tables/${name}/rows`, { params: pk })
      .then((r) => r.data),

  searchLogs: (params: {
    actorId?: string;
    action?: UserActionType;
    from?: string;
    to?: string;
    keyword?: string;
    page?: number;
    size?: number;
  }) =>
    http
      .get<AdminPageResponse<UserActionLog>>(`${API}/logs`, { params })
      .then((r) => r.data),

  sendAnnouncement: (body: SendAnnouncementRequest) =>
    http
      .post<SendAnnouncementResponse>(`${API}/announcements`, body)
      .then((r) => r.data),

  searchAnnouncements: (params: { keyword?: string; page?: number; size?: number }) =>
    http
      .get<AdminPageResponse<AdminAnnouncement>>(`${API}/announcements`, { params })
      .then((r) => r.data),

  // ── Deletion request (계정/데이터 삭제 요청) ──

  searchDeletionRequests: (params: {
    status?: DeletionRequestStatus;
    page?: number;
    size?: number;
  }) =>
    http
      .get<AdminPageResponse<AdminDeletionRequest>>(`${API}/deletion-requests`, { params })
      .then((r) => r.data),

  markDeletionRequestDone: (id: number) =>
    http
      .patch<AdminDeletionRequest>(`${API}/deletion-requests/${id}/done`)
      .then((r) => r.data),

  // ── Character (Mochi) ──

  searchCharacters: (params: {
    keyword?: string;
    includeDeletedGroups?: boolean;
    page?: number;
    size?: number;
  }) =>
    http
      .get<AdminPageResponse<AdminCharacter>>(`${API}/characters`, { params })
      .then((r) => r.data),

  getCharacter: (groupRoomId: number) =>
    http
      .get<AdminCharacter>(`${API}/characters/${groupRoomId}`)
      .then((r) => r.data),

  updateCharacter: (groupRoomId: number, body: AdminUpdateCharacterRequest) =>
    http
      .patch<AdminCharacter>(`${API}/characters/${groupRoomId}`, body)
      .then((r) => r.data),

  // ── Nickname Exhibit (역대 별명 전시관) ──

  searchExhibits: (params: { keyword?: string; page?: number; size?: number }) =>
    http
      .get<AdminPageResponse<AdminNicknameExhibit>>(`${API}/nickname-exhibits`, { params })
      .then((r) => r.data),

  createExhibit: (body: CreateNicknameExhibitRequest) =>
    http
      .post<AdminNicknameExhibit>(`${API}/nickname-exhibits`, body)
      .then((r) => r.data),

  updateExhibit: (id: number, body: UpdateNicknameExhibitRequest) =>
    http
      .patch<AdminNicknameExhibit>(`${API}/nickname-exhibits/${id}`, body)
      .then((r) => r.data),

  deleteExhibit: (id: number) =>
    http.delete<void>(`${API}/nickname-exhibits/${id}`).then((r) => r.data),

  searchExhibitAccess: (params: { keyword?: string; page?: number; size?: number }) =>
    http
      .get<AdminPageResponse<AdminExhibitAccess>>(`${API}/nickname-exhibits/access`, {
        params
      })
      .then((r) => r.data),

  addExhibitAccess: (userId: string) =>
    http
      .post<AdminExhibitAccess>(`${API}/nickname-exhibits/access`, { userId })
      .then((r) => r.data),

  removeExhibitAccess: (userId: string) =>
    http
      .delete<void>(`${API}/nickname-exhibits/access/${userId}`)
      .then((r) => r.data),

  // ── Title (칭호 부여/회수) ──

  titleCatalog: () =>
    http.get<TitleCatalogItem[]>(`${API}/titles/catalog`).then((r) => r.data),

  getUserTitles: (userId: string) =>
    http.get<AdminUserTitle[]>(`${API}/titles/users/${userId}`).then((r) => r.data),

  grantTitle: (userId: string, code: string) =>
    http.post<AdminUserTitle[]>(`${API}/titles/grant`, { userId, code }).then((r) => r.data),

  revokeTitle: (userId: string, code: string) =>
    http.delete<AdminUserTitle[]>(`${API}/titles/users/${userId}/${code}`).then((r) => r.data),

  // ── App Config (대공지 · 피드백) ──

  getAppConfig: () => http.get<AppConfig>(`${API}/app-config`).then((r) => r.data),

  updateAppConfig: (body: AppConfig) =>
    http.put<AppConfig>(`${API}/app-config`, body).then((r) => r.data),

  // ── Event (시즌 이벤트: 경험치 배수 · 코인 전체 지급) ──

  getExpEvent: () => http.get<ExpEvent>(`${API}/events/exp`).then((r) => r.data),

  updateExpEvent: (body: UpdateExpEventRequest) =>
    http.put<ExpEvent>(`${API}/events/exp`, body).then((r) => r.data),

  /** 되돌릴 수 없는 일괄 지급 — 화면에서 확인 모달을 거친 뒤에만 호출한다. */
  grantCoin: (body: GrantCoinRequest) =>
    http.post<CoinGrant>(`${API}/events/coin-grants`, body).then((r) => r.data),

  searchCoinGrants: (params: { page?: number; size?: number }) =>
    http
      .get<AdminPageResponse<CoinGrant>>(`${API}/events/coin-grants`, { params })
      .then((r) => r.data),

  // ── Region Map (지도 채움) ──

  getFilledRegions: (groupRoomId: number) =>
    http
      .get<string[]>(`${API}/region-map`, { params: { groupRoomId } })
      .then((r) => r.data),

  fillRegions: (groupRoomId: number, regionKeys: string[]) =>
    http
      .post<string[]>(`${API}/region-map/fill`, { groupRoomId, regionKeys })
      .then((r) => r.data),

  unfillRegions: (groupRoomId: number, regionKeys: string[]) =>
    http
      .post<string[]>(`${API}/region-map/unfill`, { groupRoomId, regionKeys })
      .then((r) => r.data),

  clearRegions: (groupRoomId: number) =>
    http
      .delete<void>(`${API}/region-map`, { params: { groupRoomId } })
      .then((r) => r.data),

  /**
   * 이미지 업로드. 앱과 동일한 `/uploads/images` 엔드포인트를 admin 토큰으로 호출한다.
   * (admin 베이스 경로 `/api/admin` 이 아닌 루트 경로이므로 절대 경로로 호출.)
   */
  uploadImage: (file: File, purpose = "exhibit") => {
    const form = new FormData();
    form.append("file", file);
    form.append("purpose", purpose);
    // Content-Type 은 굳이 지정하지 않는다. http 요청 인터셉터가 FormData 요청의
    // 기본 application/json 헤더를 제거해, 브라우저가 boundary 까지 포함한
    // `multipart/form-data` 를 자동으로 설정하도록 위임한다.
    return http
      // 이미지 업로드는 사진 용량/회선에 따라 기본 15s 를 쉽게 넘겨
      // "timeout of 15000ms exceeded" 가 난다. 업로드만 넉넉히 60s 로 둔다.
      .post<UploadImageResponse>("/uploads/images", form, { timeout: 60_000 })
      .then((r) => r.data);
  },

  // ── Report (신고 관리) ──

  searchReports: (params: {
    status?: ReportStatus;
    targetType?: ReportTargetType;
    page?: number;
    size?: number;
  }) =>
    http
      .get<AdminPageResponse<AdminReport>>(`${API}/reports`, { params })
      .then((r) => r.data),

  updateReportStatus: (reportId: number, status: ReportStatus) =>
    http
      .patch<AdminReport>(`${API}/reports/${reportId}/status`, { status })
      .then((r) => r.data),

  // ── Inquiry (고객센터 문의) ──

  searchInquiries: (params: {
    status?: InquiryStatus;
    page?: number;
    size?: number;
  }) =>
    http
      .get<AdminPageResponse<AdminInquiry>>(`${API}/inquiries`, { params })
      .then((r) => r.data),

  answerInquiry: (inquiryId: number, answer: string) =>
    http
      .patch<AdminInquiry>(`${API}/inquiries/${inquiryId}/answer`, { answer })
      .then((r) => r.data),

  // ── Feedback (앱 자체 피드백 폼) ──

  getFeedbackQuestions: () =>
    http
      .get<AdminFeedbackQuestion[]>(`${API}/feedback/questions`)
      .then((r) => r.data),

  saveFeedbackQuestions: (questions: FeedbackQuestionItem[]) =>
    http
      .put<AdminFeedbackQuestion[]>(`${API}/feedback/questions`, { questions })
      .then((r) => r.data),

  searchFeedbackSubmissions: (params: { page?: number; size?: number }) =>
    http
      .get<AdminPageResponse<AdminFeedbackSubmission>>(`${API}/feedback/submissions`, {
        params
      })
      .then((r) => r.data),

  // ── 개인정보 원문 열람 (관리자 비밀번호 재확인) ──

  revealPii: (body: RevealPiiRequest) =>
    http.post<RevealPiiResponse>(`${API}/pii/reveal`, body).then((r) => r.data)
};
