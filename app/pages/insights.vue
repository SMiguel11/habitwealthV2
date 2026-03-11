<template>
  <div class="min-h-screen bg-slate-950 relative overflow-hidden">

    <!-- Background -->
    <div aria-hidden="true" class="pointer-events-none absolute inset-0 overflow-hidden">
      <div class="absolute bottom-0 right-0 w-[900px] h-[700px] bg-[radial-gradient(ellipse_at_bottom_right,rgba(20,184,166,0.12)_0%,rgba(52,211,153,0.05)_35%,transparent_65%)]"></div>
      <div class="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-emerald-500/20 to-transparent"></div>
    </div>

    <!-- Navbar -->
    <header class="sticky top-0 z-50 w-full border-b border-white/[0.05] bg-slate-950/80 backdrop-blur-xl">
      <div class="max-w-7xl mx-auto px-6 h-[60px] flex items-center justify-between">
        <NuxtLink to="/" class="flex items-center gap-2.5 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400">
          <AppLogo class="h-9 w-auto" />
          <span class="text-sm font-bold text-white hidden sm:block">Habit<span class="text-emerald-400">Wealth</span></span>
        </NuxtLink>
        <div class="flex items-center gap-4">
          <span class="hidden sm:flex items-center gap-1.5 text-[11px] font-semibold text-slate-600">
            <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            {{ t('ins_live') }}
          </span>
          <NuxtLink to="/get-started" class="flex items-center gap-1.5 text-xs text-slate-500 hover:text-white transition-colors">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18"/></svg>
            {{ t('ins_back') }}
          </NuxtLink>
        </div>
      </div>
    </header>

    <!-- Loading state -->
    <div v-if="loading" class="flex flex-col items-center justify-center min-h-[70vh] gap-6">
      <div class="relative w-16 h-16">
        <div class="absolute inset-0 rounded-full border-2 border-white/[0.06]"></div>
        <div class="absolute inset-0 rounded-full border-2 border-t-emerald-400 animate-spin"></div>
      </div>
      <div class="text-center">
        <p class="text-sm text-slate-400 font-medium">{{ loadingMessage }}</p>
        <p class="text-xs text-slate-700 mt-1">{{ t('ins_loading_hint') }}</p>
      </div>
    </div>

    <!-- Dashboard -->
    <main v-else class="relative max-w-7xl mx-auto px-6 pt-10 pb-24 space-y-6">

      <!-- Page header -->
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-extrabold text-white tracking-tight">{{ t('ins_title') }}</h1>
          <p class="text-sm text-slate-600 mt-0.5">{{ t('ins_subtitle') }}</p>
        </div>
        <div class="hidden sm:flex items-center gap-2 text-xs text-slate-600 bg-white/[0.03] border border-white/[0.07] rounded-xl px-4 py-2">
          <svg class="w-3.5 h-3.5 text-slate-700" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z"/></svg>
          {{ documentCount }} {{ documentCount !== 1 ? t('ins_stmt_many') : t('ins_stmt_one') }}
        </div>
      </div>

      <!-- KPI strip -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

        <!-- HabitWealth Score -->
        <div class="relative rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5 overflow-hidden group hover:border-emerald-500/30 hover:bg-emerald-500/[0.04] transition-all duration-300">
          <div class="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent"></div>
          <div class="flex items-center justify-between mb-3">
            <span class="text-[10px] font-bold text-slate-600 uppercase tracking-widest">{{ t('ins_score_label') }}</span>
            <div class="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <svg class="w-3.5 h-3.5 text-emerald-400" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"/></svg>
            </div>
          </div>
          <div class="flex items-end gap-1.5">
            <span class="text-4xl font-black text-white tracking-tighter leading-none">{{ habitScore }}</span>
            <span class="text-lg text-slate-700 font-semibold mb-0.5">/100</span>
          </div>
          <div class="mt-3 w-full bg-white/[0.05] rounded-full h-1">
            <div class="h-1 rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-700" :style="{ width: habitScore + '%' }"></div>
          </div>
        </div>

        <!-- Stress Index -->
        <div class="relative rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5 overflow-hidden hover:border-red-500/20 hover:bg-red-500/[0.03] transition-all duration-300">
          <div class="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-red-500/40 to-transparent"></div>
          <div class="flex items-center justify-between mb-3">
            <span class="text-[10px] font-bold text-slate-600 uppercase tracking-widest">{{ t('ins_stress_label') }}</span>
            <div class="w-7 h-7 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center">
              <svg class="w-3.5 h-3.5 text-red-400" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"/></svg>
            </div>
          </div>
          <div class="flex items-end gap-1.5">
            <span class="text-4xl font-black tracking-tighter leading-none" :class="fsiLevel >= 70 ? 'text-red-400' : fsiLevel >= 40 ? 'text-amber-400' : 'text-emerald-400'">{{ fsiLevel }}</span>
            <span class="text-lg text-slate-700 font-semibold mb-0.5">/100</span>
          </div>
          <p class="text-[11px] text-slate-600 mt-2">{{ t('ins_stress_desc') }}</p>
        </div>

        <!-- Total Spent -->
        <div class="relative rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5 overflow-hidden hover:border-pink-500/20 hover:bg-pink-500/[0.03] transition-all duration-300">
          <div class="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-pink-500/40 to-transparent"></div>
          <div class="flex items-center justify-between mb-3">
            <span class="text-[10px] font-bold text-slate-600 uppercase tracking-widest">{{ t('ins_spent_label') }}</span>
            <div class="w-7 h-7 rounded-lg bg-pink-500/10 border border-pink-500/20 flex items-center justify-center">
              <svg class="w-3.5 h-3.5 text-pink-400" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z"/></svg>
            </div>
          </div>
          <div class="flex items-end gap-1">
            <span class="text-2xl font-black text-white tracking-tight leading-none">€{{ totalSpent.toLocaleString() }}</span>
          </div>
          <p class="text-[11px] text-slate-600 mt-2">{{ t('ins_spent_period') }}</p>
        </div>

        <!-- Impulse Control -->
        <div class="relative rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5 overflow-hidden hover:border-cyan-500/20 hover:bg-cyan-500/[0.03] transition-all duration-300">
          <div class="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-500/40 to-transparent"></div>
          <div class="flex items-center justify-between mb-3">
            <span class="text-[10px] font-bold text-slate-600 uppercase tracking-widest">{{ t('ins_impulse_label') }}</span>
            <div class="w-7 h-7 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
              <svg class="w-3.5 h-3.5 text-cyan-400" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"/></svg>
            </div>
          </div>
          <div class="flex items-end gap-1.5">
            <span class="text-4xl font-black text-white tracking-tighter leading-none">{{ impulseScore }}</span>
            <span class="text-lg text-slate-700 font-semibold mb-0.5">%</span>
          </div>
          <p class="text-[11px] text-slate-600 mt-2">{{ t('ins_impulse_desc') }}</p>
        </div>
      </div>

      <!-- Main grid -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">

        <!-- LEFT: 2/3 width -->
        <div class="lg:col-span-2 space-y-6">

          <!-- Spending by category -->
          <div class="relative rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6">
            <div class="absolute inset-x-0 top-0 h-px rounded-t-2xl bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
            <h2 class="text-sm font-bold text-white mb-5">{{ t('ins_categories_title') }}</h2>
            <div v-if="topCategories.length" class="space-y-3.5">
              <div v-for="(item, idx) in topCategories" :key="idx" class="group">
                <div class="flex items-center justify-between mb-1.5">
                  <span class="text-xs font-medium text-slate-400 group-hover:text-white transition-colors">{{ item.cat }}</span>
                  <div class="flex items-center gap-3">
                    <span class="text-xs text-slate-600">{{ item.pct }}%</span>
                    <span class="text-xs font-bold text-white tabular-nums">€{{ item.amt }}</span>
                  </div>
                </div>
                <div class="w-full bg-white/[0.05] rounded-full h-1.5">
                  <div class="h-1.5 rounded-full transition-all duration-700"
                    :style="{ width: item.pct + '%', background: categoryColors[idx] }"
                  ></div>
                </div>
              </div>
            </div>
            <div v-else class="text-sm text-slate-600">{{ t('ins_categories_empty') }}</div>
          </div>

          <!-- Goals -->
          <div class="relative rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6">
            <div class="absolute inset-x-0 top-0 h-px rounded-t-2xl bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
            <div class="flex items-center justify-between mb-5">
              <h2 class="text-sm font-bold text-white">{{ t('ins_goals_title') }}</h2>
              <span v-if="goals.length" class="text-[11px] font-bold px-2.5 py-1 rounded-full"
                :class="goalAlignmentScore >= 66 ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25' : goalAlignmentScore >= 33 ? 'bg-amber-500/15 text-amber-400 border border-amber-500/25' : 'bg-red-500/15 text-red-400 border border-red-500/25'">
                {{ goalAlignmentScore }}% {{ t('ins_on_track_pct') }}
              </span>
            </div>
            <div v-if="goals.length" class="space-y-4">
              <div v-for="(g, idx) in goals" :key="idx" class="rounded-xl border p-4 transition-colors"
                :class="g.onTrack ? 'bg-emerald-500/[0.04] border-emerald-500/20' : 'bg-red-500/[0.04] border-red-500/20'">
                <div class="flex items-start justify-between gap-3 mb-3">
                  <div class="text-sm font-semibold text-white">🎯 {{ g.goal }}</div>
                  <span class="text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0"
                    :class="g.onTrack ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'">
                    {{ g.onTrack ? t('ins_on_track') : t('ins_behind') }}
                  </span>
                </div>
                <div class="grid grid-cols-2 gap-2 mb-3">
                  <div class="rounded-lg bg-white/[0.03] px-3 py-2">
                    <p class="text-[10px] text-slate-600 mb-0.5">{{ t('ins_saving_now') }}</p>
                    <p class="text-sm font-bold text-white">€{{ g.currentSavings }}<span class="text-xs text-slate-600 font-normal">{{ t('ins_per_month') }}</span></p>
                  </div>
                  <div class="rounded-lg bg-white/[0.03] px-3 py-2">
                    <p class="text-[10px] text-slate-600 mb-0.5">{{ t('ins_need_to_save') }}</p>
                    <p class="text-sm font-bold text-white">€{{ g.monthlyNeeded }}<span class="text-xs text-slate-600 font-normal">{{ t('ins_per_month') }}</span></p>
                  </div>
                </div>
                <div class="w-full bg-white/[0.05] rounded-full h-1 mb-2">
                  <div class="h-1 rounded-full transition-all duration-700"
                    :class="g.onTrack ? 'bg-emerald-500' : 'bg-red-400'"
                    :style="{ width: Math.min(100, g.monthlyNeeded > 0 ? Math.round((g.currentSavings / g.monthlyNeeded) * 100) : 0) + '%' }">
                  </div>
                </div>
                <p v-if="g.projectedMonths" class="text-[11px] text-slate-600">{{ t('ins_projected') }} <span class="text-slate-400 font-medium">{{ g.projectedMonths }} {{ t('gs_months') }}</span></p>
                <p v-else class="text-[11px] text-slate-700 italic">{{ t('ins_no_savings') }}</p>
              </div>
            </div>
            <div v-else class="text-sm text-slate-600">
              {{ t('ins_goals_empty') }}
              <NuxtLink to="/get-started" class="text-emerald-400 hover:text-emerald-300 underline underline-offset-2 ml-1 transition-colors">{{ t('ins_add_goals') }}</NuxtLink>
            </div>
          </div>

          <!-- Recent Transactions -->
          <div class="relative rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6">
            <div class="absolute inset-x-0 top-0 h-px rounded-t-2xl bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
            <h2 class="text-sm font-bold text-white mb-5">{{ t('ins_transactions_title') }}</h2>
            <div v-if="recentTransactions.length" class="space-y-0.5">
              <div v-for="(t, idx) in recentTransactions.slice(0, 8)" :key="idx"
                class="flex items-center justify-between py-2.5 border-b border-white/[0.04] last:border-0 group hover:bg-white/[0.02] -mx-2 px-2 rounded-lg transition-colors">
                <div>
                  <p class="text-sm font-medium text-slate-300 group-hover:text-white transition-colors">{{ t.merchant }}</p>
                  <p class="text-[11px] text-slate-700">{{ t.date }}</p>
                </div>
                <span class="text-sm font-bold text-red-400 tabular-nums">−€{{ Math.abs(t.amount) }}</span>
              </div>
            </div>
            <div v-else class="text-sm text-slate-600">{{ t('ins_transactions_empty') }}</div>
          </div>
        </div>

        <!-- RIGHT: 1/3 width -->
        <div class="space-y-6">

          <!-- Financial Persona -->
          <div class="relative rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.05] p-6 overflow-hidden">
            <div class="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-500/60 to-transparent"></div>
            <div class="absolute -bottom-6 -right-6 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl"></div>
            <p class="text-[10px] font-bold text-emerald-700 uppercase tracking-widest mb-3">{{ t('ins_persona_label') }}</p>
            <div class="text-xl font-extrabold text-emerald-300 mb-2 leading-tight">{{ financialPersona }}</div>
            <p class="text-xs text-slate-600 leading-relaxed">{{ t('ins_persona_desc') }}</p>
          </div>

          <!-- Recommendations -->
          <div class="relative rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6">
            <div class="absolute inset-x-0 top-0 h-px rounded-t-2xl bg-gradient-to-r from-transparent via-amber-400/40 to-transparent"></div>
            <h3 class="text-sm font-bold text-white mb-4">{{ t('ins_recs_title') }}</h3>
            <div v-if="nudges.length" class="space-y-3">
              <div v-for="(nudge, idx) in nudges.slice(0, 4)" :key="idx"
                class="rounded-xl bg-white/[0.03] border border-white/[0.06] p-3.5 hover:border-amber-500/25 hover:bg-amber-500/[0.04] transition-all">
                <p class="text-xs font-semibold text-slate-300 leading-snug">{{ nudge.title || nudge }}</p>
                <p v-if="nudge.description" class="text-[11px] text-slate-600 mt-1 leading-relaxed">{{ nudge.description }}</p>
              </div>
            </div>
            <div v-else class="text-xs text-slate-600 leading-relaxed">{{ t('ins_recs_empty') }}</div>
          </div>

          <!-- Quick stats -->
          <div class="relative rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6">
            <div class="absolute inset-x-0 top-0 h-px rounded-t-2xl bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
            <h3 class="text-sm font-bold text-white mb-4">{{ t('ins_stats_title') }}</h3>
            <div class="space-y-3">
              <div class="flex items-center justify-between">
                <span class="text-xs text-slate-600">{{ t('ins_stats_statements') }}</span>
                <span class="text-xs font-bold text-white">{{ documentCount }}</span>
              </div>
              <div class="flex items-center justify-between">
                <span class="text-xs text-slate-600">{{ t('ins_stats_categories') }}</span>
                <span class="text-xs font-bold text-white">{{ topCategories.length }}</span>
              </div>
              <div class="flex items-center justify-between">
                <span class="text-xs text-slate-600">{{ t('ins_stats_goals') }}</span>
                <span class="text-xs font-bold text-white">{{ goals.length }}</span>
              </div>
              <div class="flex items-center justify-between">
                <span class="text-xs text-slate-600">{{ t('ins_stats_recs') }}</span>
                <span class="text-xs font-bold text-white">{{ nudges.length }}</span>
              </div>
            </div>
          </div>
        </div>

      </div>
    </main>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useI18n } from '#imports'
