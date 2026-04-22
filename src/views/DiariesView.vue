<script setup lang="ts">
import { onMounted, ref } from "vue";
import { adminApi } from "@/api/admin";
import { extractErrorMessage } from "@/api/http";
import type { AdminDiary } from "@/types/api";
import Pagination from "@/components/ui/Pagination.vue";
import Modal from "@/components/ui/Modal.vue";
import { formatDate, formatDateOnly, truncate } from "@/utils/format";

const keyword = ref("");
const page = ref(0);
const size = ref(20);
const totalElements = ref(0);
const totalPages = ref(0);
const rows = ref<AdminDiary[]>([]);
const loading = ref(false);
const errorMessage = ref<string | null>(null);

const selected = ref<AdminDiary | null>(null);
const confirmDelete = ref<AdminDiary | null>(null);
const deleting = ref(false);

async function load() {
  loading.value = true;
  errorMessage.value = null;
  try {
    const res = await adminApi.searchDiaries({
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

async function openDetail(diary: AdminDiary) {
  try {
    selected.value = await adminApi.getDiary(diary.diaryId);
  } catch (err) {
    errorMessage.value = extractErrorMessage(err);
  }
}

async function submitDelete() {
  if (!confirmDelete.value) return;
  deleting.value = true;
  try {
    await adminApi.deleteDiary(confirmDelete.value.diaryId);
    confirmDelete.value = null;
    await load();
  } catch (err) {
    errorMessage.value = extractErrorMessage(err, "일기 삭제에 실패했습니다.");
  } finally {
    deleting.value = false;
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
          <label class="label">키워드 (제목/내용)</label>
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
              <th>날짜</th>
              <th>제목</th>
              <th>작성자</th>
              <th>그룹방</th>
              <th>생성</th>
              <th class="text-right pr-4 w-40">작업</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="loading">
              <td colspan="6" class="text-center text-ink-400 py-8">불러오는 중...</td>
            </tr>
            <tr v-else-if="!rows.length">
              <td colspan="6" class="text-center text-ink-400 py-8">데이터가 없습니다.</td>
            </tr>
            <tr v-for="d in rows" :key="d.diaryId">
              <td class="tabular-nums text-ink-500">{{ formatDateOnly(d.date) }}</td>
              <td class="font-medium text-ink-700">{{ truncate(d.title, 36) }}</td>
              <td class="text-ink-500">{{ d.authorName }}</td>
              <td class="text-ink-500">{{ d.groupRoomName }}</td>
              <td class="tabular-nums text-ink-500">{{ formatDate(d.createdAt) }}</td>
              <td class="text-right pr-4 space-x-1.5">
                <button class="btn-outline px-2.5 py-1.5 text-xs" @click="openDetail(d)">
                  상세
                </button>
                <button
                  class="btn-outline px-2.5 py-1.5 text-xs !text-rose-600 hover:!bg-rose-50"
                  @click="confirmDelete = d"
                >
                  삭제
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

    <Modal :open="!!selected" title="일기 상세" @close="selected = null">
      <div v-if="selected" class="space-y-3 text-sm">
        <div class="flex justify-between text-xs text-ink-400">
          <span>{{ formatDateOnly(selected.date) }}</span>
          <span>{{ selected.authorName }} · {{ selected.groupRoomName }}</span>
        </div>
        <h3 class="text-lg font-semibold text-ink-700">{{ selected.title }}</h3>
        <p class="whitespace-pre-wrap text-ink-600 leading-relaxed">{{ selected.content }}</p>
        <img
          v-if="selected.imageUrl"
          :src="selected.imageUrl"
          alt="diary image"
          class="rounded-lg border border-ink-100 max-h-64 object-cover"
        />
        <div class="flex justify-end">
          <button class="btn-outline" @click="selected = null">닫기</button>
        </div>
      </div>
    </Modal>

    <Modal :open="!!confirmDelete" title="일기 삭제 확인" @close="confirmDelete = null">
      <div v-if="confirmDelete" class="space-y-4 text-sm">
        <p class="text-ink-600">
          <span class="font-semibold text-ink-800">“{{ confirmDelete.title }}”</span> 일기를
          영구 삭제합니다.
        </p>
        <p class="text-xs text-rose-600">* 이 작업은 되돌릴 수 없습니다.</p>
        <div class="flex justify-end gap-2">
          <button class="btn-outline" @click="confirmDelete = null">취소</button>
          <button
            class="btn-primary bg-rose-500 hover:bg-rose-600"
            :disabled="deleting"
            @click="submitDelete"
          >
            {{ deleting ? "삭제 중..." : "삭제" }}
          </button>
        </div>
      </div>
    </Modal>
  </div>
</template>
