<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { adminApi } from "@/api/admin";
import { extractErrorMessage } from "@/api/http";
import type { AdminColumnInfo, AdminTableInfo, AdminTableRows } from "@/types/api";
import Pagination from "@/components/ui/Pagination.vue";
import { formatNumber } from "@/utils/format";

const tables = ref<AdminTableInfo[]>([]);
const selected = ref<string | null>(null);
const columns = ref<AdminColumnInfo[]>([]);
const rowData = ref<AdminTableRows | null>(null);
const page = ref(0);
const size = ref(20);
const orderBy = ref<string>("");
const direction = ref<"ASC" | "DESC">("ASC");
const loading = ref(false);
const errorMessage = ref<string | null>(null);
const filter = ref("");

const filteredTables = computed(() => {
  const q = filter.value.trim().toLowerCase();
  if (!q) return tables.value;
  return tables.value.filter((t) => t.tableName.toLowerCase().includes(q));
});

async function loadTables() {
  loading.value = true;
  errorMessage.value = null;
  try {
    tables.value = await adminApi.listTables();
  } catch (err) {
    errorMessage.value = extractErrorMessage(err);
  } finally {
    loading.value = false;
  }
}

async function selectTable(name: string) {
  selected.value = name;
  page.value = 0;
  orderBy.value = "";
  direction.value = "ASC";
  await loadDetail();
}

async function loadDetail() {
  if (!selected.value) return;
  loading.value = true;
  errorMessage.value = null;
  try {
    const [cols, rows] = await Promise.all([
      adminApi.listColumns(selected.value),
      adminApi.readRows(selected.value, {
        page: page.value,
        size: size.value,
        orderBy: orderBy.value || undefined,
        direction: orderBy.value ? direction.value : undefined
      })
    ]);
    columns.value = cols;
    rowData.value = rows;
  } catch (err) {
    errorMessage.value = extractErrorMessage(err);
  } finally {
    loading.value = false;
  }
}

function toggleSort(col: string) {
  if (orderBy.value === col) {
    direction.value = direction.value === "ASC" ? "DESC" : "ASC";
  } else {
    orderBy.value = col;
    direction.value = "ASC";
  }
  page.value = 0;
  loadDetail();
}

function renderCell(value: unknown): string {
  if (value === null || value === undefined) return "NULL";
  if (typeof value === "object") {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
  const s = String(value);
  return s.length > 80 ? `${s.slice(0, 80)}…` : s;
}

watch([page, size], () => {
  if (selected.value) loadDetail();
});

onMounted(loadTables);
</script>

<template>
  <div class="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4">
    <aside class="card p-3 h-fit sticky top-20">
      <input v-model="filter" class="input mb-3" placeholder="테이블 검색" />
      <div class="max-h-[70vh] overflow-y-auto">
        <ul class="space-y-0.5">
          <li v-for="t in filteredTables" :key="t.tableName">
            <button
              class="w-full text-left px-3 py-2 rounded-lg text-sm transition"
              :class="
                selected === t.tableName
                  ? 'bg-accent/10 text-accent font-semibold'
                  : 'text-ink-600 hover:bg-ink-50'
              "
              @click="selectTable(t.tableName)"
            >
              <div class="truncate">{{ t.tableName }}</div>
              <div class="text-xs text-ink-400">
                ~{{ formatNumber(t.approxRowCount) }} rows
              </div>
            </button>
          </li>
          <li v-if="!tables.length && !loading">
            <p class="text-sm text-ink-400 p-3">테이블이 없습니다.</p>
          </li>
        </ul>
      </div>
    </aside>

    <section class="min-w-0 space-y-4">
      <p v-if="errorMessage" class="text-sm text-rose-600">{{ errorMessage }}</p>

      <div v-if="!selected" class="card p-10 text-center text-ink-400 text-sm">
        좌측에서 테이블을 선택하세요.
      </div>

      <template v-else>
        <div class="card p-4">
          <h2 class="font-semibold text-ink-700 mb-3">
            컬럼 정의 <span class="text-ink-400 font-normal">({{ columns.length }}개)</span>
          </h2>
          <div class="overflow-x-auto">
            <table class="table-base">
              <thead>
                <tr>
                  <th>#</th>
                  <th>컬럼명</th>
                  <th>타입</th>
                  <th>NULL</th>
                  <th>기본값</th>
                  <th>키</th>
                  <th>주석</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="c in columns" :key="c.columnName">
                  <td class="text-ink-400">{{ c.ordinalPosition }}</td>
                  <td class="font-medium text-ink-700">{{ c.columnName }}</td>
                  <td class="text-ink-500 font-mono text-xs">{{ c.columnType }}</td>
                  <td>
                    <span v-if="c.nullable" class="badge bg-ink-100 text-ink-500">YES</span>
                    <span v-else class="badge bg-rose-50 text-rose-500">NO</span>
                  </td>
                  <td class="text-ink-500">{{ c.defaultValue ?? "-" }}</td>
                  <td>
                    <span
                      v-if="c.columnKey"
                      class="badge bg-accent/10 text-accent font-mono text-[10px]"
                    >
                      {{ c.columnKey }}
                    </span>
                    <span v-else class="text-ink-400">-</span>
                  </td>
                  <td class="text-ink-500">{{ c.comment ?? "-" }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div class="card p-4">
          <div class="flex items-center justify-between mb-3">
            <h2 class="font-semibold text-ink-700">
              데이터
              <span v-if="rowData" class="text-ink-400 font-normal">
                ({{ formatNumber(rowData.totalElements) }}행)
              </span>
            </h2>
            <div class="text-xs text-ink-400">
              헤더 클릭 시 정렬 · size 최대 200
            </div>
          </div>
          <div class="overflow-x-auto">
            <table class="table-base" v-if="rowData">
              <thead>
                <tr>
                  <th
                    v-for="col in rowData.columns"
                    :key="col"
                    class="cursor-pointer select-none"
                    @click="toggleSort(col)"
                  >
                    {{ col }}
                    <span v-if="orderBy === col" class="text-accent ml-1">
                      {{ direction === "ASC" ? "▲" : "▼" }}
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="!rowData.rows.length">
                  <td :colspan="rowData.columns.length" class="text-center text-ink-400 py-8">
                    데이터가 없습니다.
                  </td>
                </tr>
                <tr v-for="(row, i) in rowData.rows" :key="i">
                  <td
                    v-for="col in rowData.columns"
                    :key="col"
                    class="font-mono text-xs text-ink-600 whitespace-nowrap max-w-xs overflow-hidden text-ellipsis"
                  >
                    {{ renderCell(row[col]) }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <Pagination
            v-if="rowData"
            :page="rowData.page"
            :total-pages="rowData.totalPages"
            :total-elements="rowData.totalElements"
            @change="
              (p) => {
                page = p;
              }
            "
          />
        </div>
      </template>
    </section>
  </div>
</template>
