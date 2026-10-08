<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { adminApi } from "@/api/admin";
import { extractErrorMessage } from "@/api/http";
import type {
  AdminCharacter,
  AdminUpdateCharacterRequest
} from "@/types/api";
import Pagination from "@/components/ui/Pagination.vue";
import Modal from "@/components/ui/Modal.vue";
import { formatDate } from "@/utils/format";
import PiiText from "@/components/pii/PiiText.vue";

const keyword = ref("");
const includeDeletedGroups = ref(false);
const page = ref(0);
const size = ref(20);
const totalElements = ref(0);
const totalPages = ref(0);
const rows = ref<AdminCharacter[]>([]);
const loading = ref(false);
const errorMessage = ref<string | null>(null);

const editTarget = ref<AdminCharacter | null>(null);
const editLevel = ref<number>(1);
const editExp = ref<number>(0);
const editCoin = ref<number>(0);
const editDikoUnlocked = ref<boolean>(false);
const saving = ref(false);

async function load() {
  loading.value = true;
  errorMessage.value = null;
  try {
    const res = await adminApi.searchCharacters({
      keyword: keyword.value || undefined,
      includeDeletedGroups: includeDeletedGroups.value,
      page: page.value,
      size: size.value
    });
    rows.value = res.content;
    totalElements.value = res.totalElements;
    totalPages.value = res.totalPages;
  } catch (err) {
    errorMessage.value = extractErrorMessage(
      err,
      "모찌 목록을 불러오지 못했습니다."
    );
  } finally {
    loading.value = false;
  }
}

function onSearch() {
  page.value = 0;
  load();
}

function openEdit(row: AdminCharacter) {
  editTarget.value = row;
  editLevel.value = row.level;
  editExp.value = row.exp;
  editCoin.value = row.coin;
  editDikoUnlocked.value = row.dikoUnlocked;
}

function closeEdit() {
  editTarget.value = null;
}

// 수정된 항목만 부분 페이로드로 전송. 변경 없는 필드는 null 로 두면 서버가 변경하지 않음.
const dirtyPayload = computed<AdminUpdateCharacterRequest>(() => {
  const t = editTarget.value;
  if (!t) return {};
  const out: AdminUpdateCharacterRequest = {};
  if (editLevel.value !== t.level) out.level = editLevel.value;
  if (editExp.value !== t.exp) out.exp = editExp.value;
  if (editCoin.value !== t.coin) out.coin = editCoin.value;
  if (editDikoUnlocked.value !== t.dikoUnlocked)
    out.dikoUnlocked = editDikoUnlocked.value;
  return out;
});

const hasChange = computed(() => Object.keys(dirtyPayload.value).length > 0);

async function submitEdit() {
  if (!editTarget.value || !hasChange.value) return;
  saving.value = true;
  try {
    await adminApi.updateCharacter(
      editTarget.value.groupRoomId,
      dirtyPayload.value
    );
    closeEdit();
    await load();
  } catch (err) {
    errorMessage.value = extractErrorMessage(err, "모찌 정보 수정에 실패했습니다.");
  } finally {
    saving.value = false;
  }
}

function stageBadgeClass(stage: string): string {
  switch (stage) {
    case "MASTER":
      return "bg-amber-100 text-amber-700";
    case "GLOW":
      return "bg-indigo-100 text-indigo-700";
    case "BLOSSOM":
      return "bg-rose-100 text-rose-700";
    case "BLOOM":
      return "bg-pink-100 text-pink-700";
    case "SPROUT":
      return "bg-emerald-100 text-emerald-700";
    default:
      return "bg-ink-100 text-ink-600";
  }
}

