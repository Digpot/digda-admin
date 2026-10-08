<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { adminApi } from "@/api/admin";
import { extractErrorMessage } from "@/api/http";
import type { AdminGroupRoom } from "@/types/api";
import { REGION_GROUPS } from "@/data/regions";
import Pagination from "@/components/ui/Pagination.vue";
import Modal from "@/components/ui/Modal.vue";
import PiiText from "@/components/pii/PiiText.vue";
import { userPii } from "@/composables/usePiiReveal";

const keyword = ref("");
const page = ref(0);
const size = ref(20);
const totalElements = ref(0);
const totalPages = ref(0);
const rows = ref<AdminGroupRoom[]>([]);
const loading = ref(false);
const errorMessage = ref<string | null>(null);

const selected = ref<AdminGroupRoom | null>(null);
const filled = ref<Set<string>>(new Set());
const regionLoading = ref(false);
const busy = ref(false);

const allKeys = REGION_GROUPS.flatMap((g) => g.regions.map((r) => r.key));

async function load() {
  loading.value = true;
  errorMessage.value = null;
  try {
    const res = await adminApi.searchGroupRooms({
      keyword: keyword.value || undefined,
      page: page.value,
      size: size.value
    });
    rows.value = res.content;
    totalElements.value = res.totalElements;
    totalPages.value = res.totalPages;
  } catch (err) {
    errorMessage.value = extractErrorMessage(err, "그룹방 목록을 불러오지 못했습니다.");
  } finally {
    loading.value = false;
  }
}

function onSearch() {
  page.value = 0;
  load();
}

async function openManage(group: AdminGroupRoom) {
  selected.value = group;
  regionLoading.value = true;
  filled.value = new Set();
  try {
    const keys = await adminApi.getFilledRegions(group.groupRoomId);
    filled.value = new Set(keys);
  } catch (err) {
    errorMessage.value = extractErrorMessage(err, "채운 지역을 불러오지 못했습니다.");
  } finally {
    regionLoading.value = false;
  }
}

function closeManage() {
  selected.value = null;
}

async function run(fn: () => Promise<string[] | void>, applyEmpty = false) {
  if (busy.value || !selected.value) return;
  busy.value = true;
  try {
    const res = await fn();
    if (applyEmpty) filled.value = new Set();
    else if (res) filled.value = new Set(res);
  } catch (err) {
    errorMessage.value = extractErrorMessage(err, "지도 채움 변경에 실패했습니다.");
  } finally {
    busy.value = false;
  }
}

function toggleRegion(key: string) {
  const g = selected.value;
  if (!g) return;
  if (filled.value.has(key)) {
    run(() => adminApi.unfillRegions(g.groupRoomId, [key]));
  } else {
    run(() => adminApi.fillRegions(g.groupRoomId, [key]));
  }
}

function isGroupAllFilled(keys: string[]): boolean {
  return keys.length > 0 && keys.every((k) => filled.value.has(k));
}

function toggleGroupAll(keys: string[]) {
  const g = selected.value;
  if (!g) return;
  if (isGroupAllFilled(keys)) {
    run(() => adminApi.unfillRegions(g.groupRoomId, keys));
  } else {
    run(() => adminApi.fillRegions(g.groupRoomId, keys));
  }
}

function fillAll() {
  const g = selected.value;
  if (!g) return;
  run(() => adminApi.fillRegions(g.groupRoomId, allKeys));
}

function clearAll() {
  const g = selected.value;
  if (!g) return;
  run(() => adminApi.clearRegions(g.groupRoomId).then(() => undefined), true);
}

const filledCount = computed(() => filled.value.size);

onMounted(load);
</script>

<template>
  <div class="space-y-4">
    <div class="card p-4">
      <form class="grid grid-cols-1 md:grid-cols-4 gap-3" @submit.prevent="onSearch">
        <div class="md:col-span-3">
          <label class="label">그룹방 검색 (이름 / 방장)</label>
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
              <th>그룹방</th>
              <th>방장</th>
              <th class="w-32 text-right pr-4">지도</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="loading">
              <td colspan="3" class="text-center text-ink-400 py-8">불러오는 중...</td>
            </tr>
            <tr v-else-if="!rows.length">
              <td colspan="3" class="text-center text-ink-400 py-8">데이터가 없습니다.</td>
            </tr>
            <tr v-for="g in rows" :key="g.groupRoomId">
              <td class="font-medium text-ink-700">{{ g.name }}</td>
              <td class="text-ink-500"><PiiText :value="g.ownerName" :target="userPii(g.ownerId)" /></td>
              <td class="text-right pr-4">
                <button class="btn-outline px-3 py-1.5 text-xs" @click="openManage(g)">
                  지도 관리
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

    <Modal :open="!!selected" :title="`지도 채움 — ${selected?.name ?? ''}`" @close="closeManage">
      <div v-if="selected" class="space-y-4 text-sm">
        <div class="rounded-lg bg-ink-50 p-3 flex items-center justify-between gap-2">
          <div>
            <p class="text-ink-700 font-medium">{{ selected.name }}</p>
            <p class="text-ink-400 text-xs">채운 지역 {{ filledCount }}곳</p>
          </div>
          <div class="flex gap-2">
            <button class="btn-primary px-3 py-1.5 text-xs" :disabled="busy" @click="fillAll">
              전국 전체 채우기
            </button>
            <button
              class="px-3 py-1.5 text-xs rounded-lg bg-rose-50 text-rose-600 border border-rose-200"
              :disabled="busy"
              @click="clearAll"
            >
              모두 해제
            </button>
          </div>
        </div>

        <p v-if="regionLoading" class="text-ink-400">채운 지역 불러오는 중...</p>

        <div v-else class="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
          <div v-for="grp in REGION_GROUPS" :key="grp.group">
            <div class="flex items-center justify-between mb-2">
              <p class="font-semibold text-ink-700">{{ grp.group }}</p>
              <button
                class="text-xs text-accent hover:underline disabled:opacity-50"
                :disabled="busy"
                @click="toggleGroupAll(grp.regions.map((r) => r.key))"
              >
                {{ isGroupAllFilled(grp.regions.map((r) => r.key)) ? "전체 해제" : "전체 채우기" }}
              </button>
            </div>
            <div class="flex flex-wrap gap-1.5">
              <button
                v-for="r in grp.regions"
                :key="r.key"
                class="px-2.5 py-1 text-xs rounded-full border transition-colors disabled:opacity-50"
                :class="
                  filled.has(r.key)
                    ? 'bg-accent text-white border-accent'
                    : 'bg-white text-ink-600 border-ink-200 hover:border-accent'
                "
                :disabled="busy"
                @click="toggleRegion(r.key)"
              >
                {{ r.name }}
              </button>
            </div>
          </div>
        </div>

        <div class="flex justify-end">
          <button class="btn-outline" @click="closeManage">닫기</button>
        </div>
      </div>
    </Modal>
  </div>
</template>
