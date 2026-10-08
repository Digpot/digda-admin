<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { adminApi } from "@/api/admin";
import { extractErrorMessage } from "@/api/http";
import type {
  AdminExhibitAccess,
  AdminNicknameExhibit,
  AdminUser
} from "@/types/api";
import Pagination from "@/components/ui/Pagination.vue";
import Modal from "@/components/ui/Modal.vue";
import { formatDate } from "@/utils/format";
import PiiText from "@/components/pii/PiiText.vue";
import { userPii } from "@/composables/usePiiReveal";
import { safeUrl } from "@/utils/safeUrl";

type Tab = "content" | "access";
const tab = ref<Tab>("content");

const errorMessage = ref<string | null>(null);

/* ───────────────── 콘텐츠(별명 카드) ───────────────── */

const keyword = ref("");
const page = ref(0);
const size = ref(20);
const totalElements = ref(0);
const totalPages = ref(0);
const rows = ref<AdminNicknameExhibit[]>([]);
const loading = ref(false);

async function load() {
  loading.value = true;
  errorMessage.value = null;
  try {
    const res = await adminApi.searchExhibits({
      keyword: keyword.value || undefined,
      page: page.value,
      size: size.value
    });
    rows.value = res.content;
    totalElements.value = res.totalElements;
    totalPages.value = res.totalPages;
  } catch (err) {
    errorMessage.value = extractErrorMessage(err, "전시관 목록을 불러오지 못했습니다.");
  } finally {
    loading.value = false;
  }
}

function onSearch() {
  page.value = 0;
  load();
}

/* 등록/수정 모달 */
const editOpen = ref(false);
const editId = ref<number | null>(null); // null = 신규 등록
const formNickname = ref("");
const formHistory = ref("");
const formSortOrder = ref(0);
const formImageUrl = ref<string | null>(null); // 기존(서버에 저장된) 이미지 URL
const pickedFile = ref<File | null>(null); // 새로 고른(아직 업로드 안 한) 파일
const localPreview = ref<string | null>(null); // 로컬 미리보기용 objectURL
const uploading = ref(false);
const saving = ref(false);

// 미리보기는 새로 고른 로컬 파일을 우선하고, 없으면 기존 서버 이미지를 보여준다.
const previewUrl = computed(() => localPreview.value ?? formImageUrl.value);

const modalTitle = computed(() => (editId.value === null ? "별명 카드 등록" : "별명 카드 수정"));
const canSave = computed(
  () => formNickname.value.trim().length > 0 && formHistory.value.trim().length > 0
);

/** 로컬 미리보기 objectURL 을 해제하고 고른 파일 상태를 비운다. */
function clearPickedFile() {
  if (localPreview.value) {
    URL.revokeObjectURL(localPreview.value);
    localPreview.value = null;
  }
  pickedFile.value = null;
}

function openCreate() {
  editId.value = null;
  formNickname.value = "";
  formHistory.value = "";
  formSortOrder.value = 0;
  formImageUrl.value = null;
  clearPickedFile();
  editOpen.value = true;
}

function openEdit(row: AdminNicknameExhibit) {
  editId.value = row.id;
  formNickname.value = row.nickname;
  formHistory.value = row.history;
  formSortOrder.value = row.sortOrder;
  formImageUrl.value = row.imageUrl;
  clearPickedFile();
  editOpen.value = true;
}

// 파일 선택 시 곧바로 서버에 올리지 않고 로컬에만 담아 둔다(미리보기만 생성).
// 실제 업로드는 '저장'을 눌렀을 때 submitEdit 에서 수행한다.
function onPickImage(e: Event) {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = ""; // 같은 파일 재선택 허용
  if (!file) return;
  clearPickedFile();
  pickedFile.value = file;
  localPreview.value = URL.createObjectURL(file);
}

function removeImage() {
  clearPickedFile();
  formImageUrl.value = null;
}

