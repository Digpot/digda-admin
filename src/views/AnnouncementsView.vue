<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { adminApi } from "@/api/admin";
import { extractErrorMessage } from "@/api/http";
import type { AdminAnnouncement, AdminUser, AnnouncementTarget } from "@/types/api";
import Modal from "@/components/ui/Modal.vue";
import Pagination from "@/components/ui/Pagination.vue";
import { formatDate, formatNumber, truncate } from "@/utils/format";
import PiiText from "@/components/pii/PiiText.vue";
import { userPii } from "@/composables/usePiiReveal";

type Tab = "send" | "list";
const tab = ref<Tab>("send");

const title = ref("");
const body = ref("");
const target = ref<AnnouncementTarget>("ALL");

const selectedUsers = ref<AdminUser[]>([]);
const selectedIds = computed(() => new Set(selectedUsers.value.map((u) => u.userId)));

const pickerOpen = ref(false);
const pickerKeyword = ref("");
const pickerRows = ref<AdminUser[]>([]);
const pickerPage = ref(0);
const pickerSize = ref(10);
const pickerTotalPages = ref(0);
const pickerTotalElements = ref(0);
const pickerLoading = ref(false);
const pickerError = ref<string | null>(null);

const sending = ref(false);
const errorMessage = ref<string | null>(null);
const successMessage = ref<string | null>(null);

const listKeyword = ref("");
const listRows = ref<AdminAnnouncement[]>([]);
const listPage = ref(0);
const listSize = ref(20);
const listTotalPages = ref(0);
const listTotalElements = ref(0);
const listLoading = ref(false);
const listError = ref<string | null>(null);
const detail = ref<AdminAnnouncement | null>(null);

const canSend = computed(() => {
  if (!title.value.trim() || !body.value.trim()) return false;
  if (target.value === "USER_IDS" && selectedUsers.value.length === 0) return false;
  return !sending.value;
});

async function loadPickerUsers() {
  pickerLoading.value = true;
  pickerError.value = null;
  try {
    const res = await adminApi.searchUsers({
      keyword: pickerKeyword.value || undefined,
      page: pickerPage.value,
      size: pickerSize.value
    });
    pickerRows.value = res.content;
    pickerTotalPages.value = res.totalPages;
    pickerTotalElements.value = res.totalElements;
  } catch (err) {
    pickerError.value = extractErrorMessage(err);
  } finally {
    pickerLoading.value = false;
  }
}

function openPicker() {
  pickerOpen.value = true;
  if (pickerRows.value.length === 0) loadPickerUsers();
}

function toggleUser(user: AdminUser) {
  if (selectedIds.value.has(user.userId)) {
    selectedUsers.value = selectedUsers.value.filter((u) => u.userId !== user.userId);
  } else {
    selectedUsers.value = [...selectedUsers.value, user];
  }
}

function removeSelected(userId: string) {
  selectedUsers.value = selectedUsers.value.filter((u) => u.userId !== userId);
}

function clearSelected() {
  selectedUsers.value = [];
}

async function loadList() {
  listLoading.value = true;
  listError.value = null;
  try {
    const res = await adminApi.searchAnnouncements({
      keyword: listKeyword.value || undefined,
      page: listPage.value,
      size: listSize.value
    });
    listRows.value = res.content;
    listTotalPages.value = res.totalPages;
    listTotalElements.value = res.totalElements;
  } catch (err) {
    listError.value = extractErrorMessage(err);
  } finally {
    listLoading.value = false;
  }
}

function switchTab(next: Tab) {
  tab.value = next;
  if (next === "list" && listRows.value.length === 0) loadList();
}

async function send() {
  errorMessage.value = null;
  successMessage.value = null;

  const confirmMsg =
    target.value === "ALL"
      ? "전체 사용자에게 공지를 발송하시겠습니까?"
      : `${selectedUsers.value.length}명에게 공지를 발송하시겠습니까?`;
  if (!confirm(confirmMsg)) return;

  sending.value = true;
  try {
    const res = await adminApi.sendAnnouncement({
      title: title.value.trim(),
      body: body.value.trim(),
      target: target.value,
      userIds:
        target.value === "USER_IDS" ? selectedUsers.value.map((u) => u.userId) : undefined
    });
    successMessage.value = `${res.recipientCount}명에게 발송되었습니다.`;
    title.value = "";
    body.value = "";
    selectedUsers.value = [];
    listRows.value = [];
    if (tab.value === "list") loadList();
  } catch (err) {
    errorMessage.value = extractErrorMessage(err, "공지 발송에 실패했습니다.");
  } finally {
    sending.value = false;
  }
}

