<script setup lang="ts">
import { onMounted, ref } from "vue";
import { adminApi } from "@/api/admin";
import { extractErrorMessage } from "@/api/http";
import type { AdminActionLog, AdminActionType } from "@/types/api";
import Pagination from "@/components/ui/Pagination.vue";
import { formatDate, truncate } from "@/utils/format";

const actions: AdminActionType[] = [
  "LOGIN",
  "UPDATE_USER_ROLE",
  "CHANGE_GROUP_ROOM_STATUS",
  "DELETE_DIARY",
  "VIEW_DB_TABLE",
  "OTHER"
];

const actorId = ref("");
const action = ref<AdminActionType | "">("");
const from = ref("");
const to = ref("");
const keyword = ref("");
const page = ref(0);
const size = ref(20);
const totalElements = ref(0);
const totalPages = ref(0);
const rows = ref<AdminActionLog[]>([]);
const loading = ref(false);
const errorMessage = ref<string | null>(null);

function toIso(local: string): string | undefined {
  if (!local) return undefined;
  const d = new Date(local);
  if (Number.isNaN(d.getTime())) return undefined;
  return d.toISOString();
}

async function load() {
  loading.value = true;
  errorMessage.value = null;
  try {
    const res = await adminApi.searchLogs({
      actorId: actorId.value || undefined,
      action: action.value || undefined,
      from: toIso(from.value),
      to: toIso(to.value),
      keyword: keyword.value || undefined,
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

onMounted(load);
</script>

<template>
  <div class="space-y-4">
    <div class="card p-4">
      <form
        class="grid grid-cols-1 md:grid-cols-6 gap-3"
        @submit.prevent="
          () => {
            page = 0;
            load();
          }
        "
      >
        <div class="md:col-span-2">
          <label class="label">Actor ID (UUID)</label>
          <input v-model="actorId" class="input" placeholder="비우면 전체" />
        </div>
        <div>
          <label class="label">액션</label>
          <select v-model="action" class="input">
            <option value="">전체</option>
            <option v-for="a in actions" :key="a" :value="a">{{ a }}</option>
          </select>
        </div>
        <div>
          <label class="label">시작</label>
          <input v-model="from" type="datetime-local" class="input" />
        </div>
        <div>
          <label class="label">종료</label>
          <input v-model="to" type="datetime-local" class="input" />
        </div>
        <div class="flex items-end">
          <button type="submit" class="btn-primary w-full justify-center">검색</button>
        </div>
        <div class="md:col-span-6">
          <label class="label">키워드 (detail/targetId)</label>
          <input v-model="keyword" class="input" placeholder="검색어" />
        </div>
      </form>
    </div>

    <p v-if="errorMessage" class="text-sm text-rose-600">{{ errorMessage }}</p>

    <div class="card overflow-hidden">
      <div class="overflow-x-auto">
        <table class="table-base">
          <thead>
            <tr>
              <th class="w-44">시간</th>
              <th class="w-56">Actor</th>
              <th>액션</th>
              <th>대상</th>
              <th>상세</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="loading">
              <td colspan="5" class="text-center text-ink-400 py-8">불러오는 중...</td>
            </tr>
            <tr v-else-if="!rows.length">
              <td colspan="5" class="text-center text-ink-400 py-8">데이터가 없습니다.</td>
            </tr>
            <tr v-for="log in rows" :key="log.logId">
              <td class="tabular-nums text-ink-500">{{ formatDate(log.createdAt) }}</td>
              <td class="font-mono text-xs text-ink-500">
                {{ log.actorId ?? "system" }}
              </td>
              <td>
                <span class="badge bg-ink-100 text-ink-600 font-mono text-[10px]">
                  {{ log.action }}
                </span>
              </td>
              <td class="text-ink-500">
                <span v-if="log.targetType">{{ log.targetType }}</span>
                <span v-if="log.targetId" class="text-ink-700"> · {{ log.targetId }}</span>
                <span v-if="!log.targetType && !log.targetId">-</span>
              </td>
              <td class="text-ink-500">{{ truncate(log.detail, 80) }}</td>
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
