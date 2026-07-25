<script setup lang="ts">
import { onMounted, ref } from "vue";
import { adminApi } from "@/api/admin";
import { extractErrorMessage } from "@/api/http";
import type { AppConfig } from "@/types/api";

const noticeEnabled = ref(false);
const noticeMessage = ref("");
const feedbackEnabled = ref(false);
const feedbackUrl = ref("");
const maintenanceEnabled = ref(false);
const maintenanceMessage = ref("");

const loading = ref(false);
const saving = ref(false);
const errorMessage = ref<string | null>(null);
const savedAt = ref<string | null>(null);

function apply(c: AppConfig) {
  noticeEnabled.value = c.noticeEnabled;
  noticeMessage.value = c.noticeMessage;
  feedbackEnabled.value = c.feedbackEnabled;
  feedbackUrl.value = c.feedbackUrl;
  maintenanceEnabled.value = c.maintenanceEnabled ?? false;
  maintenanceMessage.value = c.maintenanceMessage ?? "";
}

async function load() {
  loading.value = true;
  errorMessage.value = null;
  try {
    apply(await adminApi.getAppConfig());
  } catch (err) {
    errorMessage.value = extractErrorMessage(err, "설정을 불러오지 못했습니다.");
  } finally {
    loading.value = false;
  }
}

async function save() {
  saving.value = true;
  errorMessage.value = null;
  try {
    const res = await adminApi.updateAppConfig({
      noticeEnabled: noticeEnabled.value,
      noticeMessage: noticeMessage.value,
      feedbackEnabled: feedbackEnabled.value,
      feedbackUrl: feedbackUrl.value,
      maintenanceEnabled: maintenanceEnabled.value,
      maintenanceMessage: maintenanceMessage.value
    });
    apply(res);
    savedAt.value = new Date().toLocaleTimeString("ko-KR", {
      timeZone: "Asia/Seoul",
    });
  } catch (err) {
    errorMessage.value = extractErrorMessage(err, "저장에 실패했습니다.");
  } finally {
    saving.value = false;
  }
}

onMounted(load);
</script>

<template>
  <div class="space-y-4 max-w-2xl">
    <p v-if="errorMessage" class="text-sm text-rose-600">{{ errorMessage }}</p>

    <!-- 대공지(전광판) -->
    <div class="card p-5 space-y-4">
      <div class="flex items-center justify-between">
        <div>
          <h2 class="font-semibold text-ink-800">대공지 (전광판)</h2>
          <p class="text-xs text-ink-400 mt-0.5">
            그룹홈 상단에 한 줄로 흐르는 공지. 켜고 메시지가 있을 때만 앱에 표시됩니다.
          </p>
        </div>
        <label class="flex items-center gap-2 text-sm text-ink-600 shrink-0">
          <input v-model="noticeEnabled" type="checkbox" class="h-4 w-4 rounded" />
          노출
        </label>
      </div>
      <div>
        <label class="label">공지 메시지</label>
        <input
          v-model="noticeMessage"
          class="input"
          maxlength="200"
          placeholder="예) 12/25 크리스마스 이벤트 진행 중! 🎄"
        />
        <p class="mt-1 text-xs text-ink-400">{{ noticeMessage.length }}/200</p>
      </div>
    </div>

    <!-- 개발자 소개 -->
    <div class="card p-5 space-y-4">
      <div class="flex items-center justify-between">
        <div>
          <h2 class="font-semibold text-ink-800">개발자 소개</h2>
          <p class="text-xs text-ink-400 mt-0.5">
            마이페이지 하단 "개발자 소개" 메뉴 노출 여부와 이동할 링크.
            (피드백은 이제 앱 자체 폼 — "피드백 관리" 메뉴에서 편집)
          </p>
        </div>
        <label class="flex items-center gap-2 text-sm text-ink-600 shrink-0">
          <input v-model="feedbackEnabled" type="checkbox" class="h-4 w-4 rounded" />
          노출
        </label>
      </div>
      <div>
        <label class="label">개발자 소개 링크</label>
        <input
          v-model="feedbackUrl"
          class="input"
          placeholder="https://..."
        />
      </div>
    </div>

    <!-- 서버 점검(업데이트) 모드 -->
    <div
      class="card p-5 space-y-4"
      :class="maintenanceEnabled ? 'ring-2 ring-rose-400' : ''"
    >
      <div class="flex items-center justify-between">
        <div>
          <h2 class="font-semibold text-ink-800">서버 점검 모드</h2>
          <p class="text-xs text-ink-400 mt-0.5">
            켜면 앱이 <b class="text-rose-600">로그인 여부와 무관하게 전 기능을 차단</b>하고
            점검 안내 팝업을 띄웁니다. 서버 업데이트/배포 중에만 켜세요.
          </p>
        </div>
        <label class="flex items-center gap-2 text-sm text-ink-600 shrink-0">
          <input
            v-model="maintenanceEnabled"
            type="checkbox"
            class="h-4 w-4 rounded"
          />
          점검 중
        </label>
      </div>
      <div>
        <label class="label">점검 안내 문구 (비우면 앱 기본 문구)</label>
        <textarea
          v-model="maintenanceMessage"
          class="input"
          rows="2"
          maxlength="300"
          placeholder="예) 더 나은 디그팟을 위해 서버를 업데이트하고 있어요. 잠시 후 다시 이용해 주세요!"
        ></textarea>
        <p class="mt-1 text-xs text-ink-400">{{ maintenanceMessage.length }}/300</p>
      </div>
      <p v-if="maintenanceEnabled" class="text-xs font-medium text-rose-600">
        ⚠️ 저장하면 즉시 모든 사용자의 앱 사용이 차단됩니다. 점검이 끝나면 반드시 꺼주세요.
      </p>
    </div>

    <div class="flex items-center gap-3">
      <button class="btn-primary" :disabled="saving || loading" @click="save">
        {{ saving ? "저장 중..." : "저장" }}
      </button>
      <span v-if="savedAt" class="text-xs text-emerald-600">
        저장됨 · {{ savedAt }}
      </span>
    </div>
  </div>
</template>
