<script setup lang="ts">
import { onMounted, ref } from "vue";
import { adminApi } from "@/api/admin";
import { extractErrorMessage } from "@/api/http";
import type { AdminInquiry, InquiryStatus } from "@/types/api";
import Pagination from "@/components/ui/Pagination.vue";
import Modal from "@/components/ui/Modal.vue";
import { formatDate } from "@/utils/format";
import PiiText from "@/components/pii/PiiText.vue";
import { userPii } from "@/composables/usePiiReveal";
import IdText from "@/components/pii/IdText.vue";

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

// 문의 내용/답변은 팝업에서 보고, 답변도 팝업에서 작성한다.
const detailTarget = ref<AdminInquiry | null>(null);
const answerText = ref("");

function openDetail(inquiry: AdminInquiry) {
  detailTarget.value = inquiry;
  answerText.value = inquiry.answer ?? "";
}

async function submitAnswer() {
  if (!detailTarget.value) return;
  const text = answerText.value.trim();
  if (!text) {
    errorMessage.value = "답변 내용을 입력해주세요.";
    return;
  }
  working.value = detailTarget.value.inquiryId;
  try {
    const updated = await adminApi.answerInquiry(
      detailTarget.value.inquiryId,
      text
    );
    const idx = rows.value.findIndex((i) => i.inquiryId === updated.inquiryId);
    if (idx >= 0) rows.value[idx] = updated;
    detailTarget.value = updated;
  } catch (err) {
    errorMessage.value = extractErrorMessage(err, "답변 등록에 실패했습니다.");
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
                <div class="text-ink-700 font-medium"><PiiText :value="q.userName" :target="userPii(q.userId)" /></div>
                <div class="tabular-nums text-ink-400 text-xs">
                  <IdText :id="q.userId" />
                </div>
              </td>
              <td class="align-top">
                <button
                  class="btn-outline px-2.5 py-1.5 text-xs"
                  @click="openDetail(q)"
                >
                  전체 보기
                </button>
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
                  class="btn-outline px-2.5 py-1.5 text-xs"
                  :class="
                    q.status !== 'ANSWERED'
                      ? '!text-emerald-600 hover:!bg-emerald-50'
                      : ''
                  "
                  @click="openDetail(q)"
                >
                  {{ q.status === "ANSWERED" ? "답변 보기" : "답변하기" }}
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

    <Modal
      :open="!!detailTarget"
      title="문의 상세"
      @close="detailTarget = null"
    >
      <div v-if="detailTarget" class="space-y-4 text-sm">
        <div class="flex items-center justify-between gap-2">
          <div class="min-w-0">
            <p class="text-ink-700 font-medium truncate">
              <PiiText :value="detailTarget.userName" :target="userPii(detailTarget.userId)" />
            </p>
            <p class="tabular-nums text-ink-400 text-xs truncate">
              <IdText :id="detailTarget.userId" />
            </p>
          </div>
          <span
            class="shrink-0 inline-block rounded-full px-2 py-0.5 text-xs font-semibold"
            :class="statusBadgeClass(detailTarget.status)"
          >
            {{ STATUS_LABEL[detailTarget.status] }}
          </span>
        </div>
        <div class="text-xs text-ink-400">
          접수 {{ formatDate(detailTarget.createdAt) }}
          <span v-if="detailTarget.answeredAt">
            · 답변 {{ formatDate(detailTarget.answeredAt) }}
          </span>
        </div>
        <div>
          <label class="label">문의 내용</label>
          <div
            class="max-h-[30vh] overflow-y-auto whitespace-pre-wrap break-words rounded-lg bg-ink-50 p-3 leading-relaxed text-ink-700"
          >
            {{ detailTarget.content }}
          </div>
        </div>
        <div>
          <label class="label">
            답변
            <span
              v-if="detailTarget.status === 'ANSWERED'"
              class="text-emerald-600"
            >
              (등록됨 — 수정 후 다시 등록할 수 있어요)
            </span>
          </label>
          <textarea
            v-model="answerText"
            rows="5"
            maxlength="2000"
            class="input resize-none"
            placeholder="사용자에게 전달될 답변을 입력하세요. 앱 고객센터에 표시됩니다."
          />
        </div>
        <div class="flex justify-end gap-2">
          <button class="btn-outline" @click="detailTarget = null">닫기</button>
          <button
            class="btn-primary"
            :disabled="working === detailTarget.inquiryId"
            @click="submitAnswer"
          >
            {{
              working === detailTarget.inquiryId
                ? "등록 중..."
                : detailTarget.status === "ANSWERED"
                  ? "답변 수정"
                  : "답변 등록"
            }}
          </button>
        </div>
      </div>
    </Modal>
  </div>
</template>
