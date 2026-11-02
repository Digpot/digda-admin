<script setup lang="ts">
import { computed, ref } from "vue";
import { adminApi } from "@/api/admin";
import { extractErrorMessage } from "@/api/http";
import Modal from "@/components/ui/Modal.vue";
import type { HighlightRunResult } from "@/types/api";

/** 기본값 = 지난달(KST 기준). 서버도 month 가 비면 지난달로 처리한다. */
function lastMonthKst(): string {
  const kst = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Seoul" }));
  kst.setDate(1);
  kst.setMonth(kst.getMonth() - 1);
  return `${kst.getFullYear()}-${String(kst.getMonth() + 1).padStart(2, "0")}`;
}

const month = ref(lastMonthKst());
const groupRoomId = ref<number | null>(null);
const regenerate = ref(false);
const notify = ref(true);
const resendOnly = ref(false);

const confirmOpen = ref(false);
const running = ref(false);
const error = ref<string | null>(null);
const result = ref<HighlightRunResult | null>(null);

const invalid = computed(() => !/^\d{4}-(0[1-9]|1[0-2])$/.test(month.value));

const scopeLabel = computed(() =>
  groupRoomId.value ? `그룹 #${groupRoomId.value}` : "일기가 있는 전체 그룹"
);

async function run() {
  running.value = true;
  error.value = null;
  try {
    result.value = await adminApi.generateHighlights({
      month: month.value,
      groupRoomId: groupRoomId.value || undefined,
      regenerate: regenerate.value,
      notify: regenerate.value ? false : notify.value
    });
    confirmOpen.value = false;
  } catch (err) {
    error.value = extractErrorMessage(err, "하이라이트 생성에 실패했습니다.");
  } finally {
    running.value = false;
  }
}
</script>

<template>
  <div class="space-y-4 max-w-3xl">
    <div class="card p-5 space-y-4">
      <div>
        <h2 class="font-semibold text-ink-800">월간 하이라이트 수동 생성</h2>
        <p class="text-xs text-ink-400 mt-0.5">
          매월 1일 00:00(KST)에 자동으로 만들어지는 "지난달의 디그팟"을 지금 바로 실행합니다. 일기가
          없는 그룹은 만들지 않고, 이미 있는 그룹은 건너뜁니다.
        </p>
      </div>

      <div class="grid gap-3 sm:grid-cols-2">
        <div>
          <label class="label">대상 월 (yyyy-MM)</label>
          <input v-model="month" class="input" placeholder="2026-10" maxlength="7" />
          <p v-if="invalid" class="mt-1 text-xs text-rose-600">yyyy-MM 형식으로 입력하세요.</p>
          <p v-else class="mt-1 text-xs text-ink-400">이번 달 이후는 만들 수 없습니다.</p>
        </div>
        <div>
          <label class="label">그룹방 ID (비우면 전체)</label>
          <input
            v-model.number="groupRoomId"
            type="number"
            min="1"
            class="input"
            placeholder="전체 그룹"
          />
        </div>
      </div>

      <div class="space-y-2">
        <label class="flex items-center gap-2 text-sm text-ink-600">
          <input v-model="resendOnly" type="checkbox" class="h-4 w-4 rounded" />
          생성하지 않고, 이미 만들어진 하이라이트의 <b>알림만 다시 보내기</b>
        </label>
        <label class="flex items-center gap-2 text-sm text-ink-600">
          <input v-model="regenerate" type="checkbox" class="h-4 w-4 rounded" :disabled="resendOnly" />
          이미 있는 하이라이트도 지우고 다시 만들기
        </label>
        <label
          class="flex items-center gap-2 text-sm"
          :class="regenerate ? 'text-ink-300' : 'text-ink-600'"
        >
          <input v-model="notify" type="checkbox" class="h-4 w-4 rounded" :disabled="regenerate" />
          새로 만든 그룹에 알림 보내기
          <span v-if="regenerate" class="text-xs">(재생성 시에는 알림을 보내지 않음)</span>
        </label>
      </div>

      <div class="flex justify-end">
        <button class="btn-primary" :disabled="invalid" @click="confirmOpen = true">
          하이라이트 생성
        </button>
      </div>
    </div>

    <div v-if="result" class="card p-5 space-y-2">
      <h3 class="font-semibold text-ink-800">실행 결과 · {{ result.month }}</h3>
      <div class="grid grid-cols-4 gap-3 text-center">
        <div class="rounded-lg bg-ink-50 p-3">
          <div class="text-xs text-ink-400">대상 그룹</div>
          <div class="text-lg font-semibold text-ink-800">{{ result.targetGroups }}</div>
        </div>
        <div class="rounded-lg bg-emerald-50 p-3">
          <div class="text-xs text-emerald-600">생성</div>
          <div class="text-lg font-semibold text-emerald-700">{{ result.created }}</div>
        </div>
        <div class="rounded-lg bg-ink-50 p-3">
          <div class="text-xs text-ink-400">건너뜀</div>
          <div class="text-lg font-semibold text-ink-800">{{ result.skipped }}</div>
        </div>
        <div class="rounded-lg p-3" :class="result.failed ? 'bg-rose-50' : 'bg-ink-50'">
          <div class="text-xs" :class="result.failed ? 'text-rose-600' : 'text-ink-400'">실패</div>
          <div
            class="text-lg font-semibold"
            :class="result.failed ? 'text-rose-700' : 'text-ink-800'"
          >
            {{ result.failed }}
          </div>
        </div>
      </div>
      <p v-if="result.targetGroups === 0" class="text-xs text-ink-400">
        생성할 대상이 없습니다 — 해당 월에 일기가 없거나 모든 그룹이 이미 생성돼 있습니다.
      </p>
      <p v-if="result.failed" class="text-xs text-rose-600">
        실패한 그룹은 서버 로그(`월간 하이라이트 생성 실패`)에서 확인하세요.
      </p>
    </div>

    <Modal :open="confirmOpen" title="하이라이트 생성" @close="confirmOpen = false">
      <div class="space-y-3 text-sm text-ink-600">
        <p>
          <b class="text-ink-800">{{ month }}</b> · {{ scopeLabel }}의 하이라이트를
          {{ regenerate ? "삭제 후 다시" : "" }} 생성합니다.
          <template v-if="resendOnly"> 이미 만들어진 하이라이트의 알림만 다시 발송합니다(생성 없음).</template>
          <template v-if="!regenerate && notify"> 새로 만들어진 그룹 구성원에게 알림이 갑니다.</template>
        </p>
        <p v-if="regenerate" class="text-rose-600 font-medium">
          기존 하이라이트가 삭제되고 현재 일기 기준으로 다시 집계됩니다.
        </p>
        <p v-if="error" class="text-rose-600">{{ error }}</p>
        <div class="flex justify-end gap-2 pt-1">
          <button class="btn-outline" :disabled="running" @click="confirmOpen = false">취소</button>
          <button class="btn-primary" :disabled="running" @click="run">
            {{ running ? "생성 중..." : "생성" }}
          </button>
        </div>
      </div>
    </Modal>
  </div>
</template>
