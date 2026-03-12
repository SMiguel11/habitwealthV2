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
    <section class="relative max-w-7xl mx-auto px-6 pt-20 pb-20 lg:pt-28 lg:pb-20 grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">

      <!-- LEFT: Content -->
      <div>
        <!-- Badge -->
        <div class="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-emerald-500/25 bg-emerald-500/8 text-emerald-400 text-xs font-semibold tracking-widest uppercase mb-8">
          <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
          {{ t('badge') }}
        </div>

        <!-- Headline -->
        <h1 class="text-5xl sm:text-6xl xl:text-[4.5rem] font-extrabold tracking-tight leading-[1.04] mb-6">
          <AnimatedUnderlineTextOne
            :text="`${t('headline_part1')}${t('headline_part2')}`"
            text-class-name="text-5xl sm:text-6xl xl:text-[4.5rem] font-extrabold tracking-tight leading-[1.04] bg-gradient-to-r from-emerald-300 via-teal-200 to-cyan-300 bg-clip-text text-transparent"
            underline-path="M 0,12 Q 75,4 150,12 Q 225,20 300,12"
            underline-hover-path="M 0,12 Q 75,20 150,12 Q 225,4 300,12"
            :underline-duration="1.2"
            underline-color="#34d399"
          />
        </h1>

        <!-- Subtitle -->
        <p class="text-lg text-slate-400 leading-relaxed mb-9 max-w-lg">
          {{ t('subtitle') }}
          <span class="text-slate-200 font-medium"> {{ t('subtitle_highlight') }}</span>.
          {{ t('subtitle_end') }}
        </p>

        <!-- Form -->
        <form @submit.prevent="start" novalidate class="flex flex-col sm:flex-row gap-2.5 max-w-md">
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
        <p class="mt-5 text-xs text-slate-600">{{ t('trust') }}</p>

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

        <!-- 3D perspective wrapper -->
        <div class="[perspective:1500px] relative w-full max-w-sm">

          <!-- Invisible 3×3 hover zones -->
          <div aria-hidden="true" class="absolute inset-0 z-30 grid grid-cols-3 grid-rows-3 pointer-events-auto">
            <div class="peer/tl"></div>
            <div class="peer/tc"></div>
            <div class="peer/tr"></div>
            <div class="peer/ml"></div>
            <div class="peer/cc"></div>
            <div class="peer/mr"></div>
            <div class="peer/bl"></div>
            <div class="peer/bc"></div>
            <div class="peer/br"></div>
          </div>

          <!-- Card with 3D tilt -->
          <div class="card-tilt transition-all duration-300 ease-out [transform-style:preserve-3d]
            peer-hover/tl:[transform:rotateX(8deg)_rotateY(-8deg)_scale(1.03)]
            peer-hover/tc:[transform:rotateX(10deg)_rotateY(0deg)_scale(1.03)]
            peer-hover/tr:[transform:rotateX(8deg)_rotateY(8deg)_scale(1.03)]
            peer-hover/ml:[transform:rotateX(0deg)_rotateY(-10deg)_scale(1.03)]
            peer-hover/cc:[transform:rotateX(0deg)_rotateY(0deg)_scale(1.05)]
            peer-hover/mr:[transform:rotateX(0deg)_rotateY(10deg)_scale(1.03)]
            peer-hover/bl:[transform:rotateX(-8deg)_rotateY(-8deg)_scale(1.03)]
            peer-hover/bc:[transform:rotateX(-10deg)_rotateY(0deg)_scale(1.03)]
            peer-hover/br:[transform:rotateX(-8deg)_rotateY(8deg)_scale(1.03)]
          ">
            <!-- Main card -->
            <div class="card-inner relative rounded-2xl bg-slate-900/95 backdrop-blur-md p-6 overflow-hidden shadow-[0_25px_60px_rgba(0,0,0,0.7),0_0_80px_rgba(16,185,129,0.08)]">
              <!-- Inner shimmer -->
              <div aria-hidden="true" class="absolute inset-0 bg-gradient-to-br from-white/[0.04] via-transparent to-white/[0.02] pointer-events-none"></div>

              <!-- Card header -->
              <div class="relative flex items-center justify-between mb-5">
                <span class="text-[11px] font-bold text-slate-500 uppercase tracking-widest">{{ t('card_score_title') }}</span>
                <span class="flex items-center gap-1.5 text-[11px] text-emerald-400 font-semibold">
                  <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span> {{ t('card_live') }}
                </span>
              </div>

              <!-- Score display -->
              <div class="relative flex items-end gap-2 mb-1">
                <span class="text-[64px] font-black text-white leading-none tracking-tighter">84</span>
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
                    <div class="h-1.5 rounded-full transition-all" :class="cat.color" :style="{ width: cat.pct }"></div>
                  </div>
                  <span class="text-xs text-slate-300 font-medium w-12 text-right">{{ cat.amount }}</span>
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
          <div aria-hidden="true" class="absolute -top-3 -right-3 z-40 bg-gradient-to-br from-emerald-400 to-teal-500 text-white text-[11px] font-extrabold px-3 py-1.5 rounded-full shadow-lg shadow-emerald-500/30 tracking-wide">
            {{ t('card_ai_badge') }}
          </div>

          <!-- Floating notification: bottom-left -->
          <div aria-hidden="true" class="absolute -bottom-5 -left-3 lg:-left-8 z-40 hidden sm:flex items-center gap-3 bg-slate-900 border border-white/10 rounded-2xl px-4 py-3 shadow-2xl shadow-black/50">
            <div class="w-8 h-8 rounded-full bg-amber-500/15 border border-amber-500/20 flex items-center justify-center text-base shrink-0">💡</div>
            <div>
              <p class="text-[11px] font-bold text-white leading-tight">{{ t('card_notif_title') }}</p>
              <p class="text-[11px] text-slate-500 leading-tight">{{ t('card_notif_body') }}</p>
            </div>
          </div>

        </div>
      </div>
    </section>

    <!-- ── Stats strip ── -->
    <div class="max-w-7xl mx-auto px-6 pb-16 mt-8 lg:mt-16">
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

    <!-- ── How it works ── -->
    <section class="relative max-w-7xl mx-auto px-6 pb-28">

      <!-- Section header -->
      <div class="text-center mb-14">
        <p class="text-xs font-bold text-slate-600 uppercase tracking-widest mb-3">{{ t('how_it_works') }}</p>
        <h2 class="text-3xl font-bold text-white tracking-tight">{{ t('steps_heading') }}</h2>
      </div>

      <!-- Cards -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-5 relative">

        <!-- Connector line (desktop only) -->
        <div aria-hidden="true" class="hidden md:block absolute top-10 left-1/3 right-1/3 h-px bg-gradient-to-r from-blue-400/30 via-pink-400/30 to-emerald-400/30"></div>

        <!-- Card 1 -->
        <div
          class="group relative rounded-2xl backdrop-blur-sm p-7 hover:-translate-y-1.5 hover:shadow-2xl hover:shadow-black/50 transition-all duration-300"
          style="background-color:#060c1a;background-image:radial-gradient(at 88% 40%,hsla(222,47%,6%,1) 0px,transparent 85%),radial-gradient(at 49% 30%,hsla(222,47%,6%,1) 0px,transparent 85%),radial-gradient(at 14% 26%,hsla(222,47%,6%,1) 0px,transparent 85%),radial-gradient(at 0% 64%,hsla(210,100%,56%,.6) 0px,transparent 85%),radial-gradient(at 41% 94%,hsla(195,100%,80%,.4) 0px,transparent 85%),radial-gradient(at 100% 99%,hsla(224,100%,70%,.5) 0px,transparent 85%);box-shadow:0px -16px 24px 0px rgba(255,255,255,.07) inset;"
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
          <div class="mt-5 flex items-center gap-1.5 text-xs text-blue-400 font-semibold opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <span>{{ t('card1_link') }}</span>
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" /></svg>
          </div>
        </div>

        <!-- Card 2 -->
        <div
          class="group relative rounded-2xl backdrop-blur-sm p-7 hover:-translate-y-1.5 hover:shadow-2xl hover:shadow-black/50 transition-all duration-300"
          style="background-color:#060c1a;background-image:radial-gradient(at 88% 40%,hsla(222,47%,6%,1) 0px,transparent 85%),radial-gradient(at 49% 30%,hsla(222,47%,6%,1) 0px,transparent 85%),radial-gradient(at 14% 26%,hsla(222,47%,6%,1) 0px,transparent 85%),radial-gradient(at 0% 64%,hsla(210,100%,56%,.6) 0px,transparent 85%),radial-gradient(at 41% 94%,hsla(195,100%,80%,.4) 0px,transparent 85%),radial-gradient(at 100% 99%,hsla(224,100%,70%,.5) 0px,transparent 85%);box-shadow:0px -16px 24px 0px rgba(255,255,255,.07) inset;"
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
          class="group relative rounded-2xl backdrop-blur-sm p-7 hover:-translate-y-1.5 hover:shadow-2xl hover:shadow-black/50 transition-all duration-300"
          style="background-color:#060c1a;background-image:radial-gradient(at 88% 40%,hsla(222,47%,6%,1) 0px,transparent 85%),radial-gradient(at 49% 30%,hsla(222,47%,6%,1) 0px,transparent 85%),radial-gradient(at 14% 26%,hsla(222,47%,6%,1) 0px,transparent 85%),radial-gradient(at 0% 64%,hsla(210,100%,56%,.6) 0px,transparent 85%),radial-gradient(at 41% 94%,hsla(195,100%,80%,.4) 0px,transparent 85%),radial-gradient(at 100% 99%,hsla(224,100%,70%,.5) 0px,transparent 85%);box-shadow:0px -16px 24px 0px rgba(255,255,255,.07) inset;"
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
      <div class="mt-16 text-center">
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
import { ref, computed } from 'vue'
import { useI18n } from '#imports'
import AppLogo from '~/components/AppLogo.vue'
import AnimatedUnderlineTextOne from '~/components/ui/AnimatedUnderlineTextOne.vue'

const router = useRouter()
const name = ref('')
const { locale, setLocale, t } = useI18n()

const locales = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Español' }
]

const previewCategories = computed(() => [
  { name: t('cat_food'),      pct: '72%', amount: '€445', color: 'bg-emerald-500' },
  { name: t('cat_transport'), pct: '35%', amount: '€216', color: 'bg-teal-400' },
  { name: t('cat_shopping'),  pct: '54%', amount: '€332', color: 'bg-pink-400' },
  { name: t('cat_savings'),   pct: '28%', amount: '€180', color: 'bg-cyan-400' },
])

function start() {
  router.push({ path: '/get-started', query: { name: name.value } })
}
</script>

<style scoped>
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
