<script setup lang="ts">
import { ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useAuthStore } from "@/stores/auth";
import { extractErrorMessage } from "@/api/http";

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;
const email = ref("");
const password = ref("");
const loading = ref(false);
const errorMessage = ref<string | null>(null);

const auth = useAuthStore();
const router = useRouter();
const route = useRoute();

async function onSubmit() {
  errorMessage.value = null;
  loading.value = true;
  try {
    await auth.login({ email: email.value.trim(), password: password.value });
    const redirect = (route.query.redirect as string | undefined) ?? "/dashboard";
    router.replace(redirect);
  } catch (err) {
    errorMessage.value = extractErrorMessage(err, "로그인에 실패했습니다.");
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="min-h-screen grid lg:grid-cols-2 bg-ink-50">
    <div class="hidden lg:flex relative bg-gradient-to-br from-accent-soft via-accent to-accent-strong overflow-hidden">
      <div class="absolute inset-0">
        <div
          class="absolute -top-24 -left-20 h-80 w-80 rounded-full bg-white/25 blur-3xl"
        ></div>
        <div
          class="absolute bottom-0 right-0 h-72 w-72 rounded-full bg-white/15 blur-3xl"
        ></div>
      </div>
      <div class="relative z-10 p-14 flex flex-col justify-between text-white">
        <div class="flex items-center gap-3">
          <img src="/favicon.svg" alt="디그팟" class="h-10 w-10 rounded-2xl shadow-lg" />
          <span class="text-sm font-bold tracking-wider">디그팟 · Admin</span>
        </div>
        <div class="space-y-4 max-w-md">
          <h2 class="text-[34px] font-extrabold leading-tight tracking-tight">
            운영에 필요한 정보를<br />한 화면에서.
          </h2>
          <p class="text-[15px] text-white/90 leading-relaxed">
            사용자·그룹방·일기·일정부터 DB 메타데이터와 관리자 행위 로그까지,
            디그팟 백엔드의 모든 운영 지표를 모아보세요.
          </p>
        </div>
        <p class="text-xs text-white/70">© 디그팟 team</p>
      </div>
    </div>

    <div class="flex items-center justify-center p-8">
      <form class="card w-full max-w-md p-8 space-y-6" @submit.prevent="onSubmit">
        <div class="flex flex-col items-center text-center lg:items-start lg:text-left">
          <img
            src="/favicon.svg"
            alt="디그팟"
            class="h-12 w-12 rounded-2xl shadow-coral mb-4 lg:hidden"
          />
          <h1 class="text-2xl font-extrabold tracking-tight text-ink-800">관리자 로그인</h1>
          <p class="mt-1.5 text-sm text-ink-500">
            관리자 권한(ADMIN) 계정만 접근할 수 있습니다.
          </p>
        </div>

        <div class="space-y-4">
          <div>
            <label class="label" for="email">이메일</label>
            <input
              id="email"
              v-model="email"
              type="email"
              autocomplete="username"
              class="input"
              placeholder="admin@digda.com"
              required
            />
          </div>
          <div>
            <label class="label" for="password">비밀번호</label>
            <input
              id="password"
              v-model="password"
              type="password"
              autocomplete="current-password"
              class="input"
              placeholder="비밀번호"
              required
            />
          </div>
        </div>

        <p
          v-if="errorMessage"
          class="text-sm text-rose-600 bg-rose-50 border border-rose-100 rounded-lg px-3 py-2"
        >
          {{ errorMessage }}
        </p>

        <button type="submit" class="btn-primary w-full justify-center" :disabled="loading">
          {{ loading ? "로그인 중..." : "로그인" }}
        </button>

        <p class="text-xs text-ink-400 text-center">
          API 베이스 URL: <code class="text-ink-500">{{ apiBaseUrl || "(미설정)" }}</code>
        </p>
      </form>
    </div>
  </div>
</template>
