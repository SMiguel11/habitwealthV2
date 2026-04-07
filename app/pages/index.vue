<template>
  <div class="min-h-screen relative overflow-hidden bg-slate-950">

    <!-- ── Background image + overlay ── -->
    <div aria-hidden="true" class="pointer-events-none absolute inset-0">
      <!-- Hero image -->
      <div class="absolute inset-0 bg-cover bg-center bg-no-repeat" style="background-image:url('/images/ai.webp')"></div>
      <!-- Dark overlay: preserves readability and blends with dark theme -->
      <div class="absolute inset-0 bg-slate-950/75"></div>
    </div>

    <!-- ── Decorative glows (on top of image) ── -->
    <div aria-hidden="true" class="pointer-events-none absolute inset-0 overflow-hidden">
      <!-- Primary hero glow (center-right / bottom-right) -->
      <div class="absolute bottom-0 right-0 w-[900px] h-[700px] bg-[radial-gradient(ellipse_at_bottom_right,rgba(20,184,166,0.22)_0%,rgba(52,211,153,0.10)_35%,transparent_65%)]"></div>
      <!-- Top subtle glow -->
      <div class="absolute -top-40 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-[radial-gradient(ellipse_at_top,rgba(52,211,153,0.06)_0%,transparent_60%)]"></div>
      <!-- Dot grid with radial mask -->
      <div class="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:36px_36px]"></div>
      <!-- Horizon line -->
      <div class="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-emerald-500/20 to-transparent"></div>
    </div>

    <!-- ── Navbar ── -->
    <header class="sticky top-0 z-50 w-full border-b border-white/[0.05] bg-slate-950/70 backdrop-blur-xl">
      <div class="max-w-7xl mx-auto px-6 h-[60px] flex items-center justify-between">

        <!-- Logo -->
        <NuxtLink to="/" class="flex items-center gap-2.5 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400" aria-label="HabitWealth home">
          <AppLogo class="h-9 w-auto" />
          <span class="text-sm font-bold text-white tracking-tight hidden sm:block">
            Habit<span class="text-emerald-400">Wealth</span>
          </span>
        </NuxtLink>

        <!-- Right actions -->
        <div class="flex items-center gap-3">
          <!-- Lang toggle -->
          <div class="flex items-center gap-0.5 bg-white/[0.05] rounded-lg p-1">
            <button
              v-for="loc in locales"
              :key="loc.code"
              @click="setLocale(loc.code)"
              :aria-label="`Switch to ${loc.name}`"
              :class="['px-2.5 py-1 rounded-md text-xs font-semibold transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400',
                locale === loc.code
                  ? 'bg-emerald-500 text-white shadow-sm'
                  : 'text-slate-500 hover:text-white']"
            >
              {{ loc.code.toUpperCase() }}
            </button>
          </div>
        </div>
      </div>
    </header>

    <!-- ── Hero: Split layout ── -->
    <section class="relative max-w-7xl mx-auto px-6 pt-20 pb-10 lg:pt-28 lg:pb-10 grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">

      <!-- LEFT: Content -->
      <div>
        <!-- Badge -->
        <div class="hero-item inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-emerald-500/25 bg-emerald-500/8 text-emerald-400 text-xs font-semibold tracking-widest uppercase mb-8" style="--hero-delay:0.35s">
          <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
          {{ t('badge') }}
        </div>

        <!-- Headline -->
        <h1 class="text-5xl sm:text-6xl xl:text-[4.5rem] font-extrabold tracking-tight leading-[1.04] mb-6 [perspective:800px]">
          <AnimatedUnderlineTextOne
            text=""
            underline-path="M 0,12 Q 75,4 150,12 Q 225,20 300,12"
            underline-hover-path="M 0,12 Q 75,20 150,12 Q 225,4 300,12"
            :underline-duration="1.0"
            :underline-delay="2.1"
            underline-color="#34d399"
          >
            <LetterReveal
              :text="`${t('headline_part1')}${t('headline_part2')}`"
              wrapper-class="text-5xl sm:text-6xl xl:text-[4.5rem] font-extrabold tracking-tight leading-[1.04]"
            />
          </AnimatedUnderlineTextOne>
        </h1>

        <!-- Subtitle -->
        <p class="hero-item text-lg text-slate-400 leading-relaxed mb-9 max-w-lg" style="--hero-delay:0.25s">
          {{ t('subtitle') }}
          <span class="block mt-2 text-emerald-400/90 font-semibold">{{ t('subtitle_invest') }}</span>
        </p>

        <!-- Form -->
        <form @submit.prevent="start" novalidate class="hero-item flex flex-col sm:flex-row gap-2.5 max-w-md" style="--hero-delay:0.4s">
          <label class="sr-only" for="name">{{ t('input_placeholder') }}</label>
          <div class="relative flex-1">
            <div class="absolute inset-y-0 left-3.5 flex items-center pointer-events-none">
              <svg class="w-4 h-4 text-slate-600" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
              </svg>
            </div>
            <input
              id="name"
              v-model="name"
              type="text"
              :placeholder="t('input_placeholder')"
              autocomplete="given-name"
              class="w-full pl-10 pr-4 py-3.5 rounded-xl bg-white/[0.05] border border-white/10 text-white text-sm placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-400/70 focus:border-transparent hover:border-white/20 transition-all duration-200"
            />
          </div>
          <button
            type="submit"
            class="w-full sm:w-auto flex-shrink-0 inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white text-sm font-bold shadow-xl shadow-emerald-500/25 hover:shadow-emerald-500/40 hover:from-emerald-400 hover:to-teal-500 hover:-translate-y-px active:translate-y-0 transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
          >
            {{ t('cta') }}
            <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
            </svg>
          </button>
        </form>

        <!-- Trust line -->
        <p class="hero-item mt-5 text-xs text-slate-600" style="--hero-delay:0.55s">{{ t('trust') }}</p>

        <!-- Social auth icons -->
        <div class="hero-item flex justify-start gap-4 mt-6" style="--hero-delay:0.65s">
          <button
            type="button"
            @click="loginGoogle"
            class="p-2.5 rounded-lg hover:scale-110 transition-transform duration-300 shadow-lg bg-white/10 hover:bg-white/20"
            aria-label="Login with Google"
            title="Login with Google"
          >
            <svg class="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
          </button>
          <button
            type="button"
            @click="loginMicrosoft"
            class="p-2.5 rounded-lg hover:scale-110 transition-transform duration-300 shadow-lg bg-white/10 hover:bg-white/20"
            aria-label="Login with Microsoft"
            title="Login with Microsoft"
          >
            <svg class="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path fill="#0078D4" d="M11.4 24H0V12.6h11.4V24zM24 24H12.6V12.6H24V24zM11.4 11.4H0V0h11.4v11.4zm12.6 0H12.6V0H24v11.4z"/>
            </svg>
          </button>
        </div>

        <!-- Scroll indicator -->
        <div class="mt-10 flex flex-col items-start gap-2">
          <span class="text-[10px] font-bold tracking-[0.2em] uppercase text-white/20">{{ t('scroll') }}</span>
          <div class="w-px h-8 bg-gradient-to-b from-white/20 to-transparent"></div>
        </div>
      </div>

      <!-- RIGHT: Product mockup -->
      <div class="relative flex items-center justify-center lg:justify-end">
        <!-- Glow behind card -->
        <div aria-hidden="true" class="absolute inset-0 m-auto w-72 h-72 bg-emerald-500/10 blur-3xl rounded-full pointer-events-none"></div>

        <!-- 3D perspective wrapper (JS mouse-tracking tilt) -->
        <div
          ref="heroCardRef"
          class="card-reveal [perspective:1500px] relative w-full max-w-sm cursor-pointer"
          @mousemove="onCardMouseMove"
          @mouseleave="onCardMouseLeave"
        >

          <!-- Card with 3D tilt -->
          <div
            class="card-tilt [transform-style:preserve-3d]"
            :style="{ transform: cardTransform, transition: cardTransition }"
          >
            <!-- Main card -->
            <div class="card-inner relative rounded-2xl bg-slate-900/95 backdrop-blur-md p-6 overflow-hidden shadow-[0_25px_60px_rgba(0,0,0,0.7),0_0_80px_rgba(16,185,129,0.08)]">
              <!-- Inner shimmer -->
              <div aria-hidden="true" class="absolute inset-0 bg-gradient-to-br from-white/[0.04] via-transparent to-white/[0.02] pointer-events-none"></div>
              <!-- Mouse-tracking shimmer -->
              <div
                aria-hidden="true"
                class="absolute inset-0 pointer-events-none rounded-2xl"
                :style="{ background: `radial-gradient(circle at ${shimmerX}% ${shimmerY}%, rgba(255,255,255,0.11) 0%, transparent 55%)`, mixBlendMode: 'overlay' }"
              ></div>

              <!-- Card header -->
              <div class="relative flex items-center justify-between mb-5">
                <span class="text-[11px] font-bold text-slate-500 uppercase tracking-widest">{{ t('card_score_title') }}</span>
                <span class="flex items-center gap-1.5 text-[11px] text-emerald-400 font-semibold">
                  <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span> {{ t('card_live') }}
                </span>
              </div>

              <!-- Score display -->
              <div class="relative flex items-end gap-2 mb-1">
                <span class="text-[64px] font-black text-white leading-none tracking-tighter tabular-nums">{{ animScore }}</span>
                <span class="text-2xl text-slate-600 font-semibold mb-2">/100</span>
              </div>
              <div class="relative flex items-center gap-1.5 text-xs text-emerald-400 font-semibold mb-6">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
                </svg>
                {{ t('card_trend') }}
              </div>

              <!-- Category breakdown -->
              <div class="relative space-y-2.5 mb-6">
                <div v-for="cat in previewCategories" :key="cat.name" class="flex items-center gap-3">
                  <span class="text-xs text-slate-500 w-16 shrink-0">{{ cat.name }}</span>
                  <div class="flex-1 bg-white/[0.05] rounded-full h-1.5">
                    <div class="h-1.5 rounded-full" :class="cat.color" :style="{ width: cat.pct }"></div>
                  </div>
                  <span class="text-xs text-slate-300 font-medium w-12 text-right tabular-nums">{{ cat.amount }}</span>
                </div>
              </div>

              <!-- Goal row -->
              <div class="relative rounded-xl bg-emerald-500/[0.07] border border-emerald-500/20 p-4">
                <div class="flex items-center justify-between mb-2">
                  <span class="text-xs font-bold text-white">🎯 {{ t('card_goal_name') }}</span>
                  <span class="text-xs font-bold text-emerald-400">40%</span>
                </div>
                <div class="w-full bg-white/[0.06] rounded-full h-1.5 mb-2">
                  <div class="w-2/5 h-1.5 rounded-full bg-gradient-to-r from-emerald-500 to-teal-400"></div>
                </div>
                <p class="text-[11px] text-slate-500">{{ t('card_goal_detail') }}</p>
              </div>
            </div>
          </div>

          <!-- Floating badge: top-right -->
          <div aria-hidden="true" class="badge-reveal absolute -top-3 -right-3 z-40 bg-gradient-to-br from-emerald-400 to-teal-500 text-white text-[11px] font-extrabold px-3 py-1.5 rounded-full shadow-lg shadow-emerald-500/30 tracking-wide">
            {{ t('card_ai_badge') }}
          </div>

          <!-- Floating notification: bottom-left -->
          <div aria-hidden="true" class="notif-reveal absolute -bottom-5 -left-3 lg:-left-8 z-40 hidden sm:flex items-center gap-3 bg-slate-900 border border-white/10 rounded-2xl px-4 py-3 shadow-2xl shadow-black/50">
            <div class="w-8 h-8 rounded-full bg-amber-500/15 border border-amber-500/20 flex items-center justify-center text-base shrink-0">💡</div>
            <div>
              <p class="text-[11px] font-bold text-white leading-tight">{{ t('card_notif_title') }}</p>
              <p class="text-[11px] text-slate-500 leading-tight">{{ t('card_notif_body') }}</p>
            </div>
          </div>

        </div>
      </div>
    </section>

    <!-- ── Insight preview strip ── -->
    <div ref="insightStripRef" class="insight-strip max-w-7xl mx-auto px-6 pt-0 pb-2">
      <!-- Label -->
      <p class="insight-label text-[10px] font-bold tracking-[0.18em] uppercase text-slate-600 text-center mb-5">{{ t('insight_label') }}</p>
      <!-- Cards grid -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">

        <!-- Card 1 — Emotional patterns -->
        <div class="insight-card group relative rounded-2xl border border-white/[0.06] bg-gradient-to-b from-slate-900/70 to-slate-950/60 backdrop-blur-sm overflow-hidden hover:-translate-y-1 hover:border-emerald-500/30 transition-all duration-300" style="--insight-delay:0.05s">
          <!-- Top gradient accent bar -->
          <div class="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-emerald-400 to-transparent opacity-60 group-hover:opacity-100 transition-opacity duration-300"></div>
          <!-- Subtle glow on hover -->
          <div class="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(16,185,129,0.05)_0%,transparent_60%)] opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          <div class="relative p-5">
            <div class="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-4">
                <svg class="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" stroke-width="1.75" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" /></svg>
            </div>
            <p class="text-sm font-bold text-white mb-1.5 leading-tight tracking-tight">{{ t('insight1_title') }}</p>
            <p class="text-[11px] text-slate-500 leading-relaxed">{{ t('insight1_desc') }}</p>
          </div>
        </div>

        <!-- Card 2 — Real saving potential -->
        <div class="insight-card group relative rounded-2xl border border-white/[0.06] bg-gradient-to-b from-slate-900/70 to-slate-950/60 backdrop-blur-sm overflow-hidden hover:-translate-y-1 hover:border-teal-500/30 transition-all duration-300" style="--insight-delay:0.15s">
          <div class="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-teal-400 to-transparent opacity-60 group-hover:opacity-100 transition-opacity duration-300"></div>
          <div class="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(20,184,166,0.05)_0%,transparent_60%)] opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          <div class="relative p-5">
            <div class="w-8 h-8 rounded-lg bg-teal-500/10 border border-teal-500/20 flex items-center justify-center mb-4">
                <svg class="w-4 h-4 text-teal-400" fill="none" stroke="currentColor" stroke-width="1.75" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75" /></svg>
            </div>
            <p class="text-sm font-bold text-white mb-1.5 leading-tight tracking-tight">{{ t('insight2_title') }}</p>
            <p class="text-[11px] text-slate-500 leading-relaxed">{{ t('insight2_desc') }}</p>
          </div>
        </div>

        <!-- Card 3 — Investment capacity -->
        <div class="insight-card group relative rounded-2xl border border-white/[0.06] bg-gradient-to-b from-slate-900/70 to-slate-950/60 backdrop-blur-sm overflow-hidden hover:-translate-y-1 hover:border-indigo-500/30 transition-all duration-300" style="--insight-delay:0.25s">
          <div class="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-indigo-400 to-transparent opacity-60 group-hover:opacity-100 transition-opacity duration-300"></div>
          <div class="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(99,102,241,0.05)_0%,transparent_60%)] opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          <div class="relative p-5">
            <div class="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mb-4">
                <svg class="w-4 h-4 text-indigo-400" fill="none" stroke="currentColor" stroke-width="1.75" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" /></svg>
            </div>
            <p class="text-sm font-bold text-white mb-1.5 leading-tight tracking-tight">{{ t('insight3_title') }}</p>
            <p class="text-[11px] text-slate-500 leading-relaxed">{{ t('insight3_desc') }}</p>
          </div>
        </div>

        <!-- Card 4 — Goals with a date -->
        <div class="insight-card group relative rounded-2xl border border-white/[0.06] bg-gradient-to-b from-slate-900/70 to-slate-950/60 backdrop-blur-sm overflow-hidden hover:-translate-y-1 hover:border-amber-500/30 transition-all duration-300" style="--insight-delay:0.35s">
          <div class="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-amber-400 to-transparent opacity-60 group-hover:opacity-100 transition-opacity duration-300"></div>
          <div class="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(245,158,11,0.05)_0%,transparent_60%)] opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          <div class="relative p-5">
            <div class="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-4">
                <svg class="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" stroke-width="1.75" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" /></svg>
            </div>
            <p class="text-sm font-bold text-white mb-1.5 leading-tight tracking-tight">{{ t('insight4_title') }}</p>
            <p class="text-[11px] text-slate-500 leading-relaxed">{{ t('insight4_desc') }}</p>
          </div>
        </div>

      </div>
    </div>

    <!-- ── Stats strip ── -->
    <div class="max-w-7xl mx-auto px-6 pb-4 mt-2">
      <div class="grid grid-cols-3 divide-x divide-white/[0.06] border border-white/[0.06] rounded-2xl overflow-hidden bg-white/[0.02]">
        <div class="px-3 sm:px-6 py-6 sm:py-7 text-center">
          <div class="text-2xl sm:text-3xl font-black text-white tracking-tight">30s</div>
          <div class="text-[10px] sm:text-xs text-slate-600 mt-1.5 font-medium">{{ t('stat1') }}</div>
        </div>
        <div class="px-3 sm:px-6 py-6 sm:py-7 text-center">
          <div class="text-2xl sm:text-3xl font-black text-white tracking-tight">100%</div>
          <div class="text-[10px] sm:text-xs text-slate-600 mt-1.5 font-medium">{{ t('stat2') }}</div>
        </div>
        <div class="px-3 sm:px-6 py-6 sm:py-7 text-center">
          <div class="text-2xl sm:text-3xl font-black text-emerald-400 tracking-tight">AI</div>
          <div class="text-[10px] sm:text-xs text-slate-600 mt-1.5 font-medium">{{ t('stat3') }}</div>
        </div>
      </div>
    </div>

    <!-- ── Investor Agent Feature Section ── -->
    <section ref="investorSectionRef" class="investor-section relative max-w-7xl mx-auto px-6 pb-20 lg:pb-24">
      <div class="rounded-3xl overflow-hidden border border-white/[0.06] bg-gradient-to-br from-slate-900/80 to-indigo-950/30 backdrop-blur-sm p-8 lg:p-14">
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center">

          <!-- LEFT: copy -->
          <div>
            <div class="inv-item inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-indigo-500/25 bg-indigo-500/10 text-indigo-400 text-xs font-semibold tracking-widest uppercase mb-6" style="--inv-delay:0.05s">
              <span>📈</span> {{ t('inv_landing_badge') }}
            </div>
            <h2 class="inv-item text-3xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight mb-5" style="--inv-delay:0.15s">
              {{ t('inv_landing_title') }}
            </h2>
            <p class="inv-item text-slate-400 leading-relaxed mb-8 max-w-lg" style="--inv-delay:0.22s">
              {{ t('inv_landing_desc') }}
            </p>
            <ul class="inv-item space-y-3.5 mb-10" style="--inv-delay:0.3s">
              <li v-for="feat in investorFeatures" :key="feat" class="flex items-start gap-3">
                <span class="w-5 h-5 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 text-[10px] shrink-0 mt-0.5 font-bold">✓</span>
                <span class="text-sm text-slate-300 leading-relaxed">{{ feat }}</span>
              </li>
            </ul>
            <NuxtLink
              to="/get-started"
              class="inv-item inline-flex items-center gap-2 px-7 py-3.5 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white font-bold text-sm shadow-xl shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:-translate-y-px transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
              style="--inv-delay:0.38s"
            >
              {{ t('inv_landing_cta') }}
            </NuxtLink>
          </div>

          <!-- RIGHT: mock stock card -->
          <div class="inv-card relative flex justify-center lg:justify-end">
            <div class="w-full max-w-xs rounded-2xl bg-slate-900 border border-white/10 p-5 shadow-2xl shadow-black/60">
              <!-- header -->
              <div class="flex items-center justify-between mb-4">
                <span class="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{{ t('inv_landing_card_label') }}</span>
                <span class="flex items-center gap-1 text-[10px] text-emerald-400 font-semibold bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                  <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span> LIVE
                </span>
              </div>
              <!-- company row -->
              <div class="flex items-center gap-3 mb-5">
                <div class="w-11 h-11 rounded-xl bg-blue-500/15 border border-blue-500/20 flex items-center justify-center text-lg font-black text-blue-300 shrink-0">M</div>
                <div class="min-w-0">
                  <div class="text-base font-black text-white">MSFT</div>
                  <div class="text-[11px] text-slate-500 truncate">Microsoft Corporation</div>
                </div>
                <div class="ml-auto text-right shrink-0">
                  <div class="text-xl font-black text-emerald-400 leading-none">8.4<span class="text-xs text-slate-500 font-normal">/10</span></div>
                  <div class="text-[10px] text-emerald-400 font-bold mt-0.5">BUY 🟢</div>
                </div>
              </div>
              <!-- score axes -->
              <div class="space-y-2 mb-4">
                <div v-for="axis in investorAxes" :key="axis.label" class="flex items-center gap-2.5">
                  <span class="text-[10px] text-slate-500 w-24 shrink-0">{{ axis.label }}</span>
                  <div class="flex-1 bg-white/[0.05] rounded-full h-1">
                    <div class="h-1 rounded-full" :class="axis.color" :style="{ width: axis.pct }"></div>
                  </div>
                  <span class="text-[10px] text-slate-300 font-semibold w-7 text-right">{{ axis.score }}</span>
                </div>
              </div>
              <!-- nudge -->
              <div class="rounded-xl bg-emerald-500/[0.07] border border-emerald-500/20 p-3 flex items-start gap-2">
                <span class="text-sm shrink-0">💡</span>
                <p class="text-[10px] text-emerald-300 leading-relaxed">{{ t('inv_landing_nudge') }}</p>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>

    <!-- ── How it works ── -->
    <section ref="howItWorksRef" class="how-section relative max-w-7xl mx-auto px-6 pb-28">

      <!-- Section header -->
      <div class="how-header text-center mb-14">
        <p class="text-xs font-bold text-slate-600 uppercase tracking-widest mb-3">{{ t('how_it_works') }}</p>
        <h2 class="text-3xl font-bold text-white tracking-tight">{{ t('steps_heading') }}</h2>
      </div>

      <!-- Cards -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-5 relative">

        <!-- Connector line (desktop only) -->
        <div aria-hidden="true" class="how-connector hidden md:block absolute top-10 left-1/3 right-1/3 h-px bg-gradient-to-r from-blue-400/30 via-pink-400/30 to-emerald-400/30"></div>

        <!-- Card 1 -->
        <div
          class="how-card group relative rounded-2xl backdrop-blur-sm p-7 hover:-translate-y-1.5 hover:shadow-2xl hover:shadow-black/50 transition-all duration-300"
          style="--how-delay:0.1s;background-color:#060c1a;background-image:radial-gradient(at 88% 40%,hsla(222,47%,6%,1) 0px,transparent 85%),radial-gradient(at 49% 30%,hsla(222,47%,6%,1) 0px,transparent 85%),radial-gradient(at 14% 26%,hsla(222,47%,6%,1) 0px,transparent 85%),radial-gradient(at 0% 64%,hsla(210,100%,56%,.6) 0px,transparent 85%),radial-gradient(at 41% 94%,hsla(195,100%,80%,.4) 0px,transparent 85%),radial-gradient(at 100% 99%,hsla(224,100%,70%,.5) 0px,transparent 85%);box-shadow:0px -16px 24px 0px rgba(255,255,255,.07) inset;"
        >
          <div class="step-border"></div>
          <div class="absolute inset-x-0 top-0 h-px rounded-t-2xl bg-gradient-to-r from-transparent via-blue-400/60 to-transparent"></div>
          <div class="flex items-center justify-between mb-6">
            <div class="w-11 h-11 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center group-hover:scale-110 group-hover:bg-blue-500/15 transition-all duration-300">
              <svg class="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" stroke-width="1.75" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
              </svg>
            </div>
            <span class="text-4xl font-black text-white/[0.04] group-hover:text-white/[0.15] select-none tabular-nums transition-all duration-300">01</span>
          </div>
          <h3 class="text-base font-bold text-white mb-2.5">{{ t('card1_title') }}</h3>
          <p class="text-sm text-slate-400 leading-relaxed">{{ t('card1_desc') }}</p>
          <p class="mt-3 text-xs text-amber-400/80 leading-relaxed">{{ t('card1_warning') }}</p>
          <div class="mt-5 flex items-center gap-1.5 text-xs text-blue-400 font-semibold opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <span>{{ t('card1_link') }}</span>
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" /></svg>
          </div>
        </div>

        <!-- Card 2 -->
        <div
          class="how-card group relative rounded-2xl backdrop-blur-sm p-7 hover:-translate-y-1.5 hover:shadow-2xl hover:shadow-black/50 transition-all duration-300"
          style="--how-delay:0.22s;background-color:#060c1a;background-image:radial-gradient(at 88% 40%,hsla(222,47%,6%,1) 0px,transparent 85%),radial-gradient(at 49% 30%,hsla(222,47%,6%,1) 0px,transparent 85%),radial-gradient(at 14% 26%,hsla(222,47%,6%,1) 0px,transparent 85%),radial-gradient(at 0% 64%,hsla(210,100%,56%,.6) 0px,transparent 85%),radial-gradient(at 41% 94%,hsla(195,100%,80%,.4) 0px,transparent 85%),radial-gradient(at 100% 99%,hsla(224,100%,70%,.5) 0px,transparent 85%);box-shadow:0px -16px 24px 0px rgba(255,255,255,.07) inset;"
        >
          <div class="step-border"></div>
          <div class="absolute inset-x-0 top-0 h-px rounded-t-2xl bg-gradient-to-r from-transparent via-blue-400/60 to-transparent"></div>
          <div class="flex items-center justify-between mb-6">
            <div class="w-11 h-11 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center group-hover:scale-110 group-hover:bg-blue-500/15 transition-all duration-300">
              <svg class="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" stroke-width="1.75" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5M9 11.25v1.5M12 9v3.75m3-6v6" />
              </svg>
            </div>
            <span class="text-4xl font-black text-white/[0.04] group-hover:text-white/[0.15] select-none tabular-nums transition-all duration-300">02</span>
          </div>
          <h3 class="text-base font-bold text-white mb-2.5">{{ t('card2_title') }}</h3>
          <p class="text-sm text-slate-400 leading-relaxed">{{ t('card2_desc') }}</p>
          <div class="mt-5 flex items-center gap-1.5 text-xs text-blue-400 font-semibold opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <span>{{ t('card2_link') }}</span>
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" /></svg>
          </div>
        </div>

        <!-- Card 3 -->
        <div
          class="how-card group relative rounded-2xl backdrop-blur-sm p-7 hover:-translate-y-1.5 hover:shadow-2xl hover:shadow-black/50 transition-all duration-300"
          style="--how-delay:0.34s;background-color:#060c1a;background-image:radial-gradient(at 88% 40%,hsla(222,47%,6%,1) 0px,transparent 85%),radial-gradient(at 49% 30%,hsla(222,47%,6%,1) 0px,transparent 85%),radial-gradient(at 14% 26%,hsla(222,47%,6%,1) 0px,transparent 85%),radial-gradient(at 0% 64%,hsla(210,100%,56%,.6) 0px,transparent 85%),radial-gradient(at 41% 94%,hsla(195,100%,80%,.4) 0px,transparent 85%),radial-gradient(at 100% 99%,hsla(224,100%,70%,.5) 0px,transparent 85%);box-shadow:0px -16px 24px 0px rgba(255,255,255,.07) inset;"
        >
          <div class="step-border"></div>
          <div class="absolute inset-x-0 top-0 h-px rounded-t-2xl bg-gradient-to-r from-transparent via-blue-400/60 to-transparent"></div>
          <div class="flex items-center justify-between mb-6">
            <div class="w-11 h-11 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center group-hover:scale-110 group-hover:bg-blue-500/15 transition-all duration-300">
              <svg class="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" stroke-width="1.75" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" d="M15.362 5.214A8.252 8.252 0 0112 21 8.25 8.25 0 016.038 7.048 8.287 8.287 0 009 9.6a8.983 8.983 0 013.361-6.867 8.21 8.21 0 003 2.48z" />
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 18a3.75 3.75 0 00.495-7.467 5.99 5.99 0 00-1.925 3.546 5.974 5.974 0 01-2.133-1.001A3.75 3.75 0 0012 18z" />
              </svg>
            </div>
            <span class="text-4xl font-black text-white/[0.04] group-hover:text-white/[0.15] select-none tabular-nums transition-all duration-300">03</span>
          </div>
          <h3 class="text-base font-bold text-white mb-2.5">{{ t('card3_title') }}</h3>
          <p class="text-sm text-slate-400 leading-relaxed">{{ t('card3_desc') }}</p>
          <div class="mt-5 flex items-center gap-1.5 text-xs text-blue-400 font-semibold opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <span>{{ t('card3_link') }}</span>
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" /></svg>
          </div>
        </div>

      </div>

      <!-- Bottom CTA -->
      <div class="how-cta mt-16 text-center">
        <NuxtLink
          to="/get-started"
          class="inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white font-bold text-sm shadow-2xl shadow-emerald-500/25 hover:shadow-emerald-500/40 hover:-translate-y-0.5 transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
        >
          {{ t('start_analysis') }}
          <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
          </svg>
        </NuxtLink>
        <p class="mt-4 text-xs text-slate-600">{{ t('trust') }}</p>
      </div>
    </section>

    <!-- ── Footer ── -->
    <footer class="border-t border-white/[0.05] py-8">
      <div class="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-700">
        <span>© {{ new Date().getFullYear() }} HabitWealth · All rights reserved</span>
        <div class="flex items-center gap-4">
          <a href="#" class="hover:text-slate-400 transition-colors">Privacy</a>
          <a href="#" class="hover:text-slate-400 transition-colors">Terms</a>
          <a href="#" class="hover:text-slate-400 transition-colors">Security</a>
        </div>
      </div>
    </footer>

  </div>
