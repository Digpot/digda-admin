<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { adminApi } from "@/api/admin";
import { extractErrorMessage } from "@/api/http";
import type { AdminColumnInfo, AdminTableInfo, AdminTableRows } from "@/types/api";
import Pagination from "@/components/ui/Pagination.vue";
import Modal from "@/components/ui/Modal.vue";
import { formatNumber } from "@/utils/format";
import PiiText from "@/components/pii/PiiText.vue";
import type { PiiTarget } from "@/types/api";
import { LockClosedIcon } from "@heroicons/vue/24/outline";
import { requestAdminPassword } from "@/composables/usePasswordGate";

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

const editorOpen = ref(false);
const editorMode = ref<"create" | "edit">("create");
const editorValues = ref<Record<string, string>>({});
const editorOriginalPk = ref<Record<string, string>>({});
// 수정 모드에서 처음 채워 둔 값. 저장 때 이것과 달라진 칸만 보낸다 —
// 마스킹된 값(ch******@naver.com, [REDACTED])이 원문을 덮어쓰지 않게.
const editorInitialValues = ref<Record<string, string>>({});
const editorBusy = ref(false);
const editorError = ref<string | null>(null);

const maskedColumns = computed(() => new Set(rowData.value?.maskedColumns ?? []));

/** 마스킹된 칸의 원문 열람 대상 — PK 가 없는 테이블은 행을 특정할 수 없어 열람 불가. */
function rowPiiTarget(row: Record<string, unknown>): PiiTarget | null {
  if (!selected.value || pkColumns.value.length === 0) return null;
  return {
    targetType: "DB_ROW",
    table: selected.value,
    pk: Object.fromEntries(pkColumns.value.map((c) => [c, valueToInput(row[c])]))
  };
}

const pkColumns = computed(() => columns.value.filter((c) => c.columnKey === "PRI").map((c) => c.columnName));

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

function valueToInput(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "object") {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
  return String(value);
}

function openCreate() {
  editorMode.value = "create";
  editorValues.value = Object.fromEntries(columns.value.map((c) => [c.columnName, ""]));
  editorOriginalPk.value = {};
  editorError.value = null;
  editorOpen.value = true;
}

function openEdit(row: Record<string, unknown>) {
  editorMode.value = "edit";
  editorValues.value = Object.fromEntries(
    columns.value.map((c) => [c.columnName, valueToInput(row[c.columnName])])
  );
  editorOriginalPk.value = Object.fromEntries(
    pkColumns.value.map((pk) => [pk, valueToInput(row[pk])])
  );
  editorInitialValues.value = { ...editorValues.value };
  editorError.value = null;
  editorOpen.value = true;
}

function buildValuesPayload(): Record<string, string | null> {
  const out: Record<string, string | null> = {};
  for (const [k, v] of Object.entries(editorValues.value)) {
    out[k] = v === "" ? null : v;
  }
  return out;
}

async function saveEditor() {
  if (!selected.value) return;
  editorBusy.value = true;
  editorError.value = null;
  try {
    if (editorMode.value === "create") {
      await adminApi.insertRow(selected.value, { values: buildValuesPayload() });
    } else {
      const updateValues = { ...buildValuesPayload() };
      // PK는 update 페이로드에서 제거 (백엔드도 제외하지만 명시적으로)
      for (const pk of pkColumns.value) delete updateValues[pk];
      // 손대지 않은 칸은 보내지 않는다(마스킹 값 덮어쓰기 방지 — 서버도 한 번 더 거른다).
      for (const k of Object.keys(updateValues)) {
        if (editorValues.value[k] === editorInitialValues.value[k]) delete updateValues[k];
      }
      if (Object.keys(updateValues).length === 0) {
        editorOpen.value = false;
        return;
      }
      await adminApi.updateRow(selected.value, editorOriginalPk.value, { values: updateValues });
    }
    editorOpen.value = false;
    await loadDetail();
  } catch (err) {
    editorError.value = extractErrorMessage(err);
  } finally {
    editorBusy.value = false;
  }
}

async function deleteRow(row: Record<string, unknown>) {
  if (!selected.value) return;
  if (pkColumns.value.length === 0) {
    alert("PK가 없는 테이블은 삭제할 수 없습니다.");
    return;
  }
  if (!confirm("이 행을 삭제하시겠습니까?")) return;
  const pk = Object.fromEntries(pkColumns.value.map((c) => [c, valueToInput(row[c])]));
  try {
    await adminApi.deleteRow(selected.value, pk);
    await loadDetail();
  } catch (err) {
    errorMessage.value = extractErrorMessage(err);
  }
}

watch([page, size], () => {
  if (selected.value) loadDetail();
});

