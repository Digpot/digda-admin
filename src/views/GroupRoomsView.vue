<script setup lang="ts">
import { onMounted, ref } from "vue";
import { adminApi } from "@/api/admin";
import { extractErrorMessage } from "@/api/http";
import type { AdminGroupRoom, GroupRoomAction } from "@/types/api";
import Pagination from "@/components/ui/Pagination.vue";
import Modal from "@/components/ui/Modal.vue";
import { formatDate } from "@/utils/format";

const keyword = ref("");
const includeDeleted = ref(true);
const page = ref(0);
const size = ref(20);
const totalElements = ref(0);
const totalPages = ref(0);
const rows = ref<AdminGroupRoom[]>([]);
const loading = ref(false);
const errorMessage = ref<string | null>(null);

const target = ref<AdminGroupRoom | null>(null);
const action = ref<GroupRoomAction>("SCHEDULE_DELETE");
const saving = ref(false);

async function load() {
  loading.value = true;
  errorMessage.value = null;
  try {
    const res = await adminApi.searchGroupRooms({
      keyword: keyword.value || undefined,
      includeDeleted: includeDeleted.value,
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

function statusBadge(room: AdminGroupRoom) {
  if (room.deletedAt) return { label: "DELETED", cls: "bg-ink-200 text-ink-600" };
  if (room.deleteScheduledAt) return { label: "삭제 예약", cls: "bg-amber-100 text-amber-700" };
  return { label: "ACTIVE", cls: "bg-emerald-100 text-emerald-700" };
}

function openAction(room: AdminGroupRoom, a: GroupRoomAction) {
  target.value = room;
  action.value = a;
}

async function submit() {
  if (!target.value) return;
  saving.value = true;
  try {
    await adminApi.changeGroupRoomStatus(target.value.groupRoomId, action.value);
    target.value = null;
    await load();
  } catch (err) {
    errorMessage.value = extractErrorMessage(err, "상태 변경에 실패했습니다.");
  } finally {
    saving.value = false;
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
        <div class="md:col-span-2">
          <label class="label">키워드 (그룹방 이름)</label>
          <input v-model="keyword" class="input" placeholder="검색어" />
        </div>
        <label class="flex items-center gap-2 text-sm text-ink-600 md:self-end h-10">
          <input v-model="includeDeleted" type="checkbox" class="h-4 w-4 rounded" />
          삭제된 그룹방 포함
        </label>
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
              <th>방장</th>
              <th>상태</th>
              <th>최근 활동</th>
              <th>생성</th>
              <th class="text-right pr-4 w-72">작업</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="loading">
              <td colspan="6" class="text-center text-ink-400 py-8">불러오는 중...</td>
            </tr>
            <tr v-else-if="!rows.length">
              <td colspan="6" class="text-center text-ink-400 py-8">데이터가 없습니다.</td>
            </tr>
            <tr v-for="room in rows" :key="room.groupRoomId">
              <td class="font-medium text-ink-700">{{ room.name }}</td>
              <td class="text-ink-500">{{ room.ownerName }}</td>
              <td>
                <span class="badge" :class="statusBadge(room).cls">
                  {{ statusBadge(room).label }}
                </span>
              </td>
              <td class="tabular-nums text-ink-500">{{ formatDate(room.lastActivityAt) }}</td>
              <td class="tabular-nums text-ink-500">{{ formatDate(room.createdAt) }}</td>
              <td class="text-right pr-4 space-x-1.5">
                <button
                  class="btn-outline px-2.5 py-1.5 text-xs"
                  @click="openAction(room, 'RECOVER')"
                >
                  복구
                </button>
                <button
                  class="btn-outline px-2.5 py-1.5 text-xs"
                  @click="openAction(room, 'SCHEDULE_DELETE')"
                >
                  삭제 예약
                </button>
                <button
                  class="btn-outline px-2.5 py-1.5 text-xs !text-rose-600 hover:!bg-rose-50"
                  @click="openAction(room, 'HARD_DELETE')"
                >
                  즉시 삭제
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

    <Modal :open="!!target" title="그룹방 상태 변경" @close="target = null">
      <div v-if="target" class="space-y-4 text-sm">
        <div class="rounded-lg bg-ink-50 p-3">
          <p class="text-ink-700 font-medium">{{ target.name }}</p>
          <p class="text-ink-400 text-xs">방장 {{ target.ownerName }} · ID {{ target.groupRoomId }}</p>
        </div>
        <p class="text-ink-600">
          다음 작업을 실행합니다:
          <span class="font-semibold text-ink-800">{{ action }}</span>
        </p>
        <p v-if="action === 'HARD_DELETE'" class="text-xs text-rose-600">
          * HARD_DELETE 는 즉시 삭제 플래그를 세팅하며 되돌릴 수 없습니다.
        </p>
        <div class="flex justify-end gap-2">
          <button class="btn-outline" @click="target = null">취소</button>
          <button class="btn-primary" :disabled="saving" @click="submit">
            {{ saving ? "처리 중..." : "실행" }}
          </button>
        </div>
      </div>
    </Modal>
  </div>
</template>