import AppLogo from '../components/AppLogo.vue'

const { t } = useI18n()

const loading = ref(true)

const categoryColors = [
  'linear-gradient(90deg,#10b981,#14b8a6)',
  'linear-gradient(90deg,#3b82f6,#6366f1)',
  'linear-gradient(90deg,#f59e0b,#ef4444)',
  'linear-gradient(90deg,#ec4899,#a855f7)',
  'linear-gradient(90deg,#06b6d4,#3b82f6)',
  'linear-gradient(90deg,#84cc16,#10b981)',
]
const loadingMessage = ref('Loading your insights...')
const summary = ref(null)
const documentCount = ref(0)
const recentTransactions = ref([])

async function fetchInsights() {
  const isProduction = typeof window !== 'undefined' && window.location.hostname !== 'localhost'
  const functionBase = isProduction ? 'https://hwbase-fn-sas-00211.azurewebsites.net' : ''
  const res = await fetch(`${functionBase}/api/insights-api?userId=local-user`)
  const data = await res.json()
  if (data.summary) {
    summary.value = data.summary
    documentCount.value = data.documentCount || 0
    recentTransactions.value = data.recentTransactions || []
  }
  return data
}

onMounted(async () => {
  try {
    await fetchInsights()
  } catch (e) {
    console.warn('Could not fetch insights:', e)
  } finally {
    loading.value = false
  }
})

