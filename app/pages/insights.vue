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
        <div class="relative rounded-2xl border bg-white/[0.03] p-5 group transition-all duration-300"
          :class="showExplanation ? 'border-emerald-500/30 bg-emerald-500/[0.04]' : 'border-white/[0.08] hover:border-emerald-500/30 hover:bg-emerald-500/[0.04]'">
          <div class="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent rounded-t-2xl"></div>
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
          <!-- AI Explanation toggle -->
          <button v-if="scoreExplanation" @click="showExplanation = !showExplanation"
            class="mt-3 w-full flex items-center justify-between text-[10px] font-semibold transition-colors focus:outline-none"
            :class="showExplanation ? 'text-emerald-400' : 'text-slate-600 hover:text-emerald-400'">
            <span class="flex items-center gap-1.5">
              <svg class="w-3 h-3 text-violet-400" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
              AI Explanation
            </span>
            <svg class="w-3 h-3 transition-transform duration-200" :class="{ 'rotate-180': showExplanation }" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"/></svg>
          </button>
          <!-- Expandable explanation panel -->
          <div v-show="showExplanation && scoreExplanation" class="mt-3 pt-3 border-t border-white/[0.06] space-y-1.5">
            <p class="text-[9px] font-bold text-violet-500 uppercase tracking-widest mb-2">Your score improved because:</p>
            <div v-for="(point, i) in scoreExplanation?.positives" :key="'p'+i" class="flex items-start gap-1.5">
              <span class="text-emerald-400 text-xs leading-tight mt-px shrink-0">•</span>
              <span class="text-[11px] text-slate-300 leading-snug">{{ point }}</span>
            </div>
            <div v-if="scoreExplanation?.warnings?.length" class="mt-2 pt-2 border-t border-white/[0.04] flex items-start gap-1.5">
              <svg class="w-3 h-3 text-amber-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"/></svg>
              <span class="text-[11px] text-amber-400/80 leading-snug">{{ scoreExplanation?.warnings[0] }}</span>
            </div>
          </div>
        </div>

        <!-- Stress Index -->
        <div class="relative rounded-2xl border bg-white/[0.03] p-5 overflow-hidden transition-all duration-300"
          :class="fsiLevel >= 60
            ? 'border-red-500/25 hover:border-red-500/40 hover:bg-red-500/[0.03]'
            : fsiLevel >= 30
            ? 'border-amber-500/25 hover:border-amber-500/40 hover:bg-amber-500/[0.03]'
            : 'border-emerald-500/20 hover:border-emerald-500/35 hover:bg-emerald-500/[0.03]'">
          <!-- Semantic top line -->
          <div class="absolute inset-x-0 top-0 h-px"
            :class="fsiLevel >= 60
              ? 'bg-gradient-to-r from-transparent via-red-500/60 to-transparent'
              : fsiLevel >= 30
              ? 'bg-gradient-to-r from-transparent via-amber-400/60 to-transparent'
              : 'bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent'"></div>
          <!-- Header -->
          <div class="flex items-center justify-between mb-3">
            <span class="text-[10px] font-bold text-slate-600 uppercase tracking-widest">{{ t('ins_stress_label') }}</span>
            <span class="text-[10px] font-bold px-2 py-0.5 rounded-full border"
              :class="fsiLevel >= 60
                ? 'bg-red-500/15 text-red-400 border-red-500/25'
                : fsiLevel >= 30
                ? 'bg-amber-500/15 text-amber-400 border-amber-500/25'
                : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25'">
              {{ fsiBandLabel }}
            </span>
          </div>
          <!-- Semicircle gauge -->
          <div class="-mx-1">
            <svg viewBox="0 0 120 68" class="w-full max-w-[150px] mx-auto" fill="none" aria-hidden="true">
              <!-- Background track -->
              <path d="M 10 62 A 50 50 0 0 1 110 62"
                stroke="rgba(255,255,255,0.05)" stroke-width="10" stroke-linecap="round"/>
              <!-- Value arc -->
              <path d="M 10 62 A 50 50 0 0 1 110 62"
                :stroke="fsiGaugeColor" stroke-width="10" stroke-linecap="round"
                pathLength="100" :stroke-dasharray="`${fsiLevel} 100`"
                style="transition: stroke-dasharray 0.7s ease, stroke 0.4s ease;"/>
              <!-- Score -->
              <text x="60" y="55" text-anchor="middle"
                :fill="fsiGaugeColor"
                style="font-size:20px;font-weight:900;font-family:inherit;">{{ fsiLevel }}</text>
              <text x="60" y="64" text-anchor="middle"
                fill="rgba(100,116,139,0.7)"
                style="font-size:8px;font-weight:600;font-family:inherit;">/ 100</text>
            </svg>
          </div>
          <!-- Delta -->
          <p class="text-[10px] font-semibold text-center mt-0.5"
            :class="fsiLevel >= 60 ? 'text-red-400/80' : fsiLevel >= 30 ? 'text-amber-400/80' : 'text-emerald-400/80'">
            {{ fsiDelta }}
          </p>
          <!-- Insight -->
          <p class="text-[11px] text-slate-600 mt-1.5 leading-snug text-center">{{ fsiInsightText }}</p>
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
          <div class="mt-2 flex items-center gap-1.5">
            <span class="text-[10px] text-emerald-400 font-semibold">↑ €{{ totalIncome.toLocaleString() }}</span>
            <span class="text-[10px] text-slate-700">·</span>
            <span :class="['text-[10px] font-semibold', netCashFlow >= 0 ? 'text-emerald-400' : 'text-red-400']">
              {{ netCashFlow >= 0 ? '+' : '' }}€{{ netCashFlow.toLocaleString() }} {{ t('ins_net') }}
            </span>
          </div>
          <p class="text-[11px] text-slate-600 mt-1">{{ t('ins_spent_period') }}</p>
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
          <div class="relative rounded-2xl border border-white/[0.08] bg-gradient-to-b from-white/[0.05] to-white/[0.01] p-6">
            <div class="absolute inset-x-0 top-0 h-px rounded-t-2xl bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
            <div class="absolute -inset-1 rounded-2xl opacity-0 group-hover:opacity-5 -z-10 blur-2xl bg-gradient-to-b from-emerald-500 to-teal-500 transition-opacity duration-500"></div>
            <h2 class="text-sm font-bold text-white mb-6 tracking-tight">{{ t('ins_categories_title') }}</h2>
            <div v-if="topCategories.length" class="flex flex-col items-center gap-8">
              <div class="w-full flex justify-center transition-all duration-700 animate-fadeInUp" style="animation: fadeInUp 0.8s ease-out forwards; opacity: 1;">
                <div class="w-full max-w-sm">
                  <ApexChart
                    type="donut"
                    :series="pieChartSeries"
                    :options="pieChartOptions"
                    :height="280"
                  />
                </div>
              </div>
              <div class="w-full grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div v-for="(item, idx) in topCategories" :key="idx" 
                  class="group/card flex items-center gap-3 p-3.5 rounded-xl bg-gradient-to-br from-white/[0.04] to-white/[0.01] border border-white/[0.06] hover:border-white/[0.12] hover:bg-gradient-to-br hover:from-white/[0.08] hover:to-white/[0.02] transition-all duration-300 cursor-pointer"
                  :style="{ animation: `slideIn 0.5s ease-out forwards`, animationDelay: `${idx * 50}ms`, opacity: 1 }">
                  <div class="w-3 h-3 rounded-full shrink-0 shadow-lg shadow-current/20" :style="{ backgroundColor: ['#06df9f', '#0084ff', '#ffa500', '#ff4d7d', '#00d4ff', '#7bff00'][idx], boxShadow: `0 0 12px ${['#06df9f', '#0084ff', '#ffa500', '#ff4d7d', '#00d4ff', '#7bff00'][idx]}40` }"></div>
                  <div class="flex-1 min-w-0">
                    <p class="text-xs font-semibold text-slate-300 group-hover/card:text-white truncate transition-colors">{{ item.cat }}</p>
                    <p class="text-xs text-slate-600 group-hover/card:text-slate-500 transition-colors">€{{ item.amt }}</p>
                  </div>
                  <span class="text-xs font-bold bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent shrink-0">{{ item.pct }}%</span>
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
                <span class="text-sm font-bold tabular-nums" :class="t.amount >= 0 ? 'text-emerald-400' : 'text-red-400'">
                  {{ t.amount >= 0 ? '+' : '−' }}€{{ Math.abs(t.amount).toFixed(2) }}
                </span>
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
            <!-- Detected emotional pattern -->
            <div v-if="primaryPattern" class="mt-4 pt-4 border-t border-emerald-500/10">
              <p class="text-[10px] font-bold text-slate-600 uppercase tracking-widest mb-1.5">{{ t('ins_pattern_label') }}</p>
              <span class="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/25">
                <span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                {{ primaryPattern }}
              </span>
            </div>
          </div>

          <!-- Weekend Spend Alert -->
          <div v-if="weekendSpendAlert"
            class="relative rounded-2xl border border-amber-500/30 bg-amber-500/[0.06] p-4 flex gap-3">
            <div class="shrink-0 w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center">
              <svg class="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"/></svg>
            </div>
            <div>
              <p class="text-xs font-bold text-amber-300">{{ t('ins_weekend_alert') }}</p>
              <p class="text-[11px] text-slate-500 mt-0.5 leading-relaxed">{{ t('ins_weekend_alert_desc') }}</p>
            </div>
          </div>

          <!-- Recommendations (AI-powered) -->
          <div class="relative rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6 overflow-hidden">
            <div class="absolute inset-x-0 top-0 h-px rounded-t-2xl bg-gradient-to-r from-transparent via-amber-400/40 to-transparent"></div>

            <!-- Header row -->
            <div class="flex items-start justify-between gap-3 mb-4">
              <h3 class="text-sm font-bold text-white">{{ t('ins_recs_title') }}</h3>
              <span v-if="nudgeSource === 'gpt-4o'"
                class="shrink-0 flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border bg-violet-500/15 text-violet-300 border-violet-500/30">
                <span class="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse"></span>
                {{ t('ins_ai_badge') }}
              </span>
              <span v-else
                class="shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full border bg-slate-500/15 text-slate-400 border-slate-500/25">
                {{ t('ins_static_badge') }}
              </span>
            </div>

            <!-- AI powered sub-label -->
            <p v-if="nudgeSource === 'gpt-4o'" class="text-[10px] text-violet-700 font-medium mb-4 -mt-2 flex items-center gap-1">
              <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
              {{ t('ins_ai_powered') }}
            </p>

            <!-- Nudge list -->
            <div v-if="nudges.length" class="space-y-3">
              <div v-for="(nudge, idx) in nudges.slice(0, 4)" :key="idx"
                class="group flex gap-3 rounded-xl p-3.5 border transition-all"
                :class="nudgeSource === 'gpt-4o'
                  ? 'bg-violet-500/[0.05] border-violet-500/20 hover:border-violet-500/40 hover:bg-violet-500/[0.09]'
                  : 'bg-white/[0.03] border-white/[0.06] hover:border-amber-500/25 hover:bg-amber-500/[0.04]'">
                <!-- Number badge -->
                <div class="shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black mt-0.5"
                  :class="nudgeSource === 'gpt-4o' ? 'bg-violet-500/30 text-violet-300' : 'bg-amber-500/20 text-amber-400'">
                  {{ idx + 1 }}
                </div>
                <p class="text-xs text-slate-300 leading-relaxed group-hover:text-white transition-colors">
                  {{ nudge.title || nudge }}
                </p>
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
import ApexChart from 'vue3-apexcharts'

