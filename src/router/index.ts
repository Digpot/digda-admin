import { createRouter, createWebHistory, type RouteRecordRaw } from "vue-router";
import { useAuthStore } from "@/stores/auth";

const routes: RouteRecordRaw[] = [
  {
    path: "/login",
    name: "login",
    component: () => import("@/views/LoginView.vue"),
    meta: { public: true }
  },
  {
    // 비로그인 공개 계정/데이터 삭제 요청 페이지 (Google Play 데이터 안전성 URL).
    path: "/deletion-request",
    name: "deletion-request",
    component: () => import("@/views/PublicDeletionRequestView.vue"),
    meta: { public: true }
  },
  {
    path: "/",
    component: () => import("@/components/layout/AdminShell.vue"),
    children: [
      { path: "", redirect: "/dashboard" },
      {
        path: "/dashboard",
        name: "dashboard",
        component: () => import("@/views/DashboardView.vue"),
        meta: { title: "대시보드" }
      },
      {
        path: "/users",
        name: "users",
        component: () => import("@/views/UsersView.vue"),
        meta: { title: "사용자 관리" }
      },
      {
        path: "/group-rooms",
        name: "group-rooms",
        component: () => import("@/views/GroupRoomsView.vue"),
        meta: { title: "그룹방 관리" }
      },
      {
        path: "/diaries",
        name: "diaries",
        component: () => import("@/views/DiariesView.vue"),
        meta: { title: "일기 관리" }
      },
      {
        path: "/reports",
        name: "reports",
        component: () => import("@/views/ReportsView.vue"),
        meta: { title: "신고 관리" }
      },
      {
        path: "/inquiries",
        name: "inquiries",
        component: () => import("@/views/InquiriesView.vue"),
        meta: { title: "고객센터 문의" }
      },
      {
        path: "/schedules",
        name: "schedules",
        component: () => import("@/views/SchedulesView.vue"),
        meta: { title: "일정 관리" }
      },
      {
        path: "/mochi",
        name: "mochi",
        component: () => import("@/views/MochiView.vue"),
        meta: { title: "모찌 관리" }
      },
      {
        path: "/nickname-exhibits",
        name: "nickname-exhibits",
        component: () => import("@/views/NicknameExhibitsView.vue"),
        meta: { title: "별명 전시관 관리" }
      },
      {
        path: "/titles",
        name: "titles",
        component: () => import("@/views/TitlesView.vue"),
        meta: { title: "칭호 부여" }
      },
      {
        path: "/region-map",
        name: "region-map",
        component: () => import("@/views/RegionMapView.vue"),
        meta: { title: "지도 채움" }
      },
      {
        path: "/app-config",
        name: "app-config",
        component: () => import("@/views/AppConfigView.vue"),
        meta: { title: "대공지 · 피드백" }
      },
      {
        path: "/db",
        name: "db",
        component: () => import("@/views/DbView.vue"),
        meta: { title: "DB 테이블 조회" }
      },
      {
        path: "/logs",
        name: "logs",
        component: () => import("@/views/LogsView.vue"),
        meta: { title: "로그 관리" }
      },
      {
        path: "/announcements",
        name: "announcements",
        component: () => import("@/views/AnnouncementsView.vue"),
        meta: { title: "공지 발송" }
      },
      {
        path: "/deletion-requests",
        name: "deletion-requests",
        component: () => import("@/views/DeletionRequestsView.vue"),
        meta: { title: "삭제 요청 관리" }
      }
    ]
  },
  { path: "/:pathMatch(.*)*", redirect: "/dashboard" }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

router.beforeEach((to) => {
  const auth = useAuthStore();
  if (!to.meta.public && !auth.isAuthenticated) {
    return { name: "login", query: { redirect: to.fullPath } };
  }
  if (to.name === "login" && auth.isAuthenticated) {
    return { name: "dashboard" };
  }
  return true;
});

export default router;
