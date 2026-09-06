<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { adminApi } from "@/api/admin";
import { extractErrorMessage } from "@/api/http";
import Modal from "@/components/ui/Modal.vue";
import Pagination from "@/components/ui/Pagination.vue";
import { formatDate, formatNumber } from "@/utils/format";
import type { CoinGrant, ExpEvent } from "@/types/api";

// ── 경험치 배수 이벤트 ──
const enabled = ref(false);
const title = ref("");
const multiplier = ref(2);
const startAt = ref("");
const endAt = ref("");
const applied = ref<ExpEvent | null>(null);

const expLoading = ref(false);
const expSaving = ref(false);
const expError = ref<string | null>(null);
const expSavedAt = ref<string | null>(null);

/** 서버는 naive LocalDateTime("2026-09-24T00:00:00") 을 주고받는다 — datetime-local 은 분까지만. */
function toInput(value: string | null): string {
  return value ? value.slice(0, 16) : "";
}
function toServer(value: string): string | null {
  return value ? `${value}:00` : null;
}

function applyExp(e: ExpEvent) {
  applied.value = e;
  enabled.value = e.enabled;
  title.value = e.title;
  multiplier.value = e.multiplier;
  startAt.value = toInput(e.startAt);
  endAt.value = toInput(e.endAt);
}

/** 저장된 설정 기준 상태 배지 — 지금 배수가 먹는 중인지는 서버가 내려준 active 를 그대로 믿는다. */
const expStatus = computed(() => {
  const e = applied.value;
  if (!e || !e.enabled) return { label: "꺼짐", cls: "bg-ink-100 text-ink-500" };
  if (e.active) {
    return { label: `진행 중 · ${e.appliedMultiplier}배`, cls: "bg-emerald-100 text-emerald-700" };
  }
  if (e.startAt && new Date(e.startAt) > new Date()) {
    return { label: "예약됨", cls: "bg-sky-100 text-sky-700" };
  }
  return { label: "기간 종료", cls: "bg-amber-100 text-amber-700" };
});

/** 켜져 있는데 배수가 1배면 아무 일도 일어나지 않는다 — 서버도 400 으로 막는다. */
const expInvalid = computed(() => enabled.value && multiplier.value <= 1);
const periodInvalid = computed(
  () => !!startAt.value && !!endAt.value && endAt.value <= startAt.value
);

