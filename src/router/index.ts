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
