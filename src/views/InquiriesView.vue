<script setup lang="ts">
import { onMounted, ref } from "vue";
import { adminApi } from "@/api/admin";
import { extractErrorMessage } from "@/api/http";
import type { AdminInquiry, InquiryStatus } from "@/types/api";
import Pagination from "@/components/ui/Pagination.vue";
import { formatDate } from "@/utils/format";

const statusFilter = ref<InquiryStatus | "">("");
const page = ref(0);
const size = ref(20);
const totalElements = ref(0);
const totalPages = ref(0);
const rows = ref<AdminInquiry[]>([]);
const loading = ref(false);
const errorMessage = ref<string | null>(null);
const working = ref<number | null>(null);

const STATUS_LABEL: Record<InquiryStatus, string> = {
  PENDING: "접수됨",
  ANSWERED: "답변완료"
};

function statusBadgeClass(status: InquiryStatus): string {
  return status === "ANSWERED"
    ? "bg-emerald-100 text-emerald-700"
    : "bg-amber-100 text-amber-700";
}

async function load() {
  loading.value = true;
  errorMessage.value = null;
  try {
    const res = await adminApi.searchInquiries({
      status: statusFilter.value || undefined,
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

async function markAnswered(inquiry: AdminInquiry) {
  working.value = inquiry.inquiryId;
  try {
    const updated = await adminApi.markInquiryAnswered(inquiry.inquiryId);
    const idx = rows.value.findIndex((i) => i.inquiryId === updated.inquiryId);
    if (idx >= 0) rows.value[idx] = updated;
  } catch (err) {
    errorMessage.value = extractErrorMessage(err, "처리에 실패했습니다.");
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
            <option value="ANSWERED">답변완료</option>
          </select>
        </div>
        <div class="flex items-end md:col-span-3">
          <button type="submit" class="btn-primary justify-center px-6">
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
              <th>작성자</th>
              <th>내용</th>
              <th>상태</th>
              <th class="text-right pr-4 w-32">작업</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="loading">
              <td colspan="5" class="text-center text-ink-400 py-8">
                불러오는 중...
              </td>
            </tr>
            <tr v-else-if="!rows.length">
              <td colspan="5" class="text-center text-ink-400 py-8">
                문의가 없습니다.
              </td>
            </tr>
            <tr v-for="q in rows" :key="q.inquiryId">
              <td class="tabular-nums text-ink-500 align-top">
                {{ formatDate(q.createdAt) }}
              </td>
              <td class="align-top">
                <div class="text-ink-700 font-medium">{{ q.userName }}</div>
                <div class="tabular-nums text-ink-400 text-xs">
                  {{ q.userId }}
                </div>
              </td>
              <td class="text-ink-600 align-top max-w-md">
                <p class="whitespace-pre-wrap leading-relaxed">{{ q.content }}</p>
              </td>
              <td class="align-top">
                <span
                  class="inline-block rounded-full px-2 py-0.5 text-xs font-semibold"
                  :class="statusBadgeClass(q.status)"
                >
                  {{ STATUS_LABEL[q.status] }}
                </span>
              </td>
              <td class="text-right pr-4 align-top">
                <button
                  v-if="q.status !== 'ANSWERED'"
                  class="btn-outline px-2.5 py-1.5 text-xs !text-emerald-600 hover:!bg-emerald-50"
                  :disabled="working === q.inquiryId"
                  @click="markAnswered(q)"
                >
                  답변완료
                </button>
                <span v-else class="text-ink-300 text-xs">완료</span>
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