const { t, locale } = useI18n()

const loading = ref(true)
const showExplanation = ref(false)

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
  const res = await fetch(`${functionBase}/api/insights-api?userId=local-user&lang=${locale.value}`)
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
const fsiGaugeColor = computed(() => {
  if (fsiLevel.value >= 60) return '#ef4444'
  if (fsiLevel.value >= 30) return '#f59e0b'
  return '#10b981'
})
const fsiBandLabel = computed(() => {
  const es = locale.value === 'es'
  if (fsiLevel.value >= 60) return es ? 'Alto' : 'High'
  if (fsiLevel.value >= 30) return es ? 'Medio' : 'Medium'
  return es ? 'Bajo' : 'Low'
})
const fsiDelta = computed(() => {
  const es = locale.value === 'es'
  if (fsiLevel.value >= 60) return es ? '↑ Nivel crítico · Revisa gastos fijos' : '↑ Critical — review fixed costs'
  if (fsiLevel.value >= 30) return es ? '→ Nivel moderado · Actúa pronto' : '→ Moderate — act soon'
  return es ? '↓ Sin alertas financieras activas' : '↓ No active financial alerts'
})
const fsiInsightText = computed(() => {
  const es = locale.value === 'es'
  if (fsiLevel.value >= 60) return es ? 'Tu estrés financiero requiere atención inmediata' : 'Your financial stress requires immediate attention'
  if (fsiLevel.value >= 30) return es ? 'Monitorea tu ritmo de gasto esta semana' : 'Monitor your spending pace this week'
  return es ? 'Tus finanzas están bajo control este período' : 'Your finances are under control this period'
})
const totalSpent = computed(() => {
  const total = summary.value?.totalExpenses ?? 0
  return Math.round(total * 100) / 100
})
const totalIncome = computed(() => {
  const total = summary.value?.totalIncome ?? 0
  return Math.round(total * 100) / 100
})
const netCashFlow = computed(() => {
  const flow = summary.value?.netCashFlow ?? 0
  return Math.round(flow * 100) / 100
})
const scoreExplanation = computed(() => summary.value?.scoreExplanation ?? null)
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
const nudgeSource = computed(() => summary.value?.nudgeSource ?? 'static')
const primaryPattern = computed(() => summary.value?.primaryPattern ?? '')
const weekendSpendAlert = computed(() => summary.value?.weekendSpendAlert ?? false)
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

