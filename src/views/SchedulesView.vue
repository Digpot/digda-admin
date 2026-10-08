<script setup lang="ts">
import { onMounted, ref } from "vue";
import { adminApi } from "@/api/admin";
import { extractErrorMessage } from "@/api/http";
import type { AdminSchedule } from "@/types/api";
import Pagination from "@/components/ui/Pagination.vue";
import Modal from "@/components/ui/Modal.vue";
import { formatDate, formatDateOnly } from "@/utils/format";
import PiiText from "@/components/pii/PiiText.vue";
import { userPii } from "@/composables/usePiiReveal";

const keyword = ref("");
const page = ref(0);
const size = ref(20);
const totalElements = ref(0);
const totalPages = ref(0);
const rows = ref<AdminSchedule[]>([]);
const loading = ref(false);
const errorMessage = ref<string | null>(null);

const selected = ref<AdminSchedule | null>(null);

async function load() {
  loading.value = true;
  errorMessage.value = null;
  try {
    const res = await adminApi.searchSchedules({
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

async function openDetail(s: AdminSchedule) {
  try {
    selected.value = await adminApi.getSchedule(s.scheduleId);
  } catch (err) {
    errorMessage.value = extractErrorMessage(err);
  }
}

onMounted(load);
</script>

<template>
  <div class="space-y-4">
    <div class="card p-4">
      <form
        class="grid grid-cols-1 md:grid-cols-4 gap-3"
        @submit.prevent="
          () => {
            page = 0;
            load();
          }
        "
      >
        <div class="md:col-span-3">
          <label class="label">키워드 (제목)</label>
          <input v-model="keyword" class="input" placeholder="검색어" />
        </div>
        <div class="flex items-end">
          <button type="submit" class="btn-primary w-full justify-center">검색</button>
        </div>
      </form>
    </div>

    <p v-if="errorMessage" class="text-sm text-rose-600">{{ errorMessage }}</p>

    <div class="card overflow-hidden">
      <div class="overflow-x-auto">
        <table class="table-base">
          <thead>
            <tr>
              <th>기간</th>
              <th>제목</th>
              <th>작성자</th>
              <th>그룹방</th>
              <th>참여자</th>
              <th>생성</th>
              <th class="text-right pr-4 w-24">작업</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="loading">
              <td colspan="7" class="text-center text-ink-400 py-8">불러오는 중...</td>
            </tr>
            <tr v-else-if="!rows.length">
              <td colspan="7" class="text-center text-ink-400 py-8">데이터가 없습니다.</td>
            </tr>
            <tr v-for="s in rows" :key="s.scheduleId">
              <td class="tabular-nums text-ink-500 whitespace-nowrap">
                {{ formatDateOnly(s.startDate) }}
                <span v-if="s.startDate !== s.endDate"> ~ {{ formatDateOnly(s.endDate) }}</span>
              </td>
              <td class="font-medium text-ink-700">
                <span
                  class="inline-block w-2 h-2 rounded-full mr-2 align-middle"
                  :style="{ background: s.color }"
                />
                {{ s.title }}
              </td>
              <td class="text-ink-500"><PiiText :value="s.authorName" :target="userPii(s.createdBy)" /></td>
              <td class="text-ink-500">{{ s.groupRoomName }}</td>
              <td class="tabular-nums text-ink-500">{{ s.participantCount }}명</td>
              <td class="tabular-nums text-ink-500">{{ formatDate(s.createdAt) }}</td>
              <td class="text-right pr-4">
                <button class="btn-outline px-2.5 py-1.5 text-xs" @click="openDetail(s)">
                  상세
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

    <Modal :open="!!selected" title="일정 상세" @close="selected = null">
      <div v-if="selected" class="space-y-3 text-sm">
        <div class="flex items-center gap-2">
          <span
            class="h-3 w-3 rounded-full inline-block"
            :style="{ background: selected.color }"
          />
          <h3 class="text-lg font-semibold text-ink-700">{{ selected.title }}</h3>
        </div>
        <dl class="grid grid-cols-2 gap-y-2 text-ink-600">
          <dt class="text-ink-400">시작</dt>
          <dd>
            {{ formatDateOnly(selected.startDate) }}
            {{ selected.allDay ? "(종일)" : selected.startTime ?? "" }}
          </dd>
          <dt class="text-ink-400">종료</dt>
          <dd>
            {{ formatDateOnly(selected.endDate) }}
            {{ selected.allDay ? "" : selected.endTime ?? "" }}
          </dd>
          <dt class="text-ink-400">작성자</dt>
          <dd><PiiText :value="selected.authorName" :target="userPii(selected.createdBy)" /></dd>
          <dt class="text-ink-400">그룹방</dt>
          <dd>{{ selected.groupRoomName }}</dd>
          <dt class="text-ink-400">참여자</dt>
          <dd>{{ selected.participantCount }}명</dd>
        </dl>
        <div class="flex justify-end">
          <button class="btn-outline" @click="selected = null">닫기</button>
        </div>
      </div>
    </Modal>
  </div>
</template>