</template>

<script setup>
import { useRouter } from '#app'
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import AppLogo from '~/components/AppLogo.vue'
import AnimatedUnderlineTextOne from '~/components/ui/AnimatedUnderlineTextOne.vue'
import LetterReveal from '~/components/ui/LetterReveal.vue'

const router = useRouter()
const name = ref('')
const { locale, setLocale, t } = useI18n()

const locales = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Español' }
]

// ── Card animation ─────────────────────────────────────────────────
const animScore       = ref(62)
const animShoppingPct = ref(54)
const animSavingsPct  = ref(16)
const animShoppingAmt = ref(332)
const animSavingsAmt  = ref(100)

let _animFrameId   = null
let _cardAnimating = false

const BAD  = { score: 62, shopPct: 54, savePct: 16, shopAmt: 332, saveAmt: 100 }
const GOOD = { score: 84, shopPct: 24, savePct: 56, shopAmt: 148, saveAmt: 348 }

function _eio(t) { return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t }
function _lerp(a, b, t) { return a + (b - a) * t }

function _startCardAnimation() {
  // Runs once: BAD → GOOD, no loop
  // Simultaneously drives 3D tilt via sin(π·progress) → peak 22° at midpoint
  const DURATION = 3200
  let origin = null
  _cardAnimating = true
  cardTransition.value = 'none'

  function frame(now) {
    if (!origin) origin = now
    const elapsed = now - origin

    if (elapsed >= DURATION) {
      // Finalise values
      animScore.value       = GOOD.score
      animShoppingPct.value = GOOD.shopPct
      animSavingsPct.value  = GOOD.savePct
      animShoppingAmt.value = GOOD.shopAmt
      animSavingsAmt.value  = GOOD.saveAmt
      // Return card to flat so mouse-hover takes over cleanly
      cardTransition.value = 'transform 0.9s cubic-bezier(0.22,0.61,0.36,1)'
      cardTransform.value  = 'rotateX(0deg) rotateY(0deg) scale(1)'
      shimmerX.value = 50
      shimmerY.value = 50
      _cardAnimating = false
      return
    }

    const progress = elapsed / DURATION          // 0 → 1 linear
    const e        = _eio(progress)              // eased for values

    // Tilt: arc using sin(π·progress) — 0 at start, peak at midpoint, 0 at end
    const arc    = Math.sin(Math.PI * progress)
    const ry     =  arc * 22   // rotateY up to +22°
    const rx     = -arc * 12   // rotateX up to -12° (leans back)
    const sc     = 1 + arc * 0.04

    animScore.value       = Math.round(_lerp(BAD.score,   GOOD.score,   e))
    animShoppingPct.value = Math.round(_lerp(BAD.shopPct, GOOD.shopPct, e))
    animSavingsPct.value  = Math.round(_lerp(BAD.savePct, GOOD.savePct, e))
    animShoppingAmt.value = Math.round(_lerp(BAD.shopAmt, GOOD.shopAmt, e))
    animSavingsAmt.value  = Math.round(_lerp(BAD.saveAmt, GOOD.saveAmt, e))

    cardTransform.value  = `rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg) scale(${sc.toFixed(3)})`
    shimmerX.value = Math.round(50 + arc * 30)
    shimmerY.value = Math.round(50 - arc * 20)

    _animFrameId = requestAnimationFrame(frame)
  }
  _animFrameId = requestAnimationFrame(frame)
}

