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

// 신고가 너무 심한 경우 — 피신고자를 바로 서비스 제한 처리(마이페이지만 이용 가능).
const restricting = ref<number | null>(null);

async function restrictReportedUser(report: AdminReport) {
  if (!report.reportedUserId) return;
  const name = report.reportedUserName ?? report.reportedUserId;
  const ok = window.confirm(
    `'${name}' 님을 서비스 이용 제한 처리할까요?\n` +
      `제한된 사용자는 앱에서 마이페이지만 사용할 수 있습니다.`
  );
  if (!ok) return;
  restricting.value = report.reportId;
  try {
    await adminApi.updateUserRestriction(report.reportedUserId, true);
    errorMessage.value = null;
    window.alert(`'${name}' 님을 서비스 제한 처리했습니다.`);
  } catch (err) {
    errorMessage.value = extractErrorMessage(err, "서비스 제한 처리에 실패했습니다.");
  } finally {
    restricting.value = null;
  }
}

// 신고된 콘텐츠 원본 펼치기 — 어드민이 실제 내용을 보고 판단한다.
const expanded = ref<Set<number>>(new Set());

function toggleContent(reportId: number) {
  const next = new Set(expanded.value);
  if (next.has(reportId)) next.delete(reportId);
  else next.add(reportId);
  expanded.value = next;
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
              <th>피신고자</th>
              <th>대상</th>
              <th>대상 ID</th>
              <th>사유</th>
              <th>상태</th>
              <th class="text-right pr-4 w-56">작업</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="loading">
              <td colspan="8" class="text-center text-ink-400 py-8">
                불러오는 중...
              </td>
            </tr>
            <tr v-else-if="!rows.length">
              <td colspan="8" class="text-center text-ink-400 py-8">
                신고가 없습니다.
              </td>
            </tr>
            <template v-for="r in rows" :key="r.reportId">
            <tr>
              <td class="tabular-nums text-ink-500">
                {{ formatDate(r.createdAt) }}
              </td>
              <td>
                <div class="text-ink-700 font-medium">{{ r.reporterName }}</div>
                <div class="tabular-nums text-ink-400 text-xs">
                  {{ r.reporterId }}
                </div>
              </td>
              <td>
                <template v-if="r.reportedUserId">
                  <div class="text-ink-700 font-medium">
                    {{ r.reportedUserName ?? "(이름 없음)" }}
                  </div>
                  <div class="tabular-nums text-ink-400 text-xs">
                    {{ r.reportedUserId }}
                  </div>
                </template>
                <span v-else class="text-ink-300 text-xs">-</span>
              </td>
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
                  class="btn-outline px-2.5 py-1.5 text-xs"
                  @click="toggleContent(r.reportId)"
                >
                  {{ expanded.has(r.reportId) ? "원본 닫기" : "원본 보기" }}
                </button>
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
                <button
                  v-if="r.reportedUserId"
                  class="btn-outline px-2.5 py-1.5 text-xs !text-rose-600 hover:!bg-rose-50"
                  :disabled="restricting === r.reportId"
                  title="피신고자를 마이페이지만 이용 가능하도록 제한"
                  @click="restrictReportedUser(r)"
                >
                  이용 제한
                </button>
              </td>
            </tr>
            <tr v-if="expanded.has(r.reportId)" class="bg-ink-50/60">
              <td colspan="9" class="px-4 py-3">
                <div
                  v-if="r.targetContent && r.targetContent.available"
                  class="space-y-2"
                >
                  <p
                    v-if="r.targetContent.title"
                    class="font-semibold text-ink-800"
                  >
                    {{ r.targetContent.title }}
                  </p>
                  <p
                    v-if="r.targetContent.text"
                    class="whitespace-pre-wrap text-ink-600 text-sm leading-relaxed"
                  >
                    {{ r.targetContent.text }}
                  </p>
                  <div
                    v-if="r.targetContent.images.length"
                    class="flex flex-wrap gap-2 pt-1"
                  >
                    <a
                      v-for="(img, i) in r.targetContent.images"
                      :key="i"
                      :href="img"
                      target="_blank"
                      rel="noopener"
                    >
                      <img
                        :src="img"
                        class="h-24 w-24 rounded-lg object-cover border border-ink-100"
                        alt="신고된 사진"
                      />
                    </a>
                  </div>
                  <p class="text-xs text-ink-400 pt-1">
                    작성자: {{ r.targetContent.authorName ?? "-" }}
                    <span v-if="r.targetContent.createdAt">
                      · {{ formatDate(r.targetContent.createdAt) }}
                    </span>
                  </p>
                </div>
                <p v-else class="text-sm text-ink-400">
                  원본 콘텐츠가 없습니다(삭제되었거나 사용자 신고).
                </p>
              </td>
            </tr>
            </template>
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