onMounted(() => {
  // 초기에는 send 탭이라 리스트는 첫 클릭 때 로드
});
</script>

<template>
  <div class="space-y-4">
    <div class="flex gap-2 border-b border-ink-100">
      <button
        type="button"
        class="px-4 py-2 text-sm font-medium border-b-2"
        :class="
          tab === 'send'
            ? 'border-primary-500 text-primary-600'
            : 'border-transparent text-ink-500 hover:text-ink-700'
        "
        @click="switchTab('send')"
      >
        공지 발송
      </button>
      <button
        type="button"
        class="px-4 py-2 text-sm font-medium border-b-2"
        :class="
          tab === 'list'
            ? 'border-primary-500 text-primary-600'
            : 'border-transparent text-ink-500 hover:text-ink-700'
        "
        @click="switchTab('list')"
      >
        공지 목록
      </button>
    </div>

    <div v-if="tab === 'send'" class="card p-6 space-y-4 max-w-3xl">
      <div>
        <label class="label">제목</label>
        <input
          v-model="title"
          class="input"
          placeholder="공지 제목 (최대 100자)"
          maxlength="100"
        />
      </div>

      <div>
        <label class="label">본문</label>
        <textarea
          v-model="body"
          class="input min-h-[160px]"
          placeholder="공지 본문 (최대 1000자)"
          maxlength="1000"
        ></textarea>
        <div class="text-xs text-ink-400 mt-1 text-right">{{ body.length }} / 1000</div>
      </div>

      <div>
        <label class="label">발송 대상</label>
        <div class="flex items-center gap-6 text-sm">
          <label class="flex items-center gap-2">
            <input v-model="target" type="radio" value="ALL" />
            <span>전체 사용자</span>
          </label>
          <label class="flex items-center gap-2">
            <input v-model="target" type="radio" value="USER_IDS" />
            <span>특정 유저 선택</span>
          </label>
        </div>
      </div>

      <div v-if="target === 'USER_IDS'" class="space-y-2">
        <div class="flex items-center gap-2">
          <button type="button" class="btn-primary" @click="openPicker">
            유저 선택
          </button>
          <button
            v-if="selectedUsers.length"
            type="button"
            class="btn-ghost text-sm"
            @click="clearSelected"
          >
            전체 해제
          </button>
          <span class="text-sm text-ink-500 ml-auto">{{ selectedUsers.length }}명 선택됨</span>
        </div>

        <div
          v-if="selectedUsers.length"
          class="border border-ink-100 rounded-lg p-3 max-h-48 overflow-y-auto flex flex-wrap gap-2"
        >
          <span
            v-for="u in selectedUsers"
            :key="u.userId"
            class="inline-flex items-center gap-2 rounded-full bg-ink-100 px-3 py-1 text-xs"
          >
            <span class="font-medium text-ink-700"><PiiText :value="u.name" :target="userPii(u.userId)" /></span>
            <span class="text-ink-400"><PiiText :value="u.email" :target="userPii(u.userId)" /></span>
            <button
              type="button"
              class="text-ink-400 hover:text-rose-500"
              @click="removeSelected(u.userId)"
            >
              ×
            </button>
          </span>
        </div>
        <p v-else class="text-xs text-ink-400">유저를 선택해주세요.</p>
      </div>

      <p v-if="errorMessage" class="text-sm text-rose-600">{{ errorMessage }}</p>
      <p v-if="successMessage" class="text-sm text-emerald-600">{{ successMessage }}</p>

      <div class="flex justify-end gap-2 pt-2 border-t border-ink-100">
        <button type="button" class="btn-primary" :disabled="!canSend" @click="send">
          {{ sending ? "발송 중..." : "공지 발송" }}
        </button>
      </div>
    </div>

    <div v-else class="space-y-3">
      <div class="card p-4">
        <form
          class="flex gap-2"
          @submit.prevent="
            () => {
              listPage = 0;
              loadList();
            }
          "
        >
          <input
            v-model="listKeyword"
            class="input flex-1"
            placeholder="제목 / 본문 검색"
          />
          <button type="submit" class="btn-primary">검색</button>
        </form>
      </div>

      <p v-if="listError" class="text-sm text-rose-600">{{ listError }}</p>

      <div class="card overflow-hidden">
        <div class="overflow-x-auto">
          <table class="table-base">
            <thead>
              <tr>
                <th class="w-44">발송 시각</th>
                <th>제목</th>
                <th>본문</th>
                <th class="w-24">대상</th>
                <th class="w-24 text-right">수신자</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="listLoading">
                <td colspan="5" class="text-center text-ink-400 py-8">불러오는 중...</td>
              </tr>
              <tr v-else-if="!listRows.length">
                <td colspan="5" class="text-center text-ink-400 py-8">데이터가 없습니다.</td>
              </tr>
              <tr
                v-for="a in listRows"
                :key="a.announcementId"
                class="cursor-pointer hover:bg-ink-50"
                @click="detail = a"
              >
                <td class="tabular-nums text-ink-500">{{ formatDate(a.createdAt) }}</td>
                <td class="text-ink-700 font-medium">{{ a.title }}</td>
                <td class="text-ink-500">{{ truncate(a.body, 80) }}</td>
                <td>
                  <span class="badge bg-ink-100 text-ink-600 text-[10px]">{{ a.targetType }}</span>
                </td>
                <td class="text-right tabular-nums text-ink-700">
                  {{ formatNumber(a.recipientCount) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="px-4">
          <Pagination
            :page="listPage"
            :total-pages="listTotalPages"
            :total-elements="listTotalElements"
            @change="
              (p) => {
                listPage = p;
                loadList();
              }
            "
          />
        </div>
      </div>
    </div>

    <Modal :open="pickerOpen" title="유저 선택" @close="pickerOpen = false">
      <div class="space-y-3">
        <form
          class="flex gap-2"
          @submit.prevent="
            () => {
              pickerPage = 0;
              loadPickerUsers();
            }
          "
        >
          <input
            v-model="pickerKeyword"
            class="input flex-1"
            placeholder="이메일 / 이름 검색"
          />
          <button type="submit" class="btn-primary">검색</button>
        </form>

        <p v-if="pickerError" class="text-sm text-rose-600">{{ pickerError }}</p>

        <div class="border border-ink-100 rounded-lg max-h-80 overflow-y-auto">
          <table class="table-base">
            <thead class="sticky top-0 bg-white">
              <tr>
                <th class="w-10"></th>
                <th>이름</th>
                <th>이메일</th>
                <th class="w-16">권한</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="pickerLoading">
                <td colspan="4" class="text-center text-ink-400 py-6">불러오는 중...</td>
              </tr>
              <tr v-else-if="!pickerRows.length">
                <td colspan="4" class="text-center text-ink-400 py-6">데이터가 없습니다.</td>
              </tr>
              <tr
                v-for="u in pickerRows"
                :key="u.userId"
                class="cursor-pointer hover:bg-ink-50"
                @click="toggleUser(u)"
              >
                <td>
                  <input
                    type="checkbox"
                    :checked="selectedIds.has(u.userId)"
                    @click.stop="toggleUser(u)"
                  />
                </td>
                <td class="text-ink-700"><PiiText :value="u.name" :target="userPii(u.userId)" /></td>
                <td class="text-ink-500"><PiiText :value="u.email" :target="userPii(u.userId)" /></td>
                <td>
                  <span class="badge bg-ink-100 text-ink-600 text-[10px]">{{ u.role }}</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <Pagination
          :page="pickerPage"
          :total-pages="pickerTotalPages"
          :total-elements="pickerTotalElements"
          @change="
            (p) => {
              pickerPage = p;
              loadPickerUsers();
            }
          "
        />

        <div class="flex justify-end pt-2 border-t border-ink-100">
          <button type="button" class="btn-primary" @click="pickerOpen = false">
            완료 ({{ selectedUsers.length }}명)
          </button>
        </div>
      </div>
    </Modal>

    <Modal :open="!!detail" title="공지 상세" @close="detail = null">
      <div v-if="detail" class="space-y-3 text-sm">
        <div class="flex items-center gap-2 text-ink-500">
          <span class="badge bg-ink-100 text-ink-600 text-[10px]">{{ detail.targetType }}</span>
          <span>{{ formatDate(detail.createdAt) }}</span>
          <span class="ml-auto">수신자 {{ formatNumber(detail.recipientCount) }}명</span>
        </div>
        <div>
          <div class="label">제목</div>
          <div class="text-ink-800 font-medium">{{ detail.title }}</div>
        </div>
        <div>
          <div class="label">본문</div>
          <div class="whitespace-pre-wrap text-ink-700 border border-ink-100 rounded-lg p-3 bg-ink-50">
            {{ detail.body }}
          </div>
        </div>
      </div>
    </Modal>
  </div>
</template>