onMounted(() => {
  _startCardAnimation()

  // Insight cards: animate on scroll into view
  const io = new IntersectionObserver(([entry]) => {
    if (entry.isIntersecting) {
      insightStripRef.value?.classList.add('insights-visible')
      io.disconnect()
    }
  }, { threshold: 0.12 })
  if (insightStripRef.value) io.observe(insightStripRef.value)

  // Investor section: animate on scroll into view
  const io2 = new IntersectionObserver(([entry]) => {
    if (entry.isIntersecting) {
      investorSectionRef.value?.classList.add('investor-visible')
      io2.disconnect()
    }
  }, { threshold: 0.1 })
  if (investorSectionRef.value) io2.observe(investorSectionRef.value)

  // How it works: animate on scroll into view
  const io3 = new IntersectionObserver(([entry]) => {
    if (entry.isIntersecting) {
      howItWorksRef.value?.classList.add('how-visible')
      io3.disconnect()
    }
  }, { threshold: 0.08 })
  if (howItWorksRef.value) io3.observe(howItWorksRef.value)
})
onUnmounted(() => { if (_animFrameId) cancelAnimationFrame(_animFrameId) })

// ── Hero card: JS mouse-tracking 3D tilt ──────────────────────────
const heroCardRef     = ref(null)
const insightStripRef  = ref(null)
const investorSectionRef = ref(null)
const howItWorksRef      = ref(null)
const cardTransform  = ref('rotateX(0deg) rotateY(0deg) scale(1)')
const cardTransition = ref('transform 0.7s cubic-bezier(0.22,0.61,0.36,1)')
const shimmerX = ref(50)
const shimmerY = ref(50)

