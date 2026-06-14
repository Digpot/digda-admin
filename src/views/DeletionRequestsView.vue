<script setup lang="ts">
import { onMounted, ref } from "vue";
import { adminApi } from "@/api/admin";
import { extractErrorMessage } from "@/api/http";
import type { AdminDeletionRequest, DeletionRequestStatus } from "@/types/api";
import Pagination from "@/components/ui/Pagination.vue";
import { formatDate } from "@/utils/format";

type StatusFilter = "ALL" | DeletionRequestStatus;
const statusFilter = ref<StatusFilter>("ALL");

const rows = ref<AdminDeletionRequest[]>([]);
const page = ref(0);
const size = ref(20);
const totalPages = ref(0);
const totalElements = ref(0);
const loading = ref(false);
const error = ref<string | null>(null);
const markingId = ref<number | null>(null);

async function load() {
  loading.value = true;
  error.value = null;
  try {
    const res = await adminApi.searchDeletionRequests({
      status: statusFilter.value === "ALL" ? undefined : statusFilter.value,
      page: page.value,
      size: size.value
    });
    rows.value = res.content;
    totalPages.value = res.totalPages;
    totalElements.value = res.totalElements;
  } catch (err) {
    error.value = extractErrorMessage(err);
  } finally {
    loading.value = false;
  }
}

function applyFilter(next: StatusFilter) {
  statusFilter.value = next;
  page.value = 0;
  load();
}

async function markDone(row: AdminDeletionRequest) {
  if (row.status === "DONE") return;
  if (!confirm("이 요청을 처리 완료로 표시할까요?")) return;
  markingId.value = row.id;
  try {
    const updated = await adminApi.markDeletionRequestDone(row.id);
    const idx = rows.value.findIndex((r) => r.id === row.id);
    if (idx !== -1) rows.value[idx] = updated;
  } catch (err) {
    error.value = extractErrorMessage(err);
  } finally {
    markingId.value = null;
  }
}

onMounted(load);
</script>

<template>
  <div class="space-y-4">
    <div class="flex gap-2">
      <button
        v-for="f in (['ALL', 'PENDING', 'DONE'] as StatusFilter[])"
        :key="f"
        type="button"
        class="px-3 py-1.5 text-sm font-medium rounded-lg border"
        :class="
          statusFilter === f
            ? 'border-accent bg-accent/10 text-accent'
            : 'border-ink-200 text-ink-500 hover:bg-ink-100'
        "
        @click="applyFilter(f)"
      >
        {{ f === "ALL" ? "전체" : f === "PENDING" ? "접수" : "처리 완료" }}
      </button>
    </div>

    <p v-if="error" class="text-sm text-rose-600">{{ error }}</p>

    <div class="card overflow-hidden">
      <div class="overflow-x-auto">
        <table class="table-base">
          <thead>
            <tr>
              <th class="w-40">접수 시각</th>
              <th class="w-20">종류</th>
              <th>이메일</th>
              <th>그룹방 / 데이터</th>
              <th class="w-24">상태</th>
              <th class="w-28 text-right">처리</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="loading">
              <td colspan="6" class="text-center text-ink-400 py-8">불러오는 중...</td>
            </tr>
            <tr v-else-if="!rows.length">
              <td colspan="6" class="text-center text-ink-400 py-8">데이터가 없습니다.</td>
            </tr>
            <tr v-for="r in rows" :key="r.id" class="align-top">
              <td class="tabular-nums text-ink-500">{{ formatDate(r.createdAt) }}</td>
              <td>
                <span
                  class="badge text-[10px]"
                  :class="r.type === 'ACCOUNT' ? 'bg-rose-100 text-rose-600' : 'bg-sky-100 text-sky-600'"
                >
                  {{ r.type === "ACCOUNT" ? "계정" : "데이터" }}
                </span>
              </td>
              <td class="text-ink-700">{{ r.email }}</td>
              <td class="text-ink-500">
                <div v-if="r.type === 'DATA'">
                  <div class="font-medium text-ink-700">{{ r.groupRoomName }}</div>
                  <div class="whitespace-pre-wrap">{{ r.content }}</div>
                </div>
                <span v-else class="text-ink-300">-</span>
              </td>
              <td>
                <span
                  class="badge text-[10px]"
                  :class="r.status === 'DONE' ? 'bg-emerald-100 text-emerald-600' : 'bg-ink-100 text-ink-600'"
                >
                  {{ r.status === "DONE" ? "처리 완료" : "접수" }}
                </span>
              </td>
              <td class="text-right">
                <button
                  v-if="r.status === 'PENDING'"
                  type="button"
                  class="btn-primary text-xs"
                  :disabled="markingId === r.id"
                  @click="markDone(r)"
                >
                  {{ markingId === r.id ? "처리 중..." : "처리 완료" }}
                </button>
                <span v-else class="text-xs text-ink-400">{{ formatDate(r.handledAt) }}</span>
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