// Computed Properties
const habitScore = computed(() => summary.value?.habitWealthScore ?? 76)
const fsiLevel = computed(() => {
  const fsi = summary.value?.fsiLevel
  if (fsi === 'High') return 87
  if (fsi === 'Medium') return 57
  return 20
})
const totalSpent = computed(() => {
  const total = summary.value?.totalExpenses ?? 0
  return Math.round(total * 100) / 100
})
const personaKeyMap = {
  'Impulsive Spender':   'ins_persona_impulsive_spender',
  'Developing Spender':  'ins_persona_developing_spender',
  'Emotional Eater':     'ins_persona_emotional_eater',
  'Stress Reliever':     'ins_persona_stress_reliever',
  'Crisis Spender':      'ins_persona_crisis_spender',
  'Social Planner':      'ins_persona_social_planner',
  'Mindful Saver':       'ins_persona_mindful_saver',
  'Conscious Spender':   'ins_persona_conscious_spender',
}
const financialPersona = computed(() => {
  const raw = summary.value?.financialPersona ?? 'Conscious Spender'
  const key = personaKeyMap[raw]
  return key ? t(key) : raw
})
const impulseScore = computed(() => {
  const fsi = summary.value?.fsiLevel
  if (fsi === 'High') return '30'
  if (fsi === 'Medium') return '55'
  return '85'
})
const categoryKeyMap = {
  utilities:      'ins_cat_utilities',
  food:           'ins_cat_food',
  health:         'ins_cat_health',
  shopping:       'ins_cat_shopping',
  savings:        'ins_cat_savings',
  transport:      'ins_cat_transport',
  other:          'ins_cat_other',
  entertainment:  'ins_cat_entertainment',
  education:      'ins_cat_education',
  insurance:      'ins_cat_insurance',
  travel:         'ins_cat_travel',
  subscriptions:  'ins_cat_subscriptions',
  housing:        'ins_cat_housing',
  restaurants:    'ins_cat_restaurants',
}