function progressPct(row: AdminCharacter): number {
  if (row.maxLevelReached) return 100;
  if (!row.expForNextLevel) return 0;
  return Math.min(100, Math.round((row.exp / row.expForNextLevel) * 100));
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
        <div class="md:col-span-2">
          <label class="label">키워드 (그룹방 이름 / 방장 이름)</label>
          <input v-model="keyword" class="input" placeholder="검색어" />
        </div>
        <label
          class="flex items-center gap-2 text-sm text-ink-600 md:self-end h-10"
        >
          <input
            v-model="includeDeletedGroups"
            type="checkbox"
            class="h-4 w-4 rounded"
          />
          삭제된 그룹 포함
        </label>
        <div class="flex items-end">
          <button type="submit" class="btn-primary w-full justify-center">
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
              <th>그룹방</th>
              <th>방장</th>
              <th>단계</th>
              <th class="w-28">레벨</th>
              <th class="w-44">EXP</th>
              <th class="w-20">코인</th>
              <th class="w-20">디코</th>
              <th class="w-36">수정</th>
              <th class="w-24 text-right pr-4">작업</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="loading">
              <td colspan="9" class="text-center text-ink-400 py-8">
                불러오는 중...
              </td>
            </tr>
            <tr v-else-if="!rows.length">
              <td colspan="9" class="text-center text-ink-400 py-8">
                데이터가 없습니다.
              </td>
            </tr>
            <tr v-for="row in rows" :key="row.characterId">
              <td>
                <p class="font-medium text-ink-700">{{ row.groupRoomName }}</p>
                <p v-if="row.groupRoomDeletedAt" class="text-xs text-rose-500">
                  삭제된 그룹
                </p>
              </td>
              <td class="text-ink-500"><PiiText :value="row.ownerName" /></td>
              <td>
                <span class="badge" :class="stageBadgeClass(row.stage)">
                  {{ row.stageDisplayName }}
                </span>
              </td>
              <td class="tabular-nums font-medium text-ink-700">
                Lv.{{ row.level }}
              </td>
              <td>
                <div class="flex items-center gap-2">
                  <div
                    class="flex-1 h-1.5 rounded-full bg-ink-100 overflow-hidden min-w-[80px]"
                  >
                    <div
                      class="h-full bg-accent"
                      :style="{ width: `${progressPct(row)}%` }"
                    />
                  </div>
                  <span class="text-xs tabular-nums text-ink-500">
                    {{
                      row.maxLevelReached
                        ? "MAX"
                        : `${row.exp}/${row.expForNextLevel}`
                    }}
                  </span>
                </div>
              </td>
              <td class="tabular-nums text-ink-700">{{ row.coin }}</td>
              <td>
                <span
                  class="badge"
                  :class="
                    row.dikoUnlocked
                      ? 'bg-violet-100 text-violet-700'
                      : 'bg-ink-100 text-ink-500'
                  "
                >
                  {{ row.dikoUnlocked ? "해금" : "잠금" }}
                </span>
              </td>
              <td class="tabular-nums text-ink-500 text-xs">
                {{ formatDate(row.updatedAt) }}
              </td>
              <td class="text-right pr-4">
                <button
                  class="btn-outline px-3 py-1.5 text-xs"
                  @click="openEdit(row)"
                >
                  수정
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

    <Modal :open="!!editTarget" title="모찌 정보 수정" @close="closeEdit">
      <div v-if="editTarget" class="space-y-4 text-sm">
        <div class="rounded-lg bg-ink-50 p-3">
          <p class="text-ink-700 font-medium">
            {{ editTarget.groupRoomName }}
          </p>
          <p class="text-ink-400 text-xs">
            방장 <PiiText :value="editTarget.ownerName" /> · 그룹 ID
            {{ editTarget.groupRoomId }}
          </p>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label class="label">레벨 (1-20)</label>
            <input
              v-model.number="editLevel"
              type="number"
              min="1"
              max="20"
              class="input"
            />
            <p class="mt-1 text-xs text-ink-400">
              변경 시 단계·EXP 자동 정합.
            </p>
          </div>
          <div>
            <label class="label">경험치 (EXP)</label>
            <input
              v-model.number="editExp"
              type="number"
              min="0"
              class="input"
            />
            <p class="mt-1 text-xs text-ink-400">
              현재 레벨 내 경험치. 구간 밖은 자동 보정.
            </p>
          </div>
          <div>
            <label class="label">코인</label>
            <input
              v-model.number="editCoin"
              type="number"
              min="0"
              class="input"
            />
            <p class="mt-1 text-xs text-ink-400">절대값으로 덮어씁니다.</p>
          </div>
        </div>
        <label class="flex items-center gap-2 text-sm">
          <input
            v-model="editDikoUnlocked"
            type="checkbox"
            class="h-4 w-4 rounded"
          />
          디코 해금 상태
          <span class="text-xs text-ink-400">
            (Lv.10 이상이면 자동 해금)
          </span>
        </label>
        <p class="text-xs text-ink-400">
          변경된 필드만 서버에 전송됩니다 ·
          <span :class="hasChange ? 'text-emerald-600' : 'text-ink-400'">
            {{ hasChange ? "변경 있음" : "변경 없음" }}
          </span>
        </p>
        <div class="flex justify-end gap-2">
          <button class="btn-outline" @click="closeEdit">취소</button>
          <button
            class="btn-primary"
            :disabled="saving || !hasChange"
            @click="submitEdit"
          >
            {{ saving ? "저장 중..." : "저장" }}
          </button>
        </div>
      </div>
    </Modal>
  </div>
</template>