// ── 잠금 ──
// DB 탭은 전 테이블을 읽고 쓸 수 있어서 들어올 때마다 관리자 비밀번호를 다시 묻는다.
// 풀린 상태는 이 화면에만 있다 — 다른 탭으로 나갔다 오거나 10분이 지나면 다시 잠긴다.
const UNLOCK_MS = 10 * 60 * 1000;
const unlocked = ref(false);
let relockTimer: ReturnType<typeof setTimeout> | null = null;

function lock() {
  unlocked.value = false;
  tables.value = [];
  selected.value = null;
  columns.value = [];
  rowData.value = null;
  editorOpen.value = false;
  if (relockTimer) clearTimeout(relockTimer);
  relockTimer = null;
}

async function unlock() {
  const ok = await requestAdminPassword({
    title: "DB 테이블 조회",
    description: "DB 테이블은 모든 데이터를 읽고 수정할 수 있습니다. 관리자 비밀번호를 다시 입력해 주세요."
  });
  if (!ok) return;
  unlocked.value = true;
  if (relockTimer) clearTimeout(relockTimer);
  relockTimer = setTimeout(lock, UNLOCK_MS);
  await loadTables();
}

onMounted(unlock);
onBeforeUnmount(lock);
</script>

<template>
  <div v-if="!unlocked" class="card mx-auto mt-10 max-w-md p-8 text-center space-y-4">
    <LockClosedIcon class="mx-auto h-10 w-10 text-ink-300" aria-hidden="true" />
    <div>
      <p class="text-base font-semibold text-ink-700">잠겨 있는 화면입니다</p>
      <p class="mt-1 text-sm text-ink-500">관리자 비밀번호를 다시 확인해야 DB 테이블을 볼 수 있습니다.</p>
    </div>
    <button type="button" class="btn-primary" @click="unlock">비밀번호 입력</button>
  </div>
  <div v-else class="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4">
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
            <div class="flex items-center gap-2">
              <span class="text-xs text-ink-400">헤더 클릭 시 정렬</span>
              <button class="btn-primary text-xs" @click="openCreate">+ 행 추가</button>
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
                  <th class="w-32 text-right">작업</th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="!rowData.rows.length">
                  <td :colspan="rowData.columns.length + 1" class="text-center text-ink-400 py-8">
                    데이터가 없습니다.
                  </td>
                </tr>
                <tr v-for="(row, i) in rowData.rows" :key="i">
                  <td
                    v-for="col in rowData.columns"
                    :key="col"
                    class="font-mono text-xs text-ink-600 whitespace-nowrap max-w-xs overflow-hidden text-ellipsis"
                  >
                    <PiiText
                      v-if="maskedColumns.has(col) && row[col] !== null && row[col] !== '[REDACTED]'"
                      :value="renderCell(row[col])"
                      :target="rowPiiTarget(row)"
                    />
                    <template v-else>{{ renderCell(row[col]) }}</template>
                  </td>
                  <td class="text-right whitespace-nowrap">
                    <button class="btn-ghost text-xs" @click="openEdit(row)">수정</button>
                    <button
                      class="btn-ghost text-xs text-rose-500 hover:bg-rose-50"
                      @click="deleteRow(row)"
                    >
                      삭제
                    </button>
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

    <Modal
      :open="editorOpen"
      :title="editorMode === 'create' ? '행 추가' : '행 수정'"
      @close="editorOpen = false"
    >
      <div class="space-y-3 max-h-[70vh] overflow-y-auto">
        <div v-for="c in columns" :key="c.columnName">
          <label class="label flex items-center gap-2">
            <span>{{ c.columnName }}</span>
            <span v-if="c.columnKey" class="badge bg-accent/10 text-accent text-[10px]">
              {{ c.columnKey }}
            </span>
            <span class="text-ink-400 font-normal text-[11px] font-mono">{{ c.columnType }}</span>
          </label>
          <input
            v-model="editorValues[c.columnName]"
            class="input"
            :placeholder="c.nullable ? '비우면 NULL' : ''"
            :disabled="editorMode === 'edit' && c.columnKey === 'PRI'"
          />
        </div>
        <p v-if="editorError" class="text-sm text-rose-600">{{ editorError }}</p>
      </div>
      <div class="flex justify-end gap-2 pt-3 border-t border-ink-100 mt-3">
        <button type="button" class="btn-ghost" @click="editorOpen = false">취소</button>
        <button type="button" class="btn-primary" :disabled="editorBusy" @click="saveEditor">
          {{ editorBusy ? "저장 중..." : "저장" }}
        </button>
      </div>
    </Modal>
  </div>
</template>