function onCardMouseMove(e) {
  if (_cardAnimating) return          // don't fight the intro animation
  const el = heroCardRef.value
  if (!el) return
  const rect = el.getBoundingClientRect()
  const cx = (e.clientX - rect.left) / rect.width
  const cy = (e.clientY - rect.top)  / rect.height
  cardTransition.value = 'transform 0.08s ease-out'
  cardTransform.value  = `rotateX(${(-(cy - 0.5) * 18).toFixed(1)}deg) rotateY(${((cx - 0.5) * 22).toFixed(1)}deg) scale(1.04)`
  shimmerX.value = Math.round(cx * 100)
  shimmerY.value = Math.round(cy * 100)
}

function onCardMouseLeave() {
  if (_cardAnimating) return
  cardTransition.value = 'transform 0.7s cubic-bezier(0.22,0.61,0.36,1)'
  cardTransform.value  = 'rotateX(0deg) rotateY(0deg) scale(1)'
  shimmerX.value = 50
  shimmerY.value = 50
}
// ───────────────────────────────────────────────────────────────────

const previewCategories = computed(() => [
  { name: t('cat_food'),      pct: '72%',                          amount: '€445',                          color: 'bg-emerald-500' },
  { name: t('cat_transport'), pct: '35%',                          amount: '€216',                          color: 'bg-teal-400' },
  { name: t('cat_shopping'),  pct: `${animShoppingPct.value}%`,    amount: `€${animShoppingAmt.value}`,     color: 'bg-pink-400' },
  { name: t('cat_savings'),   pct: `${animSavingsPct.value}%`,     amount: `€${animSavingsAmt.value}`,      color: 'bg-cyan-400' },
])

