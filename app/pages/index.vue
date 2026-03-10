<template>
  <div class="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 relative overflow-hidden">

    <!-- Ambient background orbs -->
    <div aria-hidden="true" class="pointer-events-none absolute inset-0 overflow-hidden">
      <div class="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full bg-emerald-500/10 blur-3xl"></div>
      <div class="absolute top-1/3 -right-40 w-[500px] h-[500px] rounded-full bg-teal-400/8 blur-3xl"></div>
      <div class="absolute bottom-0 left-1/3 w-[400px] h-[400px] rounded-full bg-cyan-500/6 blur-3xl"></div>
      <!-- Subtle grid -->
      <div class="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:64px_64px]"></div>
    </div>

    <!-- ── Sticky Navbar ── -->
    <header class="sticky top-0 z-50 w-full border-b border-white/5 bg-slate-950/60 backdrop-blur-xl">
      <div class="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between gap-4">
        <!-- Logo -->
        <NuxtLink to="/" class="flex items-center gap-2.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 rounded-lg" aria-label="Habit Wealth home">
          <AppLogo class="h-8 w-auto" />
          <span class="text-sm font-semibold text-white tracking-wide hidden sm:block">Habit<span class="text-emerald-400">Wealth</span></span>
        </NuxtLink>

        <!-- Nav actions -->
        <div class="flex items-center gap-3">
          <!-- Language selector -->
          <div class="flex items-center gap-1 bg-white/5 rounded-lg p-1">
            <button
              v-for="loc in locales"
              :key="loc.code"
              @click="setLocale(loc.code)"
              :aria-label="`Switch to ${loc.name}`"
              :class="['px-2.5 py-1 rounded-md text-xs font-medium transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400',
                locale === loc.code
                  ? 'bg-emerald-500 text-white shadow-sm shadow-emerald-500/30'
                  : 'text-slate-400 hover:text-white hover:bg-white/8']"
            >
              {{ loc.code.toUpperCase() }}
            </button>
          </div>
        </div>
      </div>
    </header>

    <!-- ── Hero Section ── -->
    <section class="relative flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] px-6 py-20 text-center">

      <!-- Badge -->
      <div class="inline-flex items-center gap-2 mb-8 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold tracking-wider uppercase">
        <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
        {{ t('badge') }}
      </div>

      <!-- Headline -->
      <h1 class="max-w-3xl text-5xl sm:text-6xl md:text-7xl font-bold tracking-tight text-white leading-[1.08]">
        {{ t('headline_part1') }}
        <span class="relative inline-block">
          <span class="bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent">{{ t('headline_part2') }}</span>
          <!-- Underline accent -->
          <span aria-hidden="true" class="absolute -bottom-1 left-0 right-0 h-px bg-gradient-to-r from-emerald-400/0 via-emerald-400/60 to-emerald-400/0"></span>
        </span>
      </h1>

      <!-- Subtitle -->
      <p class="mt-6 max-w-xl text-lg sm:text-xl text-slate-400 leading-relaxed">
        {{ t('subtitle') }} <span class="text-slate-300 font-medium">{{ t('subtitle_highlight') }}</span>. {{ t('subtitle_end') }}
      </p>

      <!-- Input + CTA -->
      <form @submit.prevent="start" class="mt-10 w-full max-w-sm flex flex-col sm:flex-row items-stretch sm:items-center gap-3" novalidate>
        <label class="sr-only" for="name">Your first name</label>
        <div class="relative flex-1">
          <div class="absolute inset-y-0 left-3.5 flex items-center pointer-events-none">
            <svg class="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
            </svg>
          </div>
          <input
            id="name"
            v-model="name"
            type="text"
            :placeholder="t('input_placeholder')"
            autocomplete="given-name"
            class="w-full pl-10 pr-4 py-3 rounded-xl bg-white/6 border border-white/10 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent transition-all duration-200 hover:bg-white/8"
          />
        </div>
        <button
          type="submit"
          class="flex-shrink-0 inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-sm font-semibold shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 hover:from-emerald-400 hover:to-teal-400 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
        >
          {{ t('cta') }}
          <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
          </svg>
        </button>
      </form>

      <!-- Social proof -->
      <p class="mt-6 text-xs text-slate-600">{{ t('trust') }}</p>

      <!-- Scroll hint -->
      <div aria-hidden="true" class="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5 opacity-30">
        <span class="text-xs text-slate-500 uppercase tracking-widest">{{ t('scroll') }}</span>
        <div class="w-px h-8 bg-gradient-to-b from-slate-500 to-transparent"></div>
      </div>
    </section>

    <!-- ── Feature Cards ── -->
    <section class="relative pb-24 px-6">
      <div class="max-w-5xl mx-auto">

        <!-- Section label -->
        <p class="text-center text-xs font-semibold text-slate-600 uppercase tracking-widest mb-10">{{ t('how_it_works') }}</p>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-5">

          <!-- Card 1: Upload -->
          <div class="group relative rounded-2xl border border-white/6 bg-white/3 backdrop-blur-sm p-7 hover:bg-white/6 hover:border-white/12 hover:-translate-y-1 hover:shadow-2xl hover:shadow-black/40 transition-all duration-300 cursor-default">
            <!-- Gradient top accent -->
            <div class="absolute inset-x-0 top-0 h-px rounded-t-2xl bg-gradient-to-r from-transparent via-blue-400/50 to-transparent"></div>
            <!-- Icon -->
            <div class="w-12 h-12 mb-5 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
              <svg class="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" stroke-width="1.75" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
              </svg>
            </div>
            <h3 class="text-base font-semibold text-white mb-2">{{ t('card1_title') }}</h3>
            <p class="text-sm text-slate-500 leading-relaxed">{{ t('card1_desc') }}</p>
            <!-- Step number -->
            <div class="absolute top-6 right-6 text-3xl font-bold text-white/4 select-none">01</div>
          </div>

          <!-- Card 2: Insights -->
          <div class="group relative rounded-2xl border border-white/6 bg-white/3 backdrop-blur-sm p-7 hover:bg-white/6 hover:border-white/12 hover:-translate-y-1 hover:shadow-2xl hover:shadow-black/40 transition-all duration-300 cursor-default">
            <div class="absolute inset-x-0 top-0 h-px rounded-t-2xl bg-gradient-to-r from-transparent via-pink-400/50 to-transparent"></div>
            <div class="w-12 h-12 mb-5 rounded-xl bg-pink-500/10 border border-pink-500/20 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
              <svg class="w-6 h-6 text-pink-400" fill="none" stroke="currentColor" stroke-width="1.75" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
              </svg>
            </div>
            <h3 class="text-base font-semibold text-white mb-2">{{ t('card2_title') }}</h3>
            <p class="text-sm text-slate-500 leading-relaxed">{{ t('card2_desc') }}</p>
            <div class="absolute top-6 right-6 text-3xl font-bold text-white/4 select-none">02</div>
          </div>

          <!-- Card 3: Tips -->
          <div class="group relative rounded-2xl border border-white/6 bg-white/3 backdrop-blur-sm p-7 hover:bg-white/6 hover:border-white/12 hover:-translate-y-1 hover:shadow-2xl hover:shadow-black/40 transition-all duration-300 cursor-default">
            <div class="absolute inset-x-0 top-0 h-px rounded-t-2xl bg-gradient-to-r from-transparent via-emerald-400/50 to-transparent"></div>
            <div class="w-12 h-12 mb-5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
              <svg class="w-6 h-6 text-emerald-400" fill="none" stroke="currentColor" stroke-width="1.75" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" d="M15.362 5.214A8.252 8.252 0 0112 21 8.25 8.25 0 016.038 7.048 8.287 8.287 0 009 9.6a8.983 8.983 0 013.361-6.867 8.21 8.21 0 003 2.48z" />
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 18a3.75 3.75 0 00.495-7.467 5.99 5.99 0 00-1.925 3.546 5.974 5.974 0 01-2.133-1.001A3.75 3.75 0 0012 18z" />
              </svg>
            </div>
            <h3 class="text-base font-semibold text-white mb-2">{{ t('card3_title') }}</h3>
            <p class="text-sm text-slate-500 leading-relaxed">{{ t('card3_desc') }}</p>
            <div class="absolute top-6 right-6 text-3xl font-bold text-white/4 select-none">03</div>
          </div>

        </div>

        <!-- Bottom tagline -->
        <p class="text-center mt-12 text-sm text-slate-600">
          {{ t('tagline') }} &nbsp;·&nbsp;
          <NuxtLink to="/get-started" class="text-emerald-500 hover:text-emerald-400 underline-offset-2 hover:underline transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-emerald-400 rounded">
            {{ t('start_analysis') }}
          </NuxtLink>
        </p>
      </div>
    </section>

  </div>
</template>

<script setup>
import { useRouter } from '#app'
import { ref } from 'vue'
import { useI18n } from '#imports'
import AppLogo from '~/components/AppLogo.vue'

const router = useRouter()
const name = ref('')
const { locale, setLocale, t } = useI18n()

const locales = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Español' }
]

function start() {
  router.push({ path: '/get-started', query: { name: name.value } })
}
</script>
