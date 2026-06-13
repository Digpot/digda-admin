<script setup lang="ts">
import { onMounted, ref } from "vue";
import { adminApi } from "@/api/admin";
import { extractErrorMessage } from "@/api/http";
import type {
  AdminReport,
  ReportReason,
  ReportStatus,
  ReportTargetType
} from "@/types/api";
import Pagination from "@/components/ui/Pagination.vue";
import { formatDate } from "@/utils/format";

const statusFilter = ref<ReportStatus | "">("");
const typeFilter = ref<ReportTargetType | "">("");
const page = ref(0);
const size = ref(20);
const totalElements = ref(0);
const totalPages = ref(0);
const rows = ref<AdminReport[]>([]);
const loading = ref(false);
const errorMessage = ref<string | null>(null);
const working = ref<number | null>(null);

const STATUS_LABEL: Record<ReportStatus, string> = {
  PENDING: "접수됨",
  RESOLVED: "조치완료",
  DISMISSED: "반려"
};
const TYPE_LABEL: Record<ReportTargetType, string> = {
  DIARY: "일기",
  COMMENT: "댓글",
  SCHEDULE: "일정",
  USER: "사용자"
};
const REASON_LABEL: Record<ReportReason, string> = {
  SPAM: "스팸·광고",
  ABUSE: "욕설·비방",
  SEXUAL: "음란물",
  VIOLENCE: "폭력·혐오",
  PRIVACY: "개인정보",
  ETC: "기타"
};

function statusBadgeClass(status: ReportStatus): string {
  switch (status) {
    case "PENDING":
      return "bg-amber-100 text-amber-700";
    case "RESOLVED":
      return "bg-emerald-100 text-emerald-700";
    case "DISMISSED":
      return "bg-ink-100 text-ink-500";
  }
}

async function load() {
  loading.value = true;
  errorMessage.value = null;
  try {
    const res = await adminApi.searchReports({
      status: statusFilter.value || undefined,
      targetType: typeFilter.value || undefined,
      page: page.value,
      size: size.value
    });
    rows.value = res.content;
    totalElements.value = res.totalElements;
    totalPages.value = res.totalPages;
  } catch (err) {
    errorMessage.value = extractErrorMessage(err);
  } finally {
    loading.value = false;
  }
}

async function updateStatus(report: AdminReport, status: ReportStatus) {
  working.value = report.reportId;
  try {
    const updated = await adminApi.updateReportStatus(report.reportId, status);
    const idx = rows.value.findIndex((r) => r.reportId === updated.reportId);
    if (idx >= 0) rows.value[idx] = updated;
  } catch (err) {
    errorMessage.value = extractErrorMessage(err, "신고 처리에 실패했습니다.");
  } finally {
    working.value = null;
  }
}

function onSearch() {
  page.value = 0;
  load();
}

onMounted(load);
</script>

<template>
  <div class="space-y-4">
    <div class="card p-4">
      <form
        class="grid grid-cols-1 md:grid-cols-4 gap-3"
        @submit.prevent="onSearch"
      >
        <div>
          <label class="label">상태</label>
          <select v-model="statusFilter" class="input">
            <option value="">전체</option>
            <option value="PENDING">접수됨</option>
            <option value="RESOLVED">조치완료</option>
            <option value="DISMISSED">반려</option>
          </select>
        </div>
        <div>
          <label class="label">대상 종류</label>
          <select v-model="typeFilter" class="input">
            <option value="">전체</option>
            <option value="DIARY">일기</option>
            <option value="COMMENT">댓글</option>
            <option value="SCHEDULE">일정</option>
            <option value="USER">사용자</option>
          </select>
        </div>
        <div class="flex items-end md:col-span-2">
          <button type="submit" class="btn-primary w-full justify-center">
            검색
          </button>
        </div>
      </form>
    </div>

    <p v-if="errorMessage" class="text-sm text-rose-600">{{ errorMessage }}</p>

    <div class="card overflow-hidden">
      <div class="overflow-x-auto">
        <table class="table-base">
          <thead>
            <tr>
              <th>접수</th>
              <th>신고자</th>
              <th>대상</th>
              <th>대상 ID</th>
              <th>사유</th>
              <th>상태</th>
              <th class="text-right pr-4 w-44">작업</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="loading">
              <td colspan="7" class="text-center text-ink-400 py-8">
                불러오는 중...
              </td>
            </tr>
            <tr v-else-if="!rows.length">
              <td colspan="7" class="text-center text-ink-400 py-8">
                신고가 없습니다.
              </td>
            </tr>
            <tr v-for="r in rows" :key="r.reportId">
              <td class="tabular-nums text-ink-500">
                {{ formatDate(r.createdAt) }}
              </td>
              <td class="text-ink-600">{{ r.reporterName }}</td>
              <td class="text-ink-500">{{ TYPE_LABEL[r.targetType] }}</td>
              <td class="tabular-nums text-ink-400 text-xs">
                {{ r.targetId }}
                <span v-if="r.groupRoomId" class="text-ink-300">
                  (그룹 {{ r.groupRoomId }})
                </span>
              </td>
              <td class="text-ink-600">
                {{ REASON_LABEL[r.reason] }}
                <span
                  v-if="r.detail"
                  class="block text-xs text-ink-400"
                  :title="r.detail"
                >
                  {{ r.detail }}
                </span>
              </td>
              <td>
                <span
                  class="inline-block rounded-full px-2 py-0.5 text-xs font-semibold"
                  :class="statusBadgeClass(r.status)"
                >
                  {{ STATUS_LABEL[r.status] }}
                </span>
              </td>
              <td class="text-right pr-4 space-x-1.5">
                <button
                  v-if="r.status !== 'RESOLVED'"
                  class="btn-outline px-2.5 py-1.5 text-xs !text-emerald-600 hover:!bg-emerald-50"
                  :disabled="working === r.reportId"
                  @click="updateStatus(r, 'RESOLVED')"
                >
                  조치완료
                </button>
                <button
                  v-if="r.status !== 'DISMISSED'"
                  class="btn-outline px-2.5 py-1.5 text-xs"
                  :disabled="working === r.reportId"
                  @click="updateStatus(r, 'DISMISSED')"
                >
                  반려
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="px-4">
        <Pagination
          :page="page"
          :total-pages="totalPages"
          :total-elements="totalElements"
          @change="
            (p) => {
              page = p;
              load();
            }
          "
        />
      </div>
    </div>
  </div>
</template>
