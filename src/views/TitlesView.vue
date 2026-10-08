<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { adminApi } from "@/api/admin";
import { extractErrorMessage } from "@/api/http";
import type { AdminUser, AdminUserTitle, TitleCatalogItem } from "@/types/api";
import Pagination from "@/components/ui/Pagination.vue";
import Modal from "@/components/ui/Modal.vue";
import PiiText from "@/components/pii/PiiText.vue";
import { userPii } from "@/composables/usePiiReveal";

const keyword = ref("");
const page = ref(0);
const size = ref(20);
const totalElements = ref(0);
const totalPages = ref(0);
const rows = ref<AdminUser[]>([]);
const loading = ref(false);
const errorMessage = ref<string | null>(null);

const catalog = ref<TitleCatalogItem[]>([]);

const selected = ref<AdminUser | null>(null);
const ownedCodes = ref<Set<string>>(new Set());
const ownedLoading = ref(false);
const pendingCode = ref<string | null>(null);

const categoryLabel: Record<string, string> = {
  region: "지역 정복",
  diary: "기록",
  character: "모찌"
};

async function load() {
  loading.value = true;
  errorMessage.value = null;
  try {
    const res = await adminApi.searchUsers({
      keyword: keyword.value || undefined,
      page: page.value,
      size: size.value
    });
    rows.value = res.content;
    totalElements.value = res.totalElements;
    totalPages.value = res.totalPages;
  } catch (err) {
    errorMessage.value = extractErrorMessage(err, "사용자 목록을 불러오지 못했습니다.");
  } finally {
    loading.value = false;
  }
}

function onSearch() {
  page.value = 0;
  load();
}

async function openManage(user: AdminUser) {
  selected.value = user;
  ownedLoading.value = true;
  ownedCodes.value = new Set();
  try {
    const titles = await adminApi.getUserTitles(user.userId);
    ownedCodes.value = new Set(titles.map((t) => t.code));
  } catch (err) {
    errorMessage.value = extractErrorMessage(err, "보유 칭호를 불러오지 못했습니다.");
  } finally {
    ownedLoading.value = false;
  }
}

function closeManage() {
  selected.value = null;
  pendingCode.value = null;
}

async function toggle(item: TitleCatalogItem) {
  const user = selected.value;
  if (!user || pendingCode.value) return;
  pendingCode.value = item.code;
  const owned = ownedCodes.value.has(item.code);
  try {
    const result: AdminUserTitle[] = owned
      ? await adminApi.revokeTitle(user.userId, item.code)
      : await adminApi.grantTitle(user.userId, item.code);
    ownedCodes.value = new Set(result.map((t) => t.code));
  } catch (err) {
    errorMessage.value = extractErrorMessage(err, "칭호 변경에 실패했습니다.");
  } finally {
    pendingCode.value = null;
  }
}

const ownedCount = computed(() => ownedCodes.value.size);

onMounted(async () => {
  try {
    catalog.value = await adminApi.titleCatalog();
  } catch (err) {
    errorMessage.value = extractErrorMessage(err, "칭호 카탈로그를 불러오지 못했습니다.");
  }
  load();
});
</script>

<template>
  <div class="space-y-4">
    <div class="card p-4">
      <form class="grid grid-cols-1 md:grid-cols-4 gap-3" @submit.prevent="onSearch">
        <div class="md:col-span-3">
          <label class="label">사용자 검색 (이름 / 이메일)</label>
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
              <th>이름</th>
              <th>이메일</th>
              <th class="w-32 text-right pr-4">칭호</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="loading">
              <td colspan="3" class="text-center text-ink-400 py-8">불러오는 중...</td>
            </tr>
            <tr v-else-if="!rows.length">
              <td colspan="3" class="text-center text-ink-400 py-8">데이터가 없습니다.</td>
            </tr>
            <tr v-for="u in rows" :key="u.userId">
              <td class="font-medium text-ink-700"><PiiText :value="u.name" :target="userPii(u.userId)" /></td>
              <td class="text-ink-500"><PiiText :value="u.email" :target="userPii(u.userId)" /></td>
              <td class="text-right pr-4">
                <button class="btn-outline px-3 py-1.5 text-xs" @click="openManage(u)">
                  칭호 관리
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
          @change="(p) => { page = p; load(); }"
        />
      </div>
    </div>

    <Modal :open="!!selected" :title="`칭호 관리 — ${selected?.name ?? ''}`" @close="closeManage">
      <div v-if="selected" class="space-y-4 text-sm">
        <div class="rounded-lg bg-ink-50 p-3 flex items-center justify-between">
          <div>
            <p class="text-ink-700 font-medium"><PiiText :value="selected.name" :target="userPii(selected.userId)" /></p>
            <p class="text-ink-400 text-xs"><PiiText :value="selected.email" :target="userPii(selected.userId)" /></p>
          </div>
          <span class="badge bg-accent/10 text-accent">보유 {{ ownedCount }} / {{ catalog.length }}</span>
        </div>

        <p v-if="ownedLoading" class="text-ink-400">보유 칭호 불러오는 중...</p>

        <div v-else class="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
          <div
            v-for="item in catalog"
            :key="item.code"
            class="flex items-center gap-3 rounded-lg border border-ink-100 p-3"
          >
            <span
              class="inline-block h-7 w-7 rounded-full shrink-0"
              :style="{ backgroundColor: item.accentColor }"
            />
            <div class="flex-1 min-w-0">
              <p class="font-medium text-ink-700 truncate">
                {{ item.name }}
                <span class="badge bg-ink-100 text-ink-500 ml-1">
                  {{ categoryLabel[item.category] ?? item.category }}
                </span>
              </p>
              <p class="text-xs text-ink-400 truncate">{{ item.description }}</p>
            </div>
            <button
              class="px-3 py-1.5 text-xs rounded-lg shrink-0"
              :class="
                ownedCodes.has(item.code)
                  ? 'bg-rose-50 text-rose-600 border border-rose-200'
                  : 'btn-primary'
              "
              :disabled="pendingCode === item.code"
              @click="toggle(item)"
            >
              {{
                pendingCode === item.code
                  ? "..."
                  : ownedCodes.has(item.code)
                    ? "회수"
                    : "부여"
              }}
            </button>
          </div>
        </div>

        <div class="flex justify-end">
          <button class="btn-outline" @click="closeManage">닫기</button>
        </div>
      </div>
    </Modal>
  </div>
</template>
