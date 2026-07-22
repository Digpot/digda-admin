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
  profileImage: string | null;
  socialProvider: string;
  role: Role;
  restricted: boolean;
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

export interface AdminWriteResult {
  affected: number;
}

export interface AdminUpsertRowRequest {
  values: Record<string, string | null>;
}

export type UserActionType =
  | "LOGIN"
  | "SIGNUP"
  | "LOGOUT"
  | "CREATE_DIARY"
  | "DELETE_DIARY"
  | "CREATE_SCHEDULE"
  | "DELETE_SCHEDULE"
  | "CREATE_COMMENT"
  | "CREATE_GROUP_ROOM"
  | "JOIN_GROUP_ROOM"
  | "LEAVE_GROUP_ROOM"
  | "TRANSFER_OWNER"
  | "CREATE_TODO"
  | "OTHER";

export interface UserActionLog {
  logId: number;
  actorId: string | null;
  action: UserActionType;
  targetType: string | null;
  targetId: string | null;
  detail: string | null;
  createdAt: string;
}

export type AnnouncementTarget = "ALL" | "USER_IDS";

export interface SendAnnouncementRequest {
  title: string;
  body: string;
  target: AnnouncementTarget;
  userIds?: string[];
}

export interface SendAnnouncementResponse {
  recipientCount: number;
}

export interface AdminAnnouncement {
  announcementId: number;
  title: string;
  body: string;
  targetType: AnnouncementTarget;
  recipientCount: number;
  createdAt: string;
}

// ── Character (Mochi) admin ──

export type CharacterStage =
  | "EGG"
  | "SPROUT"
  | "BLOOM"
  | "BLOSSOM"
  | "GLOW"
  | "MASTER";

export interface AdminCharacter {
  characterId: number;
  groupRoomId: number;
  groupRoomName: string;
  ownerName: string;
  groupRoomDeletedAt: string | null;
  stage: CharacterStage;
  stageDisplayName: string;
  level: number;
  exp: number;
  expForNextLevel: number;
  coin: number;
  maxLevelReached: boolean;
  dikoUnlocked: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AdminUpdateCharacterRequest {
  level?: number;
  exp?: number;
  coin?: number;
  dikoUnlocked?: boolean;
}

// ── Nickname Exhibit (역대 별명 전시관) ──

export interface AdminNicknameExhibit {
  id: number;
  nickname: string;
  imageUrl: string | null;
  history: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateNicknameExhibitRequest {
  nickname: string;
  imageUrl?: string | null;
  history: string;
  sortOrder?: number;
}

export interface UpdateNicknameExhibitRequest {
  nickname?: string;
  imageUrl?: string | null;
  history?: string;
  sortOrder?: number;
}

export interface AdminExhibitAccess {
  userId: string;
  name: string;
  email: string | null;
  profileImage: string | null;
  grantedAt: string;
}

export interface UploadImageResponse {
  id: number;
  url: string;
  width: number;
  height: number;
}

// ── Title (칭호) ──

export interface TitleCatalogItem {
  code: string;
  name: string;
  description: string;
  category: string;
  accentColor: string;
  iconKey: string;
  conditionType: string;
  conditionValue: string | null;
  sortOrder: number;
}

export interface AdminUserTitle {
  code: string;
  name: string;
  category: string;
  accentColor: string;
  groupRoomName: string | null;
  earnedAt: string;
}

// ── App Config (대공지 · 피드백 · 점검 모드) ──

export interface AppConfig {
  noticeEnabled: boolean;
  noticeMessage: string;
  feedbackEnabled: boolean;
  feedbackUrl: string;
  /** 서버 점검(업데이트) 모드 — 켜면 앱이 로그인 여부와 무관하게 전 기능 차단 */
  maintenanceEnabled: boolean;
  /** 점검 안내 문구(빈 값 = 앱 기본 문구) */
  maintenanceMessage: string;
}

// ── Report (신고 관리) ──
export type ReportStatus = "PENDING" | "RESOLVED" | "DISMISSED";
export type ReportTargetType = "DIARY" | "COMMENT" | "SCHEDULE" | "USER";
export type ReportReason =
  | "SPAM"
  | "ABUSE"
  | "SEXUAL"
  | "VIOLENCE"
  | "PRIVACY"
  | "ETC";

/** 신고된 콘텐츠 원본 스냅샷 — 검토용. 종류별로 채워지는 필드가 다르다. */
export interface AdminReportTargetContent {
  available: boolean;
  title: string | null;
  text: string | null;
  images: string[];
  authorName: string | null;
  createdAt: string | null;
}

export interface AdminReport {
  reportId: number;
  reporterId: string;
  reporterName: string;
  targetType: ReportTargetType;
  targetId: string;
  reportedUserId: string | null;
  reportedUserName: string | null;
  reportedUserRestricted: boolean | null;
  groupRoomId: number | null;
  reason: ReportReason;
  detail: string | null;
  status: ReportStatus;
  createdAt: string;
  reviewedAt: string | null;
  targetContent: AdminReportTargetContent;
}

export type InquiryStatus = "PENDING" | "ANSWERED";

export interface AdminInquiry {
  inquiryId: number;
  userId: string;
  userName: string;
  content: string;
  status: InquiryStatus;
  answer: string | null;
  createdAt: string;
  answeredAt: string | null;
}

// ── Deletion request (계정/데이터 삭제 요청) ──

export type DeletionRequestType = "ACCOUNT" | "DATA";
export type DeletionRequestStatus = "PENDING" | "DONE";

export interface AdminDeletionRequest {
  id: number;
  type: DeletionRequestType;
  email: string;
  groupRoomName: string | null;
  content: string | null;
  status: DeletionRequestStatus;
  createdAt: string;
  handledAt: string | null;
}

