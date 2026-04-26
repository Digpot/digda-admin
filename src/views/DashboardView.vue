<script setup lang="ts">
import { onMounted, ref } from "vue";
import {
  UsersIcon,
  HomeModernIcon,
  BookOpenIcon,
  CalendarDaysIcon
} from "@heroicons/vue/24/outline";
import { adminApi } from "@/api/admin";
import { extractErrorMessage } from "@/api/http";
import type { UserActionLog, DashboardSummary } from "@/types/api";
import StatCard from "@/components/ui/StatCard.vue";
import { formatDate, formatNumber, truncate } from "@/utils/format";

const loading = ref(true);
const errorMessage = ref<string | null>(null);
const summary = ref<DashboardSummary | null>(null);
const recentLogs = ref<UserActionLog[]>([]);

async function load() {
  loading.value = true;
  errorMessage.value = null;
  try {
    const [s, logs] = await Promise.all([
      adminApi.summary(),
      adminApi.searchLogs({ page: 0, size: 8 })
    ]);
    summary.value = s;
    recentLogs.value = logs.content;
  } catch (err) {
    errorMessage.value = extractErrorMessage(err, "대시보드를 불러오지 못했습니다.");
  } finally {
    loading.value = false;
  }
}

onMounted(load);
</script>

<template>
  <div class="space-y-6">
    <p v-if="errorMessage" class="card p-4 text-sm text-rose-600 bg-rose-50 border-rose-100">
      {{ errorMessage }}
    </p>

    <section class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      <StatCard
        label="총 사용자"
        :value="formatNumber(summary?.totalUsers)"
        :caption="summary ? `관리자 ${summary.adminUsers}명 포함` : undefined"
        :icon="UsersIcon"
        tone="indigo"
      />
      <StatCard
        label="활성 그룹방"
        :value="formatNumber(summary?.activeGroupRooms)"
        :caption="
          summary
            ? `전체 ${summary.totalGroupRooms} · 삭제 예약 ${summary.deleteScheduledGroupRooms}`
            : undefined
        "
        :icon="HomeModernIcon"
        tone="emerald"
      />
      <StatCard
        label="총 일기 수"
        :value="formatNumber(summary?.totalDiaries)"
        :caption="summary ? `댓글 ${formatNumber(summary.totalComments)}개` : undefined"
        :icon="BookOpenIcon"
        tone="rose"
      />
      <StatCard
        label="총 일정 수"
        :value="formatNumber(summary?.totalSchedules)"
        :caption="summary ? `할 일 ${formatNumber(summary.totalTodos)}개` : undefined"
        :icon="CalendarDaysIcon"
        tone="amber"
      />
    </section>

    <section class="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div class="card p-5 lg:col-span-2">
        <div class="flex items-center justify-between mb-4">
          <div>
            <h2 class="text-base font-semibold text-ink-700">서비스 개요</h2>
            <p class="text-xs text-ink-400 mt-0.5">
              주요 도메인 수치를 한 번에 확인하세요.
            </p>
          </div>
        </div>
        <dl class="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
          <div class="rounded-lg border border-ink-100 p-3">
            <dt class="text-xs text-ink-400">댓글</dt>
            <dd class="text-lg font-semibold text-ink-700 mt-1">
              {{ formatNumber(summary?.totalComments) }}
            </dd>
          </div>
          <div class="rounded-lg border border-ink-100 p-3">
            <dt class="text-xs text-ink-400">할 일</dt>
            <dd class="text-lg font-semibold text-ink-700 mt-1">
              {{ formatNumber(summary?.totalTodos) }}
            </dd>
          </div>
          <div class="rounded-lg border border-ink-100 p-3">
            <dt class="text-xs text-ink-400">알림</dt>
            <dd class="text-lg font-semibold text-ink-700 mt-1">
              {{ formatNumber(summary?.totalNotifications) }}
            </dd>
          </div>
          <div class="rounded-lg border border-ink-100 p-3">
            <dt class="text-xs text-ink-400">삭제 예약 그룹방</dt>
            <dd class="text-lg font-semibold text-ink-700 mt-1">
              {{ formatNumber(summary?.deleteScheduledGroupRooms) }}
            </dd>
          </div>
          <div class="rounded-lg border border-ink-100 p-3">
            <dt class="text-xs text-ink-400">전체 그룹방</dt>
            <dd class="text-lg font-semibold text-ink-700 mt-1">
              {{ formatNumber(summary?.totalGroupRooms) }}
            </dd>
          </div>
          <div class="rounded-lg border border-ink-100 p-3">
            <dt class="text-xs text-ink-400">관리자 수</dt>
            <dd class="text-lg font-semibold text-ink-700 mt-1">
              {{ formatNumber(summary?.adminUsers) }}
            </dd>
          </div>
        </dl>
      </div>

      <div class="card p-5">
        <h2 class="text-base font-semibold text-ink-700 mb-4">서비스 지표 비율</h2>
        <div v-if="summary" class="space-y-3 text-sm">
          <div>
            <div class="flex justify-between mb-1">
              <span class="text-ink-500">활성 그룹방</span>
              <span class="text-ink-600 font-medium">
                {{
                  summary.totalGroupRooms
                    ? Math.round((summary.activeGroupRooms / summary.totalGroupRooms) * 100)
                    : 0
                }}%
              </span>
            </div>
            <div class="h-2 rounded-full bg-ink-100 overflow-hidden">
              <div
                class="h-full bg-emerald-400"
                :style="{
                  width: `${
                    summary.totalGroupRooms
                      ? (summary.activeGroupRooms / summary.totalGroupRooms) * 100
                      : 0
                  }%`
                }"
              />
            </div>
          </div>
          <div>
            <div class="flex justify-between mb-1">
              <span class="text-ink-500">관리자 비율</span>
              <span class="text-ink-600 font-medium">
                {{
                  summary.totalUsers
                    ? Math.round((summary.adminUsers / summary.totalUsers) * 1000) / 10
                    : 0
                }}%
              </span>
            </div>
            <div class="h-2 rounded-full bg-ink-100 overflow-hidden">
              <div
                class="h-full bg-accent"
                :style="{
                  width: `${
                    summary.totalUsers
                      ? Math.min((summary.adminUsers / summary.totalUsers) * 100, 100)
                      : 0
                  }%`
                }"
              />
            </div>
          </div>
        </div>
        <p v-else class="text-sm text-ink-400">
          {{ loading ? "불러오는 중..." : "데이터가 없습니다." }}
        </p>
      </div>
    </section>

    <section class="card p-5">
      <div class="flex items-center justify-between mb-3">
        <h2 class="text-base font-semibold text-ink-700">최근 활동 로그</h2>
        <RouterLink class="text-sm text-accent hover:underline" to="/logs">더보기</RouterLink>
      </div>
      <div class="overflow-x-auto">
        <table class="table-base">
          <thead>
            <tr>
              <th class="w-44">시간</th>
              <th>액션</th>
              <th>대상</th>
              <th>상세</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="loading">
              <td colspan="4" class="text-center text-ink-400 py-6">불러오는 중...</td>
            </tr>
            <tr v-else-if="!recentLogs.length">
              <td colspan="4" class="text-center text-ink-400 py-6">로그가 없습니다.</td>
            </tr>
            <tr v-for="log in recentLogs" :key="log.logId">
              <td class="tabular-nums">{{ formatDate(log.createdAt) }}</td>
              <td>
                <span
                  class="badge bg-ink-100 text-ink-600"
                >
                  {{ log.action }}
                </span>
              </td>
              <td>
                <span class="text-ink-500">{{ log.targetType ?? "-" }}</span>
                <span v-if="log.targetId" class="text-ink-700"> · {{ log.targetId }}</span>
              </td>
              <td>{{ truncate(log.detail, 60) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </div>
</template>
