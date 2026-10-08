<script setup lang="ts">
import { onMounted, ref } from "vue";
import { adminApi } from "@/api/admin";
import { extractErrorMessage } from "@/api/http";
import type { AdminDiary } from "@/types/api";
import Pagination from "@/components/ui/Pagination.vue";
import Modal from "@/components/ui/Modal.vue";
import { formatDate, formatDateOnly } from "@/utils/format";
import PiiText from "@/components/pii/PiiText.vue";
import { userPii } from "@/composables/usePiiReveal";
import { safeUrl } from "@/utils/safeUrl";
import { requestAdminPassword } from "@/composables/usePasswordGate";

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
/** 원본 크기로 크게 보기 위한 이미지 URL */
const preview = ref<string | null>(null);

function imagesOf(diary: AdminDiary | null): string[] {
  return diary?.imageUrls ?? [];
}

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

/** 목록에서는 일기 제목을 앞 2글자만 보여 준다 — 전문은 비밀번호 확인 후 상세에서. */
function maskTitle(title: string | null | undefined): string {
  if (!title) return "-";
  const chars = Array.from(title.trim());
  return `${chars.slice(0, Math.min(2, Math.max(1, chars.length - 1))).join("")}***`;
}

async function openDetail(diary: AdminDiary) {
  // 일기는 사용자의 사적인 글이라 상세를 열 때마다 관리자 비밀번호를 다시 묻는다.
  const ok = await requestAdminPassword({
    title: "일기 상세 보기",
    description: "사용자의 일기 본문과 사진입니다. 관리자 비밀번호를 다시 입력해 주세요."
  });
  if (!ok) return;
  try {
    preview.value = null;
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
              <td class="font-medium text-ink-700">{{ maskTitle(d.title) }}</td>
              <td class="text-ink-500"><PiiText :value="d.authorName" :target="userPii(d.createdBy)" /></td>
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
      <div v-if="selected" class="space-y-4 text-sm">
        <div class="max-h-[70vh] overflow-y-auto space-y-4 pr-1">
          <p class="whitespace-pre-wrap text-ink-600 leading-relaxed">{{ selected.content }}</p>

          <div v-if="imagesOf(selected).length" class="space-y-2">
            <p class="text-xs text-ink-400">사진 {{ imagesOf(selected).length }}장</p>
            <div class="grid grid-cols-3 gap-2">
              <button
                v-for="(img, i) in imagesOf(selected)"
                :key="i"
                type="button"
                class="block"
                title="크게 보기"
                @click="preview = img"
              >
                <img
                  :src="safeUrl(img)"
                  :alt="`일기 사진 ${i + 1}`"
                  loading="lazy"
                  class="h-28 w-full rounded-lg border border-ink-100 object-cover"
                />
              </button>
            </div>
          </div>
          <p v-else class="text-xs text-ink-400">첨부된 사진이 없습니다.</p>
        </div>

        <div class="flex justify-end">
          <button class="btn-outline" @click="selected = null">닫기</button>
        </div>
      </div>
    </Modal>

    <Teleport to="body">
      <div
        v-if="preview"
        class="fixed inset-0 z-[60] grid place-items-center bg-ink-950/80 p-4"
        @click="preview = null"
      >
        <img :src="safeUrl(preview)" alt="일기 사진 원본" class="max-h-[90vh] max-w-full rounded-lg" />
      </div>
    </Teleport>

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
