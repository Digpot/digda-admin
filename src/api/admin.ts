import { http } from "./http";
import type {
  AdminColumnInfo,
  AdminDiary,
  AdminGroupRoom,
  AdminLoginRequest,
  AdminLoginResponse,
  AdminPageResponse,
  AdminSchedule,
  AdminTableInfo,
  AdminTableRows,
  AdminUser,
  DashboardSummary,
  GroupRoomAction,
  Role,
  SendAnnouncementRequest,
  SendAnnouncementResponse,
  UserActionLog,
  UserActionType
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
      .then((r) => r.data)
};
