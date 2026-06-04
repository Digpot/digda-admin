<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
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
  SparklesIcon,
  PhotoIcon
} from "@heroicons/vue/24/outline";
import { useAuthStore } from "@/stores/auth";

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();

// 데스크톱: 사이드바 접기(아이콘만). 모바일: 오프캔버스 드로어.
const collapsed = ref(false);
const mobileOpen = ref(false);
const isDesktop = ref(true);

const menu = [
  { to: "/dashboard", label: "대시보드", icon: Squares2X2Icon },
  { to: "/users", label: "사용자 관리", icon: UsersIcon },
  { to: "/group-rooms", label: "그룹방 관리", icon: HomeModernIcon },
  { to: "/mochi", label: "모찌 관리", icon: SparklesIcon },
  { to: "/nickname-exhibits", label: "별명 전시관", icon: PhotoIcon },
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

// 데스크톱에선 라벨을 접을 수 있고, 모바일 드로어에선 항상 라벨 노출.
const showLabels = computed(() => !isDesktop.value || !collapsed.value);

function toggle() {
  if (isDesktop.value) collapsed.value = !collapsed.value;
  else mobileOpen.value = !mobileOpen.value;
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

let mq: MediaQueryList | null = null;
function applyMq(e: MediaQueryList | MediaQueryListEvent) {
  isDesktop.value = e.matches;
  if (e.matches) mobileOpen.value = false; // 데스크톱 전환 시 드로어 닫기
}

// 페이지 이동 시 모바일 드로어 자동 닫기
watch(
  () => route.fullPath,
  () => {
    mobileOpen.value = false;
  }
);

onMounted(() => {
  mq = window.matchMedia("(min-width: 1024px)");
  applyMq(mq);
  mq.addEventListener("change", applyMq);
  document.addEventListener("click", onDocClick);
});

onBeforeUnmount(() => {
  mq?.removeEventListener("change", applyMq);
  document.removeEventListener("click", onDocClick);
});
</script>

<template>
  <div class="flex min-h-screen bg-ink-50">
    <!-- 모바일 드로어 백드롭 -->
    <div
      v-if="mobileOpen"
      class="fixed inset-0 z-30 bg-black/40 lg:hidden"
      @click="mobileOpen = false"
    />

    <!-- 사이드바: 데스크톱 정적 / 모바일 오프캔버스 -->
    <aside
      class="fixed lg:static inset-y-0 left-0 z-40 w-[264px] shrink-0 bg-ink-950 text-ink-100 flex flex-col transition-transform duration-200 lg:transition-[width]"
      :class="[
        collapsed ? 'lg:w-[72px]' : 'lg:w-[232px]',
        mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      ]"
    >
      <div class="h-16 flex items-center gap-3 px-5 border-b border-white/5">
        <img src="/favicon.svg" alt="디그팟" class="h-8 w-8 rounded-lg shrink-0" />
        <span
          v-if="showLabels"
          class="text-sm font-semibold tracking-wide text-white whitespace-nowrap"
        >
          디그팟 · Admin
        </span>
      </div>
      <nav class="flex-1 py-4 space-y-0.5 overflow-y-auto">
        <RouterLink
          v-for="item in menu"
          :key="item.to"
          :to="item.to"
          class="group flex items-center gap-3 px-4 py-2.5 mx-2 rounded-lg text-sm font-medium transition text-ink-300 hover:bg-white/5 hover:text-white"
          active-class="!bg-white/10 !text-white"
          @click="mobileOpen = false"
        >
          <component :is="item.icon" class="h-5 w-5 shrink-0" />
          <span v-if="showLabels" class="whitespace-nowrap">{{ item.label }}</span>
        </RouterLink>
      </nav>
      <div class="px-4 pb-4">
        <button
          type="button"
          class="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-ink-300 hover:bg-white/5 hover:text-white transition"
          @click="logout"
        >
          <ArrowRightOnRectangleIcon class="h-5 w-5 shrink-0" />
          <span v-if="showLabels">로그아웃</span>
        </button>
      </div>
    </aside>

    <div class="flex-1 flex flex-col min-w-0">
      <header
        class="h-16 bg-white border-b border-ink-100 flex items-center justify-between px-4 lg:px-6 sticky top-0 z-10"
      >
        <div class="flex items-center gap-2 lg:gap-4 min-w-0">
          <button
            class="btn-ghost -ml-2 shrink-0"
            @click="toggle"
            aria-label="메뉴"
          >
            <Bars3Icon class="h-5 w-5" />
          </button>
          <h1 class="text-base lg:text-lg font-semibold text-ink-700 truncate">
            {{ pageTitle }}
          </h1>
        </div>
        <div class="flex items-center gap-3">
          <div ref="profileRef" class="relative">
            <button
              type="button"
              class="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-ink-50 transition"
              @click="profileOpen = !profileOpen"
            >
              <div
                class="h-8 w-8 rounded-full bg-gradient-to-br from-accent-soft to-accent grid place-items-center text-white text-xs font-semibold shrink-0"
              >
                {{ (auth.name ?? "A").slice(0, 1).toUpperCase() }}
              </div>
              <span class="hidden sm:inline text-sm font-medium text-ink-600">
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

      <main class="flex-1 p-4 lg:p-6 min-w-0">
        <RouterView />
      </main>
    </div>
  </div>
</template>