const investorAxes = computed(() => [
  { label: t('inv_landing_axis_health'),    pct: '85%', score: '8.5', color: 'bg-emerald-400' },
  { label: t('inv_landing_axis_growth'),    pct: '78%', score: '7.8', color: 'bg-teal-400' },
  { label: t('inv_landing_axis_valuation'), pct: '70%', score: '7.0', color: 'bg-amber-400' },
  { label: t('inv_landing_axis_risk'),      pct: '82%', score: '8.2', color: 'bg-blue-400' },
])

const investorFeatures = computed(() => [
  t('inv_landing_feat1'),
  t('inv_landing_feat2'),
  t('inv_landing_feat3'),
  t('inv_landing_feat4'),
])

// ── SEO ────────────────────────────────────────────────────────────
useSeoMeta({
  title: 'HabitWealth — AI Financial Wellness & Investor Agent',
  ogTitle: 'HabitWealth — AI Financial Wellness & Investor Agent',
  description: 'Upload your bank statements and let AI detect emotional spending patterns, compute your Financial Stress Index, and guide your investments with a real-time AI Investor Agent (BUY/HOLD/SELL).',
  ogDescription: 'AI-powered financial wellness: emotional spending analysis, personalized CBT nudges, and a live AI Investor Agent that scores any stock from Yahoo Finance.',
  twitterCard: 'summary_large_image',
})
useHead({
  htmlAttrs: { lang: locale },
  link: [{ rel: 'canonical', href: 'https://lemon-tree-0cc9df103.2.azurestaticapps.net' }],
  meta: [
    { name: 'keywords', content: 'financial wellness AI, investor agent, emotional spending, financial stress index, stock analysis AI, GPT-4o-mini, personal finance app, habit tracking, AI investment advisor' },
    { property: 'og:type', content: 'website' },
  ],
})

