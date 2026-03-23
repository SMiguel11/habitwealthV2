<template>
  <div class="min-h-screen bg-slate-950 flex flex-col items-center justify-center relative overflow-hidden">

    <!-- Background -->
    <div aria-hidden="true" class="pointer-events-none absolute inset-0 overflow-hidden">
      <div class="absolute bottom-0 right-0 w-[900px] h-[700px] bg-[radial-gradient(ellipse_at_bottom_right,rgba(20,184,166,0.18)_0%,rgba(52,211,153,0.08)_35%,transparent_65%)]"></div>
      <div class="absolute -top-40 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-[radial-gradient(ellipse_at_top,rgba(52,211,153,0.06)_0%,transparent_60%)]"></div>
      <div class="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:36px_36px]"></div>
      <div class="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-emerald-500/20 to-transparent"></div>
    </div>

    <!-- Logo top-left -->
    <div class="absolute top-6 left-6 flex items-center gap-2.5">
      <AppLogo class="h-9 w-auto" />
      <span class="text-sm font-bold text-white hidden sm:block">Habit<span class="text-emerald-400">Wealth</span></span>
    </div>

    <!-- Main card -->
    <div class="relative z-10 px-6 w-full max-w-md">

      <!-- Spinner -->
      <div class="relative w-24 h-24 mx-auto mb-10">
        <div class="absolute inset-0 rounded-full border-[3px] border-white/[0.04]"></div>
        <div class="absolute inset-0 rounded-full border-[3px] border-t-emerald-400 border-r-emerald-400/20 animate-spin" style="animation-duration:1.2s"></div>
        <div class="absolute inset-0 rounded-full border-[3px] border-transparent border-b-teal-500/30 animate-spin" style="animation-duration:2.4s;animation-direction:reverse"></div>
        <div class="absolute inset-4 rounded-full bg-emerald-500/[0.07] border border-emerald-500/20 flex items-center justify-center">
          <svg class="w-7 h-7 text-emerald-400" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
          </svg>
        </div>
      </div>

      <!-- Heading -->
      <div class="text-center mb-10">
        <h1 class="text-3xl sm:text-4xl font-extrabold text-white tracking-tight mb-3">
          {{ t('an_title') }}
        </h1>
        <p class="text-slate-500 text-sm leading-relaxed max-w-sm mx-auto">
          {{ t('an_subtitle') }}
        </p>
      </div>

      <!-- Step list -->
      <div class="space-y-2.5">
        <div
          v-for="(step, i) in steps"
          :key="i"
          class="flex items-center gap-4 px-5 py-4 rounded-2xl border transition-all duration-700"
          :class="{
            'border-emerald-500/30 bg-emerald-500/[0.07]': step.status === 'done',
            'border-emerald-500/20 bg-white/[0.04] shadow-lg shadow-emerald-950/50': step.status === 'active',
            'border-white/[0.05] bg-white/[0.015] opacity-50': step.status === 'pending'
          }"
        >
          <!-- Status icon -->
          <div
            class="w-8 h-8 rounded-xl flex-shrink-0 flex items-center justify-center transition-all duration-700"
            :class="{
              'bg-emerald-500 shadow-lg shadow-emerald-500/30': step.status === 'done',
              'bg-white/[0.07] border border-emerald-500/40': step.status === 'active',
              'bg-white/[0.03] border border-white/[0.07]': step.status === 'pending'
            }"
          >
            <svg v-if="step.status === 'done'" class="w-4 h-4 text-white" fill="none" stroke="currentColor" stroke-width="3" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
            <div v-else-if="step.status === 'active'" class="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></div>
            <div v-else class="w-2 h-2 rounded-full bg-white/10"></div>
          </div>

          <!-- Label -->
          <p
            class="flex-1 text-sm font-semibold transition-colors duration-500"
            :class="{
              'text-emerald-300': step.status === 'done',
              'text-white': step.status === 'active',
              'text-slate-600': step.status === 'pending'
            }"
          >
            {{ step.label }}
          </p>

          <!-- Badge -->
          <span v-if="step.status === 'done'" class="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">
            {{ t('an_done') }}
          </span>
          <span v-else-if="step.status === 'active'" class="text-[10px] font-bold text-slate-500 uppercase tracking-widest animate-pulse">
            {{ t('an_working') }}
          </span>
        </div>
      </div>

      <!-- Bottom hint -->
      <p class="text-center text-xs text-slate-700 mt-8">{{ t('an_hint') }}</p>

    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useI18n } from '#imports'
import { useRouter } from '#app'
import AppLogo from '../components/AppLogo.vue'

const { t } = useI18n()
const router = useRouter()

// Steps auto-advance based on elapsed time (ms)
const STEP_TIMES = [0, 8000, 20000, 35000]
// Minimum time before redirecting (ms) — ensures new analysis has time to process
const MIN_WAIT_MS = 45000

const elapsed = ref(0)
let startTime = 0
let timerHandle = null

const getStepStatus = (elapsed, doneThreshold, activeThreshold) => {
  if (elapsed >= doneThreshold) return 'done'
  if (elapsed >= activeThreshold) return 'active'
  return 'pending'
}

const steps = computed(() => [
  {
    label: t('an_step1'),
    status: getStepStatus(elapsed.value, STEP_TIMES[1], STEP_TIMES[0])
  },
  {
    label: t('an_step2'),
    status: getStepStatus(elapsed.value, STEP_TIMES[2], STEP_TIMES[1])
  },
  {
    label: t('an_step3'),
    status: getStepStatus(elapsed.value, STEP_TIMES[3], STEP_TIMES[2])
  },
  {
    label: t('an_step4'),
    status: getStepStatus(elapsed.value, MIN_WAIT_MS, STEP_TIMES[3])
  }
])

async function pollAndRedirect() {
  const isProduction = globalThis.location !== undefined && globalThis.location.hostname !== 'localhost'
  const functionBase = isProduction ? 'https://hwbase-fn-sas-00211.azurewebsites.net' : ''

  let hasData = false
  const maxAttempts = 25 // 25 × 4s = 100s hard timeout

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    await new Promise(r => setTimeout(r, 4000))
    try {
      const res = await fetch(`${functionBase}/api/insights-api?userId=local-user`)
      const data = await res.json()
      if (data.documentCount && data.summary) {
        hasData = true
      }
    } catch (err) {
      // Log transient errors but continue retrying
      console.debug(`Insights API poll attempt ${attempt + 1}/${maxAttempts} failed:`, err)
    }

    // Wait until BOTH: data is ready AND minimum time has passed
    if (hasData && (Date.now() - startTime) >= MIN_WAIT_MS) break
  }

  clearInterval(timerHandle)
  router.push('/insights')
}

onMounted(() => {
  startTime = Date.now()
  // Update elapsed every 500ms so step transitions animate smoothly
  timerHandle = setInterval(() => {
    elapsed.value = Date.now() - startTime
  }, 500)
  pollAndRedirect()
})

onUnmounted(() => {
  clearInterval(timerHandle)
})
</script>