/** 지금부터 N일 — 시작/종료를 한 번에 채운다(로컬 시간 = KST 운영 PC 기준). */
function setDuration(days: number) {
  const pad = (n: number) => String(n).padStart(2, "0");
  const fmt = (d: Date) =>
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(
      d.getMinutes()
    )}`;
  const now = new Date();
  startAt.value = fmt(now);
  endAt.value = fmt(new Date(now.getTime() + days * 24 * 60 * 60 * 1000));
}

async function loadExp() {
  expLoading.value = true;
  expError.value = null;
  try {
    applyExp(await adminApi.getExpEvent());
  } catch (err) {
    expError.value = extractErrorMessage(err, "이벤트 설정을 불러오지 못했습니다.");
  } finally {
    expLoading.value = false;
  }
}

async function saveExp() {
  if (expInvalid.value || periodInvalid.value) return;
  expSaving.value = true;
  expError.value = null;
  try {
    applyExp(
      await adminApi.updateExpEvent({
        enabled: enabled.value,
        title: title.value,
        multiplier: multiplier.value,
        startAt: toServer(startAt.value),
        endAt: toServer(endAt.value)
      })
    );
    expSavedAt.value = new Date().toLocaleTimeString("ko-KR", { timeZone: "Asia/Seoul" });
  } catch (err) {
    expError.value = extractErrorMessage(err, "저장에 실패했습니다.");
  } finally {
    expSaving.value = false;
  }
}

// ── 코인 전체 지급 ──
const amount = ref(500);
const reason = ref("");
const notify = ref(true);
const notificationTitle = ref("");
const notificationBody = ref("");

const confirmOpen = ref(false);
const granting = ref(false);
const grantError = ref<string | null>(null);
const lastGrant = ref<CoinGrant | null>(null);

const grants = ref<CoinGrant[]>([]);
const page = ref(0);
const totalPages = ref(0);
const totalElements = ref(0);
const historyLoading = ref(false);

const grantInvalid = computed(
  () =>
    amount.value < 1 ||
    amount.value > 100000 ||
    (notify.value && (!notificationTitle.value.trim() || !notificationBody.value.trim()))
);

async function loadHistory() {
  historyLoading.value = true;
  try {
    const res = await adminApi.searchCoinGrants({ page: page.value, size: 10 });
    grants.value = res.content;
    totalPages.value = res.totalPages;
    totalElements.value = res.totalElements;
  } catch (err) {
    grantError.value = extractErrorMessage(err, "지급 이력을 불러오지 못했습니다.");
  } finally {
    historyLoading.value = false;
  }
}

function changePage(next: number) {
  page.value = next;
  loadHistory();
}

async function grant() {
  granting.value = true;
  grantError.value = null;
  try {
    lastGrant.value = await adminApi.grantCoin({
      amount: amount.value,
      reason: reason.value,
      notify: notify.value,
      notificationTitle: notify.value ? notificationTitle.value : undefined,
      notificationBody: notify.value ? notificationBody.value : undefined
    });
    confirmOpen.value = false;
    page.value = 0;
    await loadHistory();
  } catch (err) {
    grantError.value = extractErrorMessage(err, "지급에 실패했습니다.");
  } finally {
    granting.value = false;
  }
}

onMounted(() => {
  loadExp();
  loadHistory();
});
</script>

<template>
  <div class="space-y-4 max-w-3xl">
    <!-- 경험치 배수 이벤트 -->
    <div class="card p-5 space-y-4">
      <div class="flex items-center justify-between gap-3">
        <div>
          <div class="flex items-center gap-2">
            <h2 class="font-semibold text-ink-800">모찌 경험치 배수 이벤트</h2>
            <span class="badge text-[10px]" :class="expStatus.cls">{{ expStatus.label }}</span>
          </div>
          <p class="text-xs text-ink-400 mt-0.5">
            켜져 있고 기간 안이면 <b>일기 작성 · 퀴즈 정답</b> 경험치에 배수가 곱해집니다. 코인은
            배수 대상이 아닙니다.
          </p>
        </div>
        <label class="flex items-center gap-2 text-sm text-ink-600 shrink-0">
          <input v-model="enabled" type="checkbox" class="h-4 w-4 rounded" />
          이벤트 켜기
        </label>
      </div>

      <div>
        <label class="label">앱 배너 문구</label>
        <input
          v-model="title"
          class="input"
          maxlength="100"
          placeholder="예) 🌕 추석 맞이 모찌 경험치 2배!"
        />
        <p class="mt-1 text-xs text-ink-400">{{ title.length }}/100</p>
      </div>

      <div>
        <label class="label">경험치 배수</label>
        <div class="flex items-center gap-2">
          <input
            v-model.number="multiplier"
            type="number"
            class="input w-32"
            min="1"
            max="10"
            step="0.5"
          />
          <button
            v-for="m in [1.5, 2, 3]"
            :key="m"
            type="button"
            class="px-3 py-1.5 text-sm font-medium rounded-lg border"
            :class="
              multiplier === m
                ? 'border-accent bg-accent/10 text-accent'
                : 'border-ink-200 text-ink-500 hover:bg-ink-100'
            "
            @click="multiplier = m"
          >
            {{ m }}배
          </button>
        </div>
        <p v-if="expInvalid" class="mt-1 text-xs text-rose-600">
          이벤트를 켜려면 배수가 1배보다 커야 합니다.
        </p>
      </div>

      <div class="grid gap-3 sm:grid-cols-2">
        <div>
          <label class="label">시작 (비우면 제한 없음)</label>
          <input v-model="startAt" type="datetime-local" class="input" />
        </div>
        <div>
          <label class="label">종료 (비우면 제한 없음)</label>
          <input v-model="endAt" type="datetime-local" class="input" />
        </div>
      </div>
      <div class="flex items-center gap-2">
        <span class="text-xs text-ink-400">지금부터</span>
        <button
          v-for="d in [3, 7, 14]"
          :key="d"
          type="button"
          class="btn-outline px-3 py-1.5 text-xs"
          @click="setDuration(d)"
        >
          {{ d }}일
        </button>
      </div>
      <p v-if="periodInvalid" class="text-xs text-rose-600">종료는 시작보다 뒤여야 합니다.</p>

      <p v-if="expError" class="text-sm text-rose-600">{{ expError }}</p>

      <div class="flex items-center gap-3">
        <button
          class="btn-primary"
          :disabled="expSaving || expLoading || expInvalid || periodInvalid"
          @click="saveExp"
        >
          {{ expSaving ? "저장 중..." : "저장" }}
        </button>
        <span v-if="expSavedAt" class="text-xs text-emerald-600">저장됨 · {{ expSavedAt }}</span>
      </div>
    </div>

    <!-- 코인 전체 지급 -->
    <div class="card p-5 space-y-4">
      <div>
        <h2 class="font-semibold text-ink-800">코인 전체 지급</h2>
        <p class="text-xs text-ink-400 mt-0.5">
          살아있는 <b>모든 그룹의 모찌</b>에 그룹당 코인을 지급합니다. 코인은 그룹 공용 지갑이라
          그룹원 수와 무관하게 그룹당 한 번 들어갑니다.
          <b class="text-rose-600">되돌릴 수 없습니다.</b>
        </p>
      </div>

      <div class="grid gap-3 sm:grid-cols-2">
        <div>
          <label class="label">그룹당 지급 코인</label>
          <input v-model.number="amount" type="number" class="input" min="1" max="100000" />
        </div>
        <div>
          <label class="label">운영 메모 (이력에 남습니다)</label>
          <input
            v-model="reason"
            class="input"
            maxlength="200"
            placeholder="예) 2026 추석 이벤트"
          />
        </div>
      </div>

      <label class="flex items-center gap-2 text-sm text-ink-600">
        <input v-model="notify" type="checkbox" class="h-4 w-4 rounded" />
        지급과 함께 전체 공지 푸시 보내기
      </label>
      <div v-if="notify" class="grid gap-3">
        <div>
          <label class="label">공지 제목</label>
          <input
            v-model="notificationTitle"
            class="input"
            maxlength="100"
            placeholder="예) 추석 선물이 도착했어요 🌕"
          />
        </div>
        <div>
          <label class="label">공지 본문</label>
          <textarea
            v-model="notificationBody"
            class="input h-auto py-2.5"
            rows="2"
            maxlength="1000"
            placeholder="예) 모찌에게 코인 500개를 선물했어요. 지금 확인해 보세요!"
          ></textarea>
        </div>
      </div>

      <p v-if="grantError" class="text-sm text-rose-600">{{ grantError }}</p>
      <p v-if="lastGrant" class="text-sm text-emerald-600">
        모찌 {{ formatNumber(lastGrant.targetCount) }}마리에 코인
        {{ formatNumber(lastGrant.amount) }}개를 지급했습니다.
      </p>

      <button class="btn-primary" :disabled="grantInvalid" @click="confirmOpen = true">
        코인 전체 지급
      </button>
      <p v-if="grantInvalid" class="text-xs text-ink-400">
        지급 코인은 1 ~ 100,000 사이여야 하고, 공지를 보내려면 제목과 본문이 필요합니다.
      </p>
    </div>

    <!-- 지급 이력 -->
    <div class="card overflow-hidden">
      <div class="px-5 pt-5">
        <h2 class="font-semibold text-ink-800">지급 이력</h2>
        <p class="text-xs text-ink-400 mt-0.5">같은 이벤트를 두 번 쏘지 않았는지 확인하세요.</p>
      </div>
      <div class="overflow-x-auto mt-3">
        <table class="table-base">
          <thead>
            <tr>
              <th class="w-40">지급 시각</th>
              <th class="w-24 text-right">코인</th>
              <th class="w-24 text-right">대상 모찌</th>
              <th>메모</th>
              <th class="w-20">공지</th>
              <th class="w-28">실행</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="historyLoading">
              <td colspan="6" class="text-center text-ink-400 py-8">불러오는 중...</td>
            </tr>
            <tr v-else-if="!grants.length">
              <td colspan="6" class="text-center text-ink-400 py-8">지급 이력이 없습니다.</td>
            </tr>
            <tr v-for="g in grants" :key="g.coinGrantId">
              <td class="tabular-nums text-ink-500">{{ formatDate(g.createdAt) }}</td>
              <td class="text-right tabular-nums font-semibold">{{ formatNumber(g.amount) }}</td>
              <td class="text-right tabular-nums">{{ formatNumber(g.targetCount) }}</td>
              <td class="text-ink-500">{{ g.reason || "-" }}</td>
              <td>
                <span
                  class="badge text-[10px]"
                  :class="g.notified ? 'bg-sky-100 text-sky-600' : 'bg-ink-100 text-ink-500'"
                >
                  {{ g.notified ? "발송" : "없음" }}
                </span>
              </td>
              <td class="text-ink-500">{{ g.grantedBy }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="px-5">
        <Pagination
          :page="page"
          :total-pages="totalPages"
          :total-elements="totalElements"
          @change="changePage"
        />
      </div>
    </div>

    <Modal :open="confirmOpen" title="코인 전체 지급" @close="confirmOpen = false">
      <div class="space-y-3 text-sm text-ink-600">
        <p>
          살아있는 모든 그룹의 모찌에 코인
          <b class="text-ink-800">{{ formatNumber(amount) }}개</b>씩 지급합니다.
          <template v-if="notify"> 전체 공지 푸시도 함께 발송됩니다.</template>
        </p>
        <p class="text-rose-600 font-medium">
          되돌릴 수 없습니다. 회수하려면 모찌를 하나씩 보정해야 합니다.
        </p>
        <p v-if="grantError" class="text-rose-600">{{ grantError }}</p>
        <div class="flex justify-end gap-2 pt-1">
          <button class="btn-outline" :disabled="granting" @click="confirmOpen = false">
            취소
          </button>
          <button class="btn-primary" :disabled="granting" @click="grant">
            {{ granting ? "지급 중..." : "지급하기" }}
          </button>
        </div>
      </div>
    </Modal>
  </div>
</template>