function start() {
  router.push({ path: '/get-started', query: { name: name.value } })
}

function loginGoogle() {
  const baseUrl = globalThis.location.origin
  const redirect = encodeURIComponent(`${baseUrl}/get-started`)
  globalThis.location.href = `/.auth/login/google?post_login_redirect_uri=${redirect}`
}

function loginMicrosoft() {
  const baseUrl = globalThis.location.origin
  const redirect = encodeURIComponent(`${baseUrl}/get-started`)
  globalThis.location.href = `/.auth/login/aad?post_login_redirect_uri=${redirect}`
}
</script>

<style scoped>
/* ── How it works entrance (scroll-triggered) ── */
.how-header,
.how-connector,
.how-card,
.how-cta {
  opacity: 0;
  transform: translateY(26px);
  filter: blur(4px);
}
.how-section.how-visible .how-header {
  animation: hero-fade-up 0.65s cubic-bezier(0.16, 1, 0.3, 1) 0s both;
}
.how-section.how-visible .how-connector {
  animation: how-line-in 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.15s both;
}
.how-section.how-visible .how-card {
  animation: hero-fade-up 0.75s cubic-bezier(0.16, 1, 0.3, 1) var(--how-delay, 0s) both;
}
.how-section.how-visible .how-cta {
  animation: hero-fade-up 0.65s cubic-bezier(0.16, 1, 0.3, 1) 0.5s both;
}