async function submitEdit() {
  if (!canSave.value) return;
  saving.value = true;
  errorMessage.value = null;
  try {
    // 새로 고른 이미지가 있으면 저장 직전에 업로드해 URL 을 확보한다.
    let imageUrl = formImageUrl.value;
    if (pickedFile.value) {
      uploading.value = true;
      try {
        const res = await adminApi.uploadImage(pickedFile.value, "exhibit");
        imageUrl = res.url;
      } finally {
        uploading.value = false;
      }
    }
    if (editId.value === null) {
      await adminApi.createExhibit({
        nickname: formNickname.value.trim(),
        history: formHistory.value.trim(),
        sortOrder: formSortOrder.value,
        imageUrl
      });
    } else {
      await adminApi.updateExhibit(editId.value, {
        nickname: formNickname.value.trim(),
        history: formHistory.value.trim(),
        sortOrder: formSortOrder.value,
        imageUrl
      });
    }
    editOpen.value = false;
    clearPickedFile();
    await load();
  } catch (err) {
    errorMessage.value = extractErrorMessage(err, "저장에 실패했습니다.");
  } finally {
    saving.value = false;
  }
}

/* 삭제 확인 */
const deleteTarget = ref<AdminNicknameExhibit | null>(null);
const deleting = ref(false);

async function confirmDelete() {
  if (!deleteTarget.value) return;
  deleting.value = true;
  try {
    await adminApi.deleteExhibit(deleteTarget.value.id);
    deleteTarget.value = null;
    await load();
  } catch (err) {
    errorMessage.value = extractErrorMessage(err, "삭제에 실패했습니다.");
  } finally {
    deleting.value = false;
  }
}

/* ───────────────── 접근 권한 ───────────────── */

const accessRows = ref<AdminExhibitAccess[]>([]);
const accessLoading = ref(false);
const allowedIds = computed(() => new Set(accessRows.value.map((a) => a.userId)));

const userKeyword = ref("");
const userRows = ref<AdminUser[]>([]);
const userSearching = ref(false);
const togglingId = ref<string | null>(null);

async function loadAccess() {
  accessLoading.value = true;
  errorMessage.value = null;
  try {
    // 허용 목록은 보통 소수라 한 번에 넉넉히 가져온다.
    const res = await adminApi.searchExhibitAccess({ page: 0, size: 100 });
    accessRows.value = res.content;
  } catch (err) {
    errorMessage.value = extractErrorMessage(err, "허용 목록을 불러오지 못했습니다.");
  } finally {
    accessLoading.value = false;
  }
}

async function searchUsers() {
  userSearching.value = true;
  errorMessage.value = null;
  try {
    const res = await adminApi.searchUsers({
      keyword: userKeyword.value || undefined,
      page: 0,
      size: 20
    });
    userRows.value = res.content;
  } catch (err) {
    errorMessage.value = extractErrorMessage(err, "사용자 검색에 실패했습니다.");
  } finally {
    userSearching.value = false;
  }
}

async function grant(user: AdminUser) {
  togglingId.value = user.userId;
  try {
    await adminApi.addExhibitAccess(user.userId);
    await loadAccess();
  } catch (err) {
    errorMessage.value = extractErrorMessage(err, "허용 추가에 실패했습니다.");
  } finally {
    togglingId.value = null;
  }
}

async function revoke(userId: string) {
  togglingId.value = userId;
  try {
    await adminApi.removeExhibitAccess(userId);
    await loadAccess();
  } catch (err) {
    errorMessage.value = extractErrorMessage(err, "허용 해제에 실패했습니다.");
  } finally {
    togglingId.value = null;
  }
}

function switchTab(next: Tab) {
  tab.value = next;
  errorMessage.value = null;
  if (next === "access" && accessRows.value.length === 0) loadAccess();
}

onMounted(load);
</script>

