<script setup lang="ts">
import { onMounted, ref } from "vue";
import { adminApi } from "@/api/admin";
import { extractErrorMessage } from "@/api/http";
import type { AppConfig } from "@/types/api";

const noticeEnabled = ref(false);
const noticeMessage = ref("");
const feedbackEnabled = ref(false);
const feedbackUrl = ref("");

const loading = ref(false);
const saving = ref(false);
const errorMessage = ref<string | null>(null);
const savedAt = ref<string | null>(null);

function apply(c: AppConfig) {
  noticeEnabled.value = c.noticeEnabled;
  noticeMessage.value = c.noticeMessage;
  feedbackEnabled.value = c.feedbackEnabled;
  feedbackUrl.value = c.feedbackUrl;
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
      feedbackUrl: feedbackUrl.value
    });
    apply(res);
    savedAt.value = new Date().toLocaleTimeString();
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

    <!-- 피드백 -->
    <div class="card p-5 space-y-4">
      <div class="flex items-center justify-between">
        <div>
          <h2 class="font-semibold text-ink-800">피드백 받기</h2>
          <p class="text-xs text-ink-400 mt-0.5">
            마이페이지 하단 "피드백 받기" 메뉴 노출 여부와 이동할 폼 URL.
          </p>
        </div>
        <label class="flex items-center gap-2 text-sm text-ink-600 shrink-0">
          <input v-model="feedbackEnabled" type="checkbox" class="h-4 w-4 rounded" />
          노출
        </label>
      </div>
      <div>
        <label class="label">구글 폼 URL</label>
        <input
          v-model="feedbackUrl"
          class="input"
          placeholder="https://forms.gle/..."
        />
      </div>
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