@keyframes how-line-in {
  from { opacity: 0; transform: scaleX(0); filter: blur(2px); }
  to   { opacity: 1; transform: scaleX(1); filter: blur(0); }
}

/* ── Investor section entrance (scroll-triggered) ── */
.inv-item {
  opacity: 0;
  transform: translateY(22px);
  filter: blur(4px);
}
.investor-visible .inv-item {
  animation: hero-fade-up 0.75s cubic-bezier(0.16, 1, 0.3, 1) var(--inv-delay, 0s) both;
}

.inv-card {
  opacity: 0;
  transform: translateX(36px) translateY(10px) scale(0.96);
  filter: blur(5px);
}
.investor-visible .inv-card {
  animation: inv-card-enter 0.9s cubic-bezier(0.16, 1, 0.3, 1) 0.2s both;
}

@keyframes inv-card-enter {
  from {
    opacity: 0;
    transform: translateX(36px) translateY(10px) scale(0.96);
    filter: blur(5px);
  }
  to {
    opacity: 1;
    transform: translateX(0) translateY(0) scale(1);
    filter: blur(0);
  }
}

/* ── Insight cards entrance (scroll-triggered) ── */
.insight-label {
  opacity: 0;
}
.insights-visible .insight-label {
  animation: hero-fade-up 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0s both;
}