<template>
  <div class="space-y-4">
    <!-- 탭 -->
    <div class="flex gap-2">
      <button
        class="px-4 py-2 rounded-lg text-sm font-medium transition"
        :class="tab === 'content' ? 'bg-accent text-white' : 'bg-white text-ink-600 border border-ink-100'"
        @click="switchTab('content')"
      >
        콘텐츠 관리
      </button>
      <button
        class="px-4 py-2 rounded-lg text-sm font-medium transition"
        :class="tab === 'access' ? 'bg-accent text-white' : 'bg-white text-ink-600 border border-ink-100'"
        @click="switchTab('access')"
      >
        접근 권한 관리
      </button>
    </div>

    <p v-if="errorMessage" class="text-sm text-rose-600">{{ errorMessage }}</p>

    <!-- ───────── 콘텐츠 관리 ───────── -->
    <template v-if="tab === 'content'">
      <div class="card p-4">
        <form class="grid grid-cols-1 md:grid-cols-4 gap-3" @submit.prevent="onSearch">
          <div class="md:col-span-2">
            <label class="label">키워드 (별명)</label>
            <input v-model="keyword" class="input" placeholder="검색어" />
          </div>
          <div class="flex items-end">
            <button type="submit" class="btn-primary w-full justify-center">검색</button>
          </div>
          <div class="flex items-end">
            <button type="button" class="btn-outline w-full justify-center" @click="openCreate">
              신규 등록
            </button>
          </div>
        </form>
      </div>

      <div class="card overflow-hidden">
        <div class="overflow-x-auto">
          <table class="table-base">
            <thead>
              <tr>
                <th class="w-20">이미지</th>
                <th>별명</th>
                <th>역사 / 설명</th>
                <th class="w-20">정렬</th>
                <th class="w-36">수정일</th>
                <th class="w-32 text-right pr-4">작업</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="loading">
                <td colspan="6" class="text-center text-ink-400 py-8">불러오는 중...</td>
              </tr>
              <tr v-else-if="!rows.length">
                <td colspan="6" class="text-center text-ink-400 py-8">데이터가 없습니다.</td>
              </tr>
              <tr v-for="row in rows" :key="row.id">
                <td>
                  <img
                    v-if="row.imageUrl"
                    :src="safeUrl(row.imageUrl)"
                    alt=""
                    class="h-12 w-12 rounded-lg object-cover bg-ink-50"
                  />
                  <div v-else class="h-12 w-12 rounded-lg bg-ink-100 grid place-items-center text-ink-300 text-xs">
                    없음
                  </div>
                </td>
                <td class="font-medium text-ink-700">{{ row.nickname }}</td>
                <td class="text-ink-500 max-w-md">
                  <p class="line-clamp-2">{{ row.history }}</p>
                </td>
                <td class="tabular-nums text-ink-500">{{ row.sortOrder }}</td>
                <td class="tabular-nums text-ink-500 text-xs">{{ formatDate(row.updatedAt) }}</td>
                <td class="text-right pr-4 space-x-1 whitespace-nowrap">
                  <button class="btn-outline px-3 py-1.5 text-xs" @click="openEdit(row)">수정</button>
                  <button
                    class="px-3 py-1.5 text-xs rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50"
                    @click="deleteTarget = row"
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
    </template>

    <!-- ───────── 접근 권한 관리 ───────── -->
    <template v-else>
      <div class="card p-4">
        <form class="grid grid-cols-1 md:grid-cols-4 gap-3" @submit.prevent="searchUsers">
          <div class="md:col-span-3">
            <label class="label">사용자 검색 (이름/이메일)</label>
            <input v-model="userKeyword" class="input" placeholder="검색어" />
          </div>
          <div class="flex items-end">
            <button type="submit" class="btn-primary w-full justify-center">검색</button>
          </div>
        </form>

        <div v-if="userRows.length" class="mt-4 overflow-x-auto">
          <table class="table-base">
            <thead>
              <tr>
                <th>이름</th>
                <th>이메일</th>
                <th class="w-28 text-right pr-4">접근</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="u in userRows" :key="u.userId">
                <td class="font-medium text-ink-700"><PiiText :value="u.name" :target="userPii(u.userId)" /></td>
                <td class="text-ink-500"><PiiText :value="u.email" :target="userPii(u.userId)" /></td>
                <td class="text-right pr-4">
                  <span
                    v-if="allowedIds.has(u.userId)"
                    class="badge bg-emerald-100 text-emerald-700"
                  >
                    허용됨
                  </span>
                  <button
                    v-else
                    class="btn-outline px-3 py-1.5 text-xs"
                    :disabled="togglingId === u.userId"
                    @click="grant(u)"
                  >
                    {{ togglingId === u.userId ? "처리 중..." : "허용 추가" }}
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p v-else-if="!userSearching" class="mt-4 text-sm text-ink-400">
          사용자를 검색해 전시관 접근을 허용하세요.
        </p>
      </div>

      <div class="card overflow-hidden">
        <div class="px-4 py-3 border-b border-ink-100 text-sm font-semibold text-ink-700">
          접근 허용 사용자 ({{ accessRows.length }})
        </div>
        <div class="overflow-x-auto">
          <table class="table-base">
            <thead>
              <tr>
                <th>이름</th>
                <th>이메일</th>
                <th class="w-40">허용일시</th>
                <th class="w-24 text-right pr-4">작업</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="accessLoading">
                <td colspan="4" class="text-center text-ink-400 py-8">불러오는 중...</td>
              </tr>
              <tr v-else-if="!accessRows.length">
                <td colspan="4" class="text-center text-ink-400 py-8">허용된 사용자가 없습니다.</td>
              </tr>
              <tr v-for="a in accessRows" :key="a.userId">
                <td class="font-medium text-ink-700"><PiiText :value="a.name" :target="userPii(a.userId)" /></td>
                <td class="text-ink-500"><PiiText :value="a.email" :target="userPii(a.userId)" /></td>
                <td class="tabular-nums text-ink-500 text-xs">{{ formatDate(a.grantedAt) }}</td>
                <td class="text-right pr-4">
                  <button
                    class="px-3 py-1.5 text-xs rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50"
                    :disabled="togglingId === a.userId"
                    @click="revoke(a.userId)"
                  >
                    해제
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>

    <!-- 등록/수정 모달 -->
    <Modal :open="editOpen" :title="modalTitle" @close="editOpen = false">
      <div class="space-y-4 text-sm">
        <div>
          <label class="label">별명</label>
          <input v-model="formNickname" class="input" placeholder="예: 디그다 박사" />
        </div>
        <div>
          <label class="label">별명 역사 / 설명</label>
          <textarea
            v-model="formHistory"
            rows="4"
            class="input"
            placeholder="별명이 생긴 배경·역사·기타 설명"
          />
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="label">정렬 순서</label>
            <input v-model.number="formSortOrder" type="number" class="input" />
          </div>
          <div>
            <label class="label">이미지</label>
            <input
              type="file"
              accept="image/png,image/jpeg"
              class="input"
              :disabled="uploading || saving"
              @change="onPickImage"
            />
          </div>
        </div>
        <p class="text-xs text-ink-400">이미지는 저장을 누를 때 업로드됩니다.</p>
        <div v-if="previewUrl" class="flex items-center gap-3">
          <img :src="safeUrl(previewUrl)" alt="" class="h-20 w-20 rounded-lg object-cover bg-ink-50" />
          <button class="btn-outline px-3 py-1.5 text-xs" @click="removeImage">
            이미지 제거
          </button>
        </div>
        <div class="flex justify-end gap-2 pt-2">
          <button class="btn-outline" @click="editOpen = false">취소</button>
          <button class="btn-primary" :disabled="saving || uploading || !canSave" @click="submitEdit">
            {{ saving ? "저장 중..." : "저장" }}
          </button>
        </div>
      </div>
    </Modal>

    <!-- 삭제 확인 모달 -->
    <Modal :open="!!deleteTarget" title="별명 카드 삭제" @close="deleteTarget = null">
      <div v-if="deleteTarget" class="space-y-4 text-sm">
        <p class="text-ink-600">
          <span class="font-medium text-ink-800">{{ deleteTarget.nickname }}</span>
          카드를 삭제할까요? 되돌릴 수 없습니다.
        </p>
        <div class="flex justify-end gap-2">
          <button class="btn-outline" @click="deleteTarget = null">취소</button>
          <button
            class="btn-primary !bg-rose-600 hover:!bg-rose-700"
            :disabled="deleting"
            @click="confirmDelete"
          >
            {{ deleting ? "삭제 중..." : "삭제" }}
          </button>
        </div>
      </div>
    </Modal>
  </div>
</template>
