<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { RouterView, useRoute, useRouter } from "vue-router";
import {
  Squares2X2Icon,
  UsersIcon,
  HomeModernIcon,
  BookOpenIcon,
  CalendarDaysIcon,
  TableCellsIcon,
  ClipboardDocumentListIcon,
  MegaphoneIcon,
  Bars3Icon,
  ArrowRightOnRectangleIcon,
  SparklesIcon
} from "@heroicons/vue/24/outline";
import { useAuthStore } from "@/stores/auth";

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();
const collapsed = ref(false);

const menu = [
  { to: "/dashboard", label: "대시보드", icon: Squares2X2Icon },
  { to: "/users", label: "사용자 관리", icon: UsersIcon },
  { to: "/group-rooms", label: "그룹방 관리", icon: HomeModernIcon },
  { to: "/mochi", label: "모찌 관리", icon: SparklesIcon },
  { to: "/diaries", label: "일기 관리", icon: BookOpenIcon },
  { to: "/schedules", label: "일정 관리", icon: CalendarDaysIcon },
  { to: "/db", label: "DB 테이블 조회", icon: TableCellsIcon },
  { to: "/logs", label: "로그 관리", icon: ClipboardDocumentListIcon },
  { to: "/announcements", label: "공지 발송", icon: MegaphoneIcon }
];

const pageTitle = computed(
  () => (route.meta.title as string | undefined) ?? "디그팟 Admin"
);
const profileOpen = ref(false);
const profileRef = ref<HTMLElement | null>(null);

function toggle() {
  collapsed.value = !collapsed.value;
}

function logout() {
  auth.clear();
  router.replace({ name: "login" });
}

function onDocClick(e: MouseEvent) {
  if (!profileOpen.value) return;
  const root = profileRef.value;
  if (root && !root.contains(e.target as Node)) profileOpen.value = false;
}

onMounted(() => {
  document.addEventListener("click", onDocClick);
});

onBeforeUnmount(() => {
  document.removeEventListener("click", onDocClick);
});
</script>

<template>
  <div class="flex min-h-screen bg-ink-50">
    <aside
      class="shrink-0 bg-ink-950 text-ink-100 transition-all duration-200 flex flex-col"
      :class="collapsed ? 'w-[72px]' : 'w-[232px]'"
    >
      <div class="h-16 flex items-center gap-3 px-5 border-b border-white/5">
        <img
          src="/favicon.svg"
          alt="디그팟"
          class="h-8 w-8 rounded-lg shrink-0"
        />
        <span
          v-if="!collapsed"
          class="text-sm font-semibold tracking-wide text-white whitespace-nowrap"
        >
          디그팟 · Admin
        </span>
      </div>
      <nav class="flex-1 py-4 space-y-0.5">
        <RouterLink
          v-for="item in menu"
          :key="item.to"
          :to="item.to"
          class="group flex items-center gap-3 px-4 py-2.5 mx-2 rounded-lg text-sm font-medium transition text-ink-300 hover:bg-white/5 hover:text-white"
          active-class="!bg-white/10 !text-white"
        >
          <component :is="item.icon" class="h-5 w-5 shrink-0" />
          <span v-if="!collapsed" class="whitespace-nowrap">{{ item.label }}</span>
        </RouterLink>
      </nav>
      <div class="px-4 pb-4">
        <button
          type="button"
          class="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-ink-300 hover:bg-white/5 hover:text-white transition"
          @click="logout"
        >
          <ArrowRightOnRectangleIcon class="h-5 w-5 shrink-0" />
          <span v-if="!collapsed">로그아웃</span>
        </button>
      </div>
    </aside>

    <div class="flex-1 flex flex-col min-w-0">
      <header
        class="h-16 bg-white border-b border-ink-100 flex items-center justify-between px-6 sticky top-0 z-10"
      >
        <div class="flex items-center gap-4">
          <button class="btn-ghost -ml-2" @click="toggle" aria-label="사이드바 토글">
            <Bars3Icon class="h-5 w-5" />
          </button>
          <h1 class="text-lg font-semibold text-ink-700">{{ pageTitle }}</h1>
        </div>
        <div class="flex items-center gap-3">
          <div ref="profileRef" class="relative">
            <button
              type="button"
              class="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-ink-50 transition"
              @click="profileOpen = !profileOpen"
            >
              <div
                class="h-8 w-8 rounded-full bg-gradient-to-br from-accent-soft to-accent grid place-items-center text-white text-xs font-semibold"
              >
                {{ (auth.name ?? "A").slice(0, 1).toUpperCase() }}
              </div>
              <span class="text-sm font-medium text-ink-600">
                {{ auth.name ?? "admin" }}
              </span>
            </button>
            <div
              v-if="profileOpen"
              class="absolute right-0 mt-2 w-56 rounded-xl bg-white shadow-card border border-ink-100 py-2 z-20"
            >
              <div class="px-4 py-2 text-xs text-ink-400 border-b border-ink-100">
                {{ auth.email ?? "-" }}
              </div>
              <button
                type="button"
                class="w-full text-left px-4 py-2 text-sm text-ink-600 hover:bg-ink-50"
                @click="logout"
              >
                로그아웃
              </button>
            </div>
          </div>
        </div>
      </header>

      <main class="flex-1 p-6 min-w-0">
        <RouterView />
      </main>
    </div>
  </div>
</template>