const nudgeKeyMap = {
  'Before your next online purchase, wait 48 hours. Is it still necessary?': 'ins_nudge_impulse_1',
  'Try the 10-10-10 rule: How will you feel about this purchase in 10 minutes, 10 hours, 10 days?': 'ins_nudge_impulse_2',
  'Unsubscribe from promotional emails — they\'re designed to trigger you.': 'ins_nudge_impulse_3',
  'Notice when you eat out for emotional reasons vs. hunger. Log the emotion instead.': 'ins_nudge_comfort_1',
  'Replace one delivery order per week with cooking. Save €20+ and gain satisfaction.': 'ins_nudge_comfort_2',
  'When stress urges spending, try a 5-minute breathing exercise first.': 'ins_nudge_stress_1',
  'Track the emotion before swiping your card. Awareness is the first CBT step.': 'ins_nudge_stress_2',
  'Suggest free social activities: parks, potlucks, hikes.': 'ins_nudge_social_1',
  'Set a weekend social budget in advance and commit to it publicly.': 'ins_nudge_social_2',
  'Great spending patterns! Keep building your emergency fund.': 'ins_nudge_none_1',
}

const nudges = computed(() =>
  (summary.value?.nudges ?? []).map(n => {
    if (typeof n === 'string') {
      const key = nudgeKeyMap[n]
      return key ? t(key) : n
    }
    const titleKey = nudgeKeyMap[n.title]
    return { ...n, title: titleKey ? t(titleKey) : n.title }
  })
)
const goals = computed(() => summary.value?.goals ?? [])
const goalAlignmentScore = computed(() => Math.round(summary.value?.goalAlignmentScore ?? 0))
const topCategories = computed(() => {
  if (!summary.value?.byCategory) return []
  const entries = Object.entries(summary.value.byCategory)
  const total = entries.reduce((sum, [_, amt]) => sum + amt, 0)
  return entries
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([cat, amt]) => {
      const key = categoryKeyMap[cat.toLowerCase()]
      return {
        cat: key ? t(key) : cat.charAt(0).toUpperCase() + cat.slice(1),
        amt: Math.round(amt * 100) / 100,
        pct: Math.round((amt / total) * 100)
      }
    })
})
</script>

<style scoped>
/* small page-level adjustments, Tailwind does most of the work */
</style>