.insight-card {
  opacity: 0;
  transform: translateY(28px) scale(0.96);
  filter: blur(5px);
}
.insights-visible .insight-card {
  animation: insight-in 0.75s cubic-bezier(0.16, 1, 0.3, 1) var(--insight-delay, 0s) both;
}

@keyframes insight-in {
  from {
    opacity: 0;
    transform: translateY(28px) scale(0.96);
    filter: blur(5px);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
    filter: blur(0);
  }
}

/* ── Hero card entrance ── */
.card-reveal {
  animation: card-enter 1s cubic-bezier(0.16, 1, 0.3, 1) 0.45s both;
}

.badge-reveal {
  animation: badge-pop 0.55s cubic-bezier(0.34, 1.56, 0.64, 1) 1.0s both;
}

.notif-reveal {
  animation: notif-slide-up 0.65s cubic-bezier(0.16, 1, 0.3, 1) 1.25s both;
}

@keyframes card-enter {
  from {
    opacity: 0;
    transform: translateX(48px) translateY(12px) scale(0.94);
    filter: blur(6px);
  }
  to {
    opacity: 1;
    transform: translateX(0) translateY(0) scale(1);
    filter: blur(0);
  }
}

@keyframes badge-pop {
  from {
    opacity: 0;
    transform: scale(0.5) translateY(-6px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

@keyframes notif-slide-up {
  from {
    opacity: 0;
    transform: translateY(16px) scale(0.96);
    filter: blur(4px);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
    filter: blur(0);
  }
}

/* ── Hero entrance animation ── */
.hero-item {
  animation: hero-fade-up 0.75s cubic-bezier(0.16, 1, 0.3, 1) var(--hero-delay, 0s) both;
}

@keyframes hero-fade-up {
  from { opacity: 0; transform: translateY(20px); filter: blur(5px); }
  to   { opacity: 1; transform: translateY(0);    filter: blur(0); }
}

/* ── Static gradient border for step cards ── */
.step-border {
  pointer-events: none;
  position: absolute;
  inset: -1px;
  border-radius: 1rem;
  z-index: -1;
  background: linear-gradient(160deg, rgba(96,165,250,.22) -50%, rgba(96,165,250,.04) 100%);
}

/* ── 3D tilt product card with spinning conic border ── */
.card-tilt {
  position: relative;
}

/* Spinning border layer */
.card-tilt::before {
  content: '';
  position: absolute;
  inset: -2px;
  border-radius: 1.125rem;
  background: conic-gradient(from 0deg at 50% 50%, #10b981 0%, #06b6d4 25%, #6366f1 50%, #8b5cf6 65%, #10b981 100%);
  animation: card-border-hue 4s linear infinite;
  z-index: 0;
}

/* Glow halo behind the card */
.card-tilt::after {
  content: '';
  position: absolute;
  inset: -8px;
  border-radius: 1.5rem;
  background: conic-gradient(from 0deg at 50% 50%, #10b981 0%, #06b6d4 25%, #6366f1 50%, #8b5cf6 65%, #10b981 100%);
  animation: card-border-hue-glow 4s linear infinite;
  opacity: 0.35;
  z-index: -1;
}

/* Card inner content — sits above the conic border */
.card-inner {
  position: relative;
  z-index: 1;
}

@keyframes card-border-hue {
  to { filter: hue-rotate(360deg); }
}

@keyframes card-border-hue-glow {
  from { filter: blur(18px) hue-rotate(0deg); }
  to   { filter: blur(18px) hue-rotate(360deg); }
}
</style>
