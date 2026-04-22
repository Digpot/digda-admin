export interface AdminLoginRequest {
  email: string;
  password: string;
}

export interface AdminLoginResponse {
  adminId: string;
  email: string;
  name: string;
  accessToken: string;
  refreshToken: string;
}

export interface AdminPageResponse<T> {
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  content: T[];
}

export interface DashboardSummary {
  totalUsers: number;
  adminUsers: number;
  totalGroupRooms: number;
  activeGroupRooms: number;
  deleteScheduledGroupRooms: number;
  totalDiaries: number;
  totalSchedules: number;
  totalComments: number;
  totalTodos: number;
  totalNotifications: number;
}

export type Role = "USER" | "ADMIN";

export interface AdminUser {
  userId: string;
  email: string | null;
  name: string;
  statusMessage: string | null;
  profileImage: string | null;
  socialProvider: string;
  role: Role;
  createdAt: string;
  updatedAt: string;
}

export interface AdminGroupRoom {
  groupRoomId: number;
  name: string;
  thumbnailImage: string | null;
  maxMembers: number;
  ownerId: string;
  ownerName: string;
  lastActivityAt: string;
  deleteScheduledAt: string | null;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export type GroupRoomAction = "RECOVER" | "SCHEDULE_DELETE" | "HARD_DELETE";

export interface AdminDiary {
  diaryId: number;
  groupRoomId: number;
  groupRoomName: string;
  createdBy: string;
  authorName: string;
  title: string;
  content: string;
  date: string;
  weather: number;
  mood: number;
  imageUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AdminSchedule {
  scheduleId: number;
  groupRoomId: number;
  groupRoomName: string;
  createdBy: string;
  authorName: string;
  title: string;
  color: string;
  startDate: string;
  endDate: string;
  startTime: string | null;
  endTime: string | null;
  allDay: boolean;
  participantCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface AdminTableInfo {
  tableName: string;
  tableComment: string | null;
  approxRowCount: number | null;
}

export interface AdminColumnInfo {
  columnName: string;
  dataType: string;
  columnType: string;
  nullable: boolean;
  defaultValue: string | null;
  columnKey: string | null;
  comment: string | null;
  ordinalPosition: number;
}

export interface AdminTableRows {
  tableName: string;
  columns: string[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  rows: Array<Record<string, unknown>>;
}

export type AdminActionType =
  | "LOGIN"
  | "UPDATE_USER_ROLE"
  | "CHANGE_GROUP_ROOM_STATUS"
  | "DELETE_DIARY"
  | "VIEW_DB_TABLE"
  | "OTHER";

export interface AdminActionLog {
  logId: number;
  actorId: string | null;
  action: AdminActionType;
  targetType: string | null;
  targetId: string | null;
  detail: string | null;
  createdAt: string;
}