const pieChartSeries = computed(() => topCategories.value.map(item => item.pct))
const pieChartLabels = computed(() => topCategories.value.map(item => item.cat))
const pieChartOptions = computed(() => ({
  chart: {
    type: 'donut',
    fontFamily: '"Inter", "system-ui", sans-serif',
    sparkline: { enabled: false },
    background: 'transparent',
    animations: {
      enabled: true,
      speed: 1200,
      animateGradually: {
        enabled: true,
        delay: 150
      },
      dynamicAnimation: {
        enabled: true,
        speed: 350
      }
    }
  },
  colors: ['#06df9f', '#0084ff', '#ffa500', '#ff4d7d', '#00d4ff', '#7bff00'],
  labels: pieChartLabels.value,
  legend: {
    position: 'bottom',
    fontSize: '12px',
    fontFamily: '"Inter", "system-ui", sans-serif',
    fontWeight: 500,
    offsetY: 8,
    itemMargin: { vertical: 6 },
    labels: {
      colors: '#cbd5e1',
      useSeriesColors: false
    },
    markers: {
      width: 8,
      height: 8,
      strokeWidth: 0,
      radius: 4
    }
  },
  dataLabels: {
    enabled: true,
    formatter: (val) => Math.round(val) + '%',
    style: {
      fontSize: '9px',
      fontWeight: '700',
      fontFamily: '"Inter", "system-ui", sans-serif',
      colors: ['#ffffff']
    },
    dropShadow: {
      enabled: true,
      top: 1,
      left: 1,
      blur: 2,
      color: '#000000',
      opacity: 0.5
    }
  },
  plotOptions: {
    pie: {
      donut: {
        size: '72%',
        background: 'transparent',
        labels: {
          show: true,
          name: {
            show: false
          },
          value: {
            show: false
          },
          total: {
            show: false
          }
        }
      }
    }
  },
  states: {
    hover: {
      filter: {
        type: 'lighten',
        value: 0.15
      }
    },
    active: {
      filter: {
        type: 'darken',
        value: 0.15
      }
    }
  },
  stroke: {
    show: true,
    width: 0,
    colors: ['#0f172a']
  },
  tooltip: {
    enabled: true,
    theme: 'dark',
    style: {
      fontSize: '12px',
      fontFamily: '"Inter", "system-ui", sans-serif'
    },
    y: {
      formatter: (value) => Math.round(value) + '%'
    },
    marker: {
      show: true
    }
  },
  responsive: [{
    breakpoint: 480,
    options: {
      chart: {
        width: 300
      },
      plotOptions: {
        pie: {
          donut: {
            size: '65%'
          }
        }
      }
    }
  }]
}))
</script>

<style scoped>
/* Smooth animations */
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(16px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateX(-8px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

.animate-fadeInUp {
  animation: fadeInUp 0.8s ease-out forwards;
}

/* ApexCharts dark theme customization */
:deep(.apexcharts-svg) {
  background: transparent !important;
}

:deep(.apexcharts-theme-dark) {
  background: transparent !important;
}

:deep(.apexcharts-text) {
  font-family: 'Inter', 'system-ui', sans-serif !important;
}

:deep(.apexcharts-legend) {
  margin-top: 16px !important;
}

:deep(.apexcharts-legend-series) {
  padding: 4px 0 !important;
}
</style>
