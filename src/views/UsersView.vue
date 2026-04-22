<script setup lang="ts">
import { onMounted, ref } from "vue";
import { adminApi } from "@/api/admin";
import { extractErrorMessage } from "@/api/http";
import type { AdminUser, Role } from "@/types/api";
import Pagination from "@/components/ui/Pagination.vue";
import Modal from "@/components/ui/Modal.vue";
import { formatDate } from "@/utils/format";

const keyword = ref("");
const role = ref<Role | "">("");
const page = ref(0);
const size = ref(20);
const totalElements = ref(0);
const totalPages = ref(0);
const rows = ref<AdminUser[]>([]);
const loading = ref(false);
const errorMessage = ref<string | null>(null);

const editTarget = ref<AdminUser | null>(null);
const editRole = ref<Role>("USER");
const saving = ref(false);

async function load() {
  loading.value = true;
  errorMessage.value = null;
  try {
    const res = await adminApi.searchUsers({
      keyword: keyword.value || undefined,
      role: role.value || undefined,
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

function onSearch() {
  page.value = 0;
  load();
}

function openEdit(user: AdminUser) {
  editTarget.value = user;
  editRole.value = user.role;
}

async function submitEdit() {
  if (!editTarget.value) return;
  saving.value = true;
  try {
    await adminApi.updateUserRole(editTarget.value.userId, editRole.value);
    editTarget.value = null;
    await load();
  } catch (err) {
    errorMessage.value = extractErrorMessage(err, "권한 변경에 실패했습니다.");
  } finally {
    saving.value = false;
  }
}

onMounted(load);
</script>

<template>
  <div class="space-y-4">
    <div class="card p-4">
      <form class="grid grid-cols-1 md:grid-cols-4 gap-3" @submit.prevent="onSearch">
        <div class="md:col-span-2">
          <label class="label">키워드 (이름/이메일)</label>
          <input v-model="keyword" class="input" placeholder="검색어" />
        </div>
        <div>
          <label class="label">권한</label>
          <select v-model="role" class="input">
            <option value="">전체</option>
            <option value="USER">USER</option>
            <option value="ADMIN">ADMIN</option>
          </select>
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
              <th>소셜</th>
              <th>권한</th>
              <th>가입일시</th>
              <th class="w-24 text-right pr-4">작업</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="loading">
              <td colspan="6" class="text-center text-ink-400 py-8">불러오는 중...</td>
            </tr>
            <tr v-else-if="!rows.length">
              <td colspan="6" class="text-center text-ink-400 py-8">데이터가 없습니다.</td>
            </tr>
            <tr v-for="u in rows" :key="u.userId">
              <td class="font-medium text-ink-700">{{ u.name }}</td>
              <td class="text-ink-500">{{ u.email ?? "-" }}</td>
              <td class="text-ink-500 uppercase text-xs">{{ u.socialProvider }}</td>
              <td>
                <span
                  class="badge"
                  :class="
                    u.role === 'ADMIN'
                      ? 'bg-accent/10 text-accent'
                      : 'bg-ink-100 text-ink-600'
                  "
                >
                  {{ u.role }}
                </span>
              </td>
              <td class="tabular-nums text-ink-500">{{ formatDate(u.createdAt) }}</td>
              <td class="text-right pr-4">
                <button class="btn-outline px-3 py-1.5 text-xs" @click="openEdit(u)">
                  권한 변경
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

    <Modal
      :open="!!editTarget"
      title="사용자 권한 변경"
      @close="editTarget = null"
    >
      <div v-if="editTarget" class="space-y-4 text-sm">
        <div class="rounded-lg bg-ink-50 p-3">
          <p class="text-ink-700 font-medium">{{ editTarget.name }}</p>
          <p class="text-ink-400 text-xs">{{ editTarget.email ?? editTarget.userId }}</p>
        </div>
        <div>
          <label class="label">권한</label>
          <select v-model="editRole" class="input">
            <option value="USER">USER</option>
            <option value="ADMIN">ADMIN</option>
          </select>
        </div>
        <div class="flex justify-end gap-2">
          <button class="btn-outline" @click="editTarget = null">취소</button>
          <button class="btn-primary" :disabled="saving" @click="submitEdit">
            {{ saving ? "저장 중..." : "저장" }}
          </button>
        </div>
      </div>
    </Modal>
  </div>
</template>
