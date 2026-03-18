<template>
  <div class="min-h-screen bg-slate-950 relative overflow-hidden">

    <!-- Background -->
    <ParticlesBg />

    <!-- Navbar -->
    <header class="sticky top-0 z-50 w-full border-b border-white/[0.05] bg-slate-950/70 backdrop-blur-xl">
      <div class="max-w-5xl mx-auto px-6 h-[60px] flex items-center justify-between">
        <NuxtLink to="/" class="flex items-center gap-2.5 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400">
          <AppLogo class="h-9 w-auto" />
          <span class="text-sm font-bold text-white hidden sm:block">Habit<span class="text-emerald-400">Wealth</span></span>
        </NuxtLink>
        <NuxtLink to="/" class="flex items-center gap-1.5 text-xs text-slate-500 hover:text-white transition-colors">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18"/></svg>
          {{ t('gs_back') }}
        </NuxtLink>
      </div>
    </header>

    <!-- Main -->
    <main class="relative max-w-5xl mx-auto px-6 pt-16 pb-24">

      <!-- Heading -->
      <div class="text-center mb-12">
        <div class="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-emerald-500/25 bg-emerald-500/[0.08] text-emerald-400 text-xs font-semibold tracking-widest uppercase mb-6">
          <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
          {{ t('gs_badge') }}
        </div>
        <AnimatedGradientText
          :text="`${t('gs_welcome')} ${userName}!`"
          class-name="mb-3"
          text-class-name="text-3xl sm:text-4xl md:text-3xl lg:text-4xl xl:text-5xl font-extrabold tracking-tight"
          gradient-colors="linear-gradient(90deg, #ffffff, #99f6e4, #67e8f9, #ffffff)"
          :gradient-animation-duration="1.6"
          :hover-effect="true"
          as="h1"
        />
        <p class="text-slate-500 text-base max-w-sm mx-auto leading-relaxed">{{ t('gs_subtitle') }}</p>
      </div>

      <!-- Progress -->
      <div class="mb-12 max-w-md mx-auto">
        <div class="flex items-center justify-between text-xs mb-2">
          <span class="text-slate-600">{{ t('gs_progress') }}</span>
          <span class="text-emerald-400 font-semibold">{{ completedCount }}{{ t('gs_of_complete') }}</span>
        </div>
        <div class="w-full bg-white/[0.05] rounded-full h-1">
          <div class="h-1 rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-700" :style="{ width: progressPct + '%' }"></div>
        </div>
      </div>

      <!-- Step cards -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-5 mb-14">

        <!-- Step 1: Upload -->
        <div
          @click="openUpload"
          role="button" tabindex="0" @keydown.enter="openUpload" @keydown.space.prevent="openUpload"
          :class="['relative rounded-2xl border p-6 transition-all duration-300 group focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 cursor-pointer',
            uploadCompleted
              ? 'bg-emerald-500/[0.06] border-emerald-500/30 hover:border-emerald-500/50'
              : 'bg-white/[0.03] border-white/[0.08] hover:bg-white/[0.06] hover:border-white/[0.14] hover:-translate-y-1.5 hover:shadow-2xl hover:shadow-black/50']"
        >
          <div class="absolute inset-x-0 top-0 h-px rounded-t-2xl" :class="uploadCompleted ? 'bg-gradient-to-r from-transparent via-emerald-500/60 to-transparent' : 'bg-gradient-to-r from-transparent via-blue-400/40 to-transparent'"></div>

          <div class="flex items-center justify-between mb-5">
            <div :class="['w-9 h-9 rounded-xl flex items-center justify-center text-sm font-black transition-all duration-300',
              uploadCompleted ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30' : 'bg-white/[0.06] border border-white/10 text-slate-500 group-hover:border-white/20 group-hover:text-white']">
              <svg v-if="uploadCompleted" class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="3" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5"/></svg>
              <span v-else>01</span>
            </div>
            <span :class="['text-[10px] font-bold uppercase tracking-widest', uploadCompleted ? 'text-emerald-400' : 'text-slate-700']">
              {{ uploadCompleted ? t('gs_done') : t('gs_required') }}
            </span>
          </div>

          <div :class="['w-12 h-12 rounded-2xl flex items-center justify-center mb-5 transition-all duration-300',
            uploadCompleted ? 'bg-emerald-500/15 border border-emerald-500/25' : 'bg-blue-500/10 border border-blue-500/20 group-hover:bg-blue-500/15']">
            <svg class="w-6 h-6" :class="uploadCompleted ? 'text-emerald-400' : 'text-blue-400'" fill="none" stroke="currentColor" stroke-width="1.75" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"/></svg>
          </div>

          <h3 class="text-sm font-bold text-white mb-1.5">{{ t('gs_step1_title') }}</h3>
          <p class="text-xs text-slate-500 leading-relaxed">{{ t('gs_step1_desc') }}</p>

          <div class="mt-5 flex items-center gap-1.5 text-xs font-semibold transition-opacity duration-300"
            :class="uploadCompleted ? 'text-emerald-400 opacity-100' : 'text-blue-400 opacity-0 group-hover:opacity-100'">
            <span>{{ uploadCompleted ? t('gs_step1_done_cta') : t('gs_step1_cta') }}</span>
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"/></svg>
          </div>
        </div>

        <!-- Step 2: Survey -->
        <div
          @click="openSurvey"
          role="button" tabindex="0" @keydown.enter="openSurvey" @keydown.space.prevent="openSurvey"
          :class="['relative rounded-2xl border p-6 transition-all duration-300 group focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400',
            !uploadCompleted ? 'opacity-40 cursor-not-allowed bg-white/[0.02] border-white/[0.05]' :
            surveyCompleted ? 'bg-emerald-500/[0.06] border-emerald-500/30 cursor-pointer hover:border-emerald-500/50' :
            'bg-white/[0.03] border-white/[0.08] cursor-pointer hover:bg-white/[0.06] hover:border-white/[0.14] hover:-translate-y-1.5 hover:shadow-2xl hover:shadow-black/50']"
        >
          <div class="absolute inset-x-0 top-0 h-px rounded-t-2xl" :class="surveyCompleted ? 'bg-gradient-to-r from-transparent via-emerald-500/60 to-transparent' : 'bg-gradient-to-r from-transparent via-pink-400/40 to-transparent'"></div>

          <div class="flex items-center justify-between mb-5">
            <div :class="['w-9 h-9 rounded-xl flex items-center justify-center text-sm font-black transition-all duration-300',
              surveyCompleted ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30' :
              !uploadCompleted ? 'bg-white/[0.04] border border-white/[0.06] text-slate-800' :
              'bg-white/[0.06] border border-white/10 text-slate-500 group-hover:border-white/20 group-hover:text-white']">
              <svg v-if="surveyCompleted" class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="3" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5"/></svg>
              <svg v-else-if="!uploadCompleted" class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"/></svg>
              <span v-else>02</span>
            </div>
            <span :class="['text-[10px] font-bold uppercase tracking-widest', surveyCompleted ? 'text-emerald-400' : !uploadCompleted ? 'text-slate-800' : 'text-slate-700']">
              {{ surveyCompleted ? t('gs_done') : !uploadCompleted ? t('gs_locked') : t('gs_required') }}
            </span>
          </div>

          <div :class="['w-12 h-12 rounded-2xl flex items-center justify-center mb-5 transition-all duration-300',
            surveyCompleted ? 'bg-emerald-500/15 border border-emerald-500/25' : 'bg-pink-500/10 border border-pink-500/20 group-hover:bg-pink-500/15']">
            <svg class="w-6 h-6" :class="surveyCompleted ? 'text-emerald-400' : 'text-pink-400'" fill="none" stroke="currentColor" stroke-width="1.75" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"/></svg>
          </div>

          <h3 class="text-sm font-bold text-white mb-1.5">{{ t('gs_step2_title') }}</h3>
          <p class="text-xs text-slate-500 leading-relaxed">{{ t('gs_step2_desc') }}</p>

          <div class="mt-5 flex items-center gap-1.5 text-xs font-semibold transition-opacity duration-300"
            :class="surveyCompleted ? 'text-emerald-400 opacity-100' : 'text-pink-400 opacity-0 group-hover:opacity-100'">
            <span>{{ surveyCompleted ? t('gs_step2_done_cta') : t('gs_step2_cta') }}</span>
            <svg v-if="uploadCompleted" class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"/></svg>
          </div>
        </div>

        <!-- Step 3: Goals -->
        <div
          @click="openGoals"
          role="button" tabindex="0" @keydown.enter="openGoals" @keydown.space.prevent="openGoals"
          :class="['relative rounded-2xl border p-6 transition-all duration-300 group focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400',
            !surveyCompleted ? 'opacity-40 cursor-not-allowed bg-white/[0.02] border-white/[0.05]' :
            goalsCompleted ? 'bg-emerald-500/[0.06] border-emerald-500/30 cursor-pointer hover:border-emerald-500/50' :
            'bg-white/[0.03] border-white/[0.08] cursor-pointer hover:bg-white/[0.06] hover:border-white/[0.14] hover:-translate-y-1.5 hover:shadow-2xl hover:shadow-black/50']"
        >
          <div class="absolute inset-x-0 top-0 h-px rounded-t-2xl" :class="goalsCompleted ? 'bg-gradient-to-r from-transparent via-emerald-500/60 to-transparent' : 'bg-gradient-to-r from-transparent via-amber-400/40 to-transparent'"></div>

          <div class="flex items-center justify-between mb-5">
            <div :class="['w-9 h-9 rounded-xl flex items-center justify-center text-sm font-black transition-all duration-300',
              goalsCompleted ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30' :
              !surveyCompleted ? 'bg-white/[0.04] border border-white/[0.06] text-slate-800' :
              'bg-white/[0.06] border border-white/10 text-slate-500 group-hover:border-white/20 group-hover:text-white']">
              <svg v-if="goalsCompleted" class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="3" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5"/></svg>
              <svg v-else-if="!surveyCompleted" class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"/></svg>
              <span v-else>03</span>
            </div>
            <span :class="['text-[10px] font-bold uppercase tracking-widest', goalsCompleted ? 'text-emerald-400' : !surveyCompleted ? 'text-slate-800' : 'text-slate-700']">
              {{ goalsCompleted ? t('gs_done') : !surveyCompleted ? t('gs_locked') : t('gs_required') }}
            </span>
          </div>

          <div :class="['w-12 h-12 rounded-2xl flex items-center justify-center mb-5 transition-all duration-300',
            goalsCompleted ? 'bg-emerald-500/15 border border-emerald-500/25' : 'bg-amber-500/10 border border-amber-500/20 group-hover:bg-amber-500/15']">
            <svg class="w-6 h-6" :class="goalsCompleted ? 'text-emerald-400' : 'text-amber-400'" fill="none" stroke="currentColor" stroke-width="1.75" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" d="M15.362 5.214A8.252 8.252 0 0112 21 8.25 8.25 0 016.038 7.048 8.287 8.287 0 009 9.6a8.983 8.983 0 013.361-6.867 8.21 8.21 0 003 2.48z"/>
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 18a3.75 3.75 0 00.495-7.467 5.99 5.99 0 00-1.925 3.546 5.974 5.974 0 01-2.133-1.001A3.75 3.75 0 0012 18z"/>
            </svg>
          </div>

          <h3 class="text-sm font-bold text-white mb-1.5">{{ t('gs_step3_title') }}</h3>
          <p class="text-xs text-slate-500 leading-relaxed">{{ t('gs_step3_desc') }}</p>

          <div class="mt-5 flex items-center gap-1.5 text-xs font-semibold transition-opacity duration-300"
            :class="goalsCompleted ? 'text-emerald-400 opacity-100' : 'text-amber-400 opacity-0 group-hover:opacity-100'">
            <span>{{ goalsCompleted ? t('gs_step3_done_cta') : t('gs_step3_cta') }}</span>
            <svg v-if="surveyCompleted" class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"/></svg>
          </div>
        </div>

      </div>

      <!-- CTA -->
      <div class="flex justify-center">
        <button
          @click="next"
          :disabled="!(uploadCompleted && surveyCompleted && goalsCompleted)"
          :class="['inline-flex items-center gap-2.5 px-8 py-4 rounded-2xl text-sm font-bold transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400',
            (uploadCompleted && surveyCompleted && goalsCompleted)
              ? 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-2xl shadow-emerald-500/25 hover:shadow-emerald-500/45 hover:from-emerald-400 hover:to-teal-500 hover:-translate-y-px'
              : 'bg-white/[0.04] border border-white/[0.07] text-slate-700 cursor-not-allowed']"
        >
          <span>{{ t('gs_view_insights') }}</span>
          <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"/></svg>
        </button>
      </div>
    </main>

    <!-- Toast: success -->
    <transition
      enter-active-class="transition ease-out duration-300"
      enter-from-class="opacity-0 translate-y-3"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition ease-in duration-200"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div v-if="successMessage" class="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] flex items-center gap-3 bg-emerald-950/90 border border-emerald-500/30 text-emerald-300 px-5 py-3.5 rounded-2xl text-sm font-medium shadow-2xl shadow-black/60 backdrop-blur-md whitespace-nowrap">
        <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
        {{ successMessage }}
      </div>
    </transition>

    <!-- Toast: error -->
    <transition
      enter-active-class="transition ease-out duration-300"
      enter-from-class="opacity-0 translate-y-3"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition ease-in duration-200"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div v-if="errorMessage" class="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] flex items-center gap-3 bg-red-950/90 border border-red-500/30 text-red-300 px-5 py-3.5 rounded-2xl text-sm font-medium shadow-2xl shadow-black/60 backdrop-blur-md whitespace-nowrap">
        <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"/></svg>
        {{ errorMessage }}
      </div>
    </transition>

    <!-- ======= UPLOAD MODAL ======= -->
    <div v-if="showUploadModal" @click.self="closeUpload" class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-6">
      <div class="relative w-full max-w-[440px] rounded-2xl border border-white/[0.08] bg-slate-900 shadow-2xl shadow-black/70">
        <div class="absolute inset-x-0 top-0 h-px rounded-t-2xl bg-gradient-to-r from-transparent via-blue-400/50 to-transparent"></div>
        <div class="p-6">
          <div class="flex items-start justify-between mb-6">
            <div>
              <h3 class="text-base font-bold text-white">{{ t('gs_upload_title') }}</h3>
              <p class="text-xs text-slate-500 mt-0.5">{{ t('gs_upload_subtitle') }}</p>
            </div>
            <button @click="closeUpload" aria-label="Close" class="text-slate-600 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/[0.05]">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>

          <!-- Drop zone -->
          <div class="relative rounded-xl border-2 border-dashed border-white/[0.08] bg-white/[0.02] p-8 text-center hover:border-blue-500/40 hover:bg-blue-500/[0.03] transition-all group/dz">
            <input type="file" @change="onFiles" class="absolute inset-0 z-10 w-full h-full opacity-0 cursor-pointer" multiple accept=".pdf,.csv" />
            <div class="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mx-auto mb-4 group-hover/dz:bg-blue-500/15 transition-colors">
              <svg class="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" stroke-width="1.75" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"/></svg>
            </div>
            <p class="text-sm font-medium text-white">{{ t('gs_drop_here') }} <span class="text-blue-400">{{ t('gs_browse') }}</span></p>
            <p class="text-xs text-slate-600 mt-1">{{ t('gs_file_hint') }}</p>
          </div>

          <!-- File list -->
          <div v-if="uploadedFiles.length" class="mt-4 space-y-2">
            <div v-for="(f, i) in uploadedFiles" :key="i" class="flex items-center gap-3 rounded-xl bg-white/[0.03] border border-white/[0.06] px-4 py-3">
              <div class="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0">
                <svg class="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"/></svg>
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-xs font-medium text-white truncate">{{ f.name }}</p>
                <p class="text-[10px] text-slate-600">{{ Math.round(f.size/1024) }} KB</p>
              </div>
              <span :class="['text-xs font-semibold shrink-0', f.status==='ready' ? 'text-emerald-400' : f.status==='uploading' ? 'text-blue-400 animate-pulse' : f.status==='failed' ? 'text-red-400' : 'text-slate-500']">
                {{ f.status === 'queued' ? t('gs_file_pending') : f.status === 'uploading' ? t('gs_file_uploading') : f.status === 'ready' ? t('gs_file_done') : t('gs_file_failed') }}
              </span>
              <button @click="removeFile(i)" class="text-slate-700 hover:text-white transition-colors shrink-0" aria-label="Remove file">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>
          </div>

          <div class="mt-5 grid grid-cols-2 gap-3">
            <button @click="clearAll" class="rounded-xl bg-white/[0.04] border border-white/[0.07] px-4 py-2.5 text-sm font-medium text-slate-400 hover:text-white hover:bg-white/[0.07] transition-all">{{ t('gs_clear_all') }}</button>
            <button @click="uploadAll" :disabled="!uploadedFiles.length"
              :class="['rounded-xl px-4 py-2.5 text-sm font-bold transition-all', uploadedFiles.length ? 'bg-gradient-to-br from-blue-500 to-sky-600 text-white shadow-lg shadow-blue-500/20 hover:from-blue-400' : 'bg-white/[0.04] border border-white/[0.06] text-slate-700 cursor-not-allowed']">
              {{ t('gs_upload_btn') }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- ======= SURVEY MODAL ======= -->
    <div v-if="showSurveyModal" @click.self="closeSurvey" class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-6">
      <div class="relative w-full max-w-[540px] max-h-[90vh] overflow-y-auto rounded-2xl border border-white/[0.08] bg-slate-900 shadow-2xl shadow-black/70">
        <div class="absolute inset-x-0 top-0 h-px rounded-t-2xl bg-gradient-to-r from-transparent via-pink-400/50 to-transparent"></div>
        <div class="p-6">
          <div class="flex items-start justify-between mb-6">
            <div>
              <h3 class="text-base font-bold text-white">{{ t('gs_survey_title') }}</h3>
              <p class="text-xs text-slate-500 mt-0.5">{{ t('gs_survey_subtitle') }}</p>
            </div>
            <button @click="closeSurvey" aria-label="Close" class="text-slate-600 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/[0.05]">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>

          <div class="space-y-4">
            <div v-for="(q, idx) in surveyQuestions" :key="idx" class="rounded-xl bg-white/[0.02] border border-white/[0.06] p-4">
              <p class="text-sm text-slate-300 mb-3 leading-relaxed">
                <template v-if="typeof q === 'string'">{{ q }}</template>
                <template v-else>{{ q.question }}</template>
              </p>
              <div class="flex flex-wrap gap-2">
                <template v-if="typeof q === 'string'">
                  <button v-for="(label, li) in [t('gs_likert_1'), t('gs_likert_2'), t('gs_likert_3'), t('gs_likert_4')]" :key="li" @click="selectAnswer(idx, li + 1)"
                    :class="['px-3.5 py-2 rounded-xl border text-xs font-semibold transition-all', answers[idx]===(li+1) ? 'bg-emerald-500 border-emerald-400 text-white shadow-lg shadow-emerald-500/20' : 'bg-white/[0.04] border-white/[0.08] text-slate-500 hover:border-white/20 hover:text-white']">
                    {{ label }}
                  </button>
                </template>
                <template v-else>
                  <button v-for="(opt, oi) in q.options" :key="oi" @click="selectAnswer(idx, oi)"
                    :class="['px-3.5 py-2 rounded-xl border text-xs font-semibold transition-all', answers[idx]===oi ? 'bg-emerald-500 border-emerald-400 text-white shadow-lg shadow-emerald-500/20' : 'bg-white/[0.04] border-white/[0.08] text-slate-500 hover:border-white/20 hover:text-white']">
                    {{ opt }}
                  </button>
                </template>
              </div>
            </div>
          </div>

          <div class="mt-6 flex justify-end gap-3">
            <button @click="closeSurvey" class="rounded-xl bg-white/[0.04] border border-white/[0.07] px-5 py-2.5 text-sm font-medium text-slate-400 hover:text-white hover:bg-white/[0.07] transition-all">{{ t('gs_cancel') }}</button>
            <button :disabled="!isSurveyComplete" @click="submitSurvey"
              :class="['rounded-xl px-5 py-2.5 text-sm font-bold transition-all', isSurveyComplete ? 'bg-gradient-to-br from-pink-500 to-rose-600 text-white shadow-lg shadow-pink-500/20 hover:from-pink-400' : 'bg-white/[0.04] border border-white/[0.06] text-slate-700 cursor-not-allowed']">
              {{ t('gs_submit') }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- ======= GOALS MODAL ======= -->
    <div v-if="showGoalsModal" @click.self="closeGoals" class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-6" role="dialog" aria-modal="true" aria-labelledby="goals-title">
      <div class="relative w-full max-w-[540px] max-h-[90vh] overflow-y-auto rounded-2xl border border-white/[0.08] bg-slate-900 shadow-2xl shadow-black/70">
        <div class="absolute inset-x-0 top-0 h-px rounded-t-2xl bg-gradient-to-r from-transparent via-amber-400/50 to-transparent"></div>
        <div class="p-6">
          <div class="flex items-start justify-between mb-6">
            <div>
              <h3 id="goals-title" class="text-base font-bold text-white">{{ t('gs_goals_title') }}</h3>
              <p class="text-xs text-slate-500 mt-0.5">{{ t('gs_goals_subtitle') }}</p>
            </div>
            <button @click="closeGoals" aria-label="Close" class="text-slate-600 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/[0.05]">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>

          <div class="space-y-4">
            <div v-for="(goal, idx) in goalEntries" :key="idx" class="rounded-xl bg-white/[0.02] border border-white/[0.06] p-5 space-y-4">
              <div class="flex items-center justify-between">
                <span class="text-[10px] font-bold text-amber-400 uppercase tracking-widest">{{ t('gs_goal_label') }} {{ idx + 1 }}</span>
                <button v-if="goalEntries.length > 1" @click="removeGoalEntry(idx)" aria-label="Remove goal" class="text-slate-700 hover:text-red-400 transition-colors">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
                </button>
              </div>

              <div>
                <label :for="'goal-desc-' + idx" class="block text-xs font-medium text-slate-500 mb-1.5">{{ t('gs_goal_desc_label') }}</label>
                <input :id="'goal-desc-' + idx" v-model="goal.description" type="text" :placeholder="t('gs_goal_placeholder')"
                  class="w-full rounded-xl bg-white/[0.04] border border-white/[0.08] px-3.5 py-2.5 text-sm text-white placeholder:text-slate-700 focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 outline-none transition-all" />
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label :for="'goal-amt-' + idx" class="block text-xs font-medium text-slate-500 mb-1.5">{{ t('gs_goal_amount_label') }}</label>
                  <div class="relative">
                    <span class="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 text-sm">€</span>
                    <input :id="'goal-amt-' + idx" v-model.number="goal.targetAmount" type="number" min="1" step="50" placeholder="1200"
                      class="w-full rounded-xl bg-white/[0.04] border border-white/[0.08] pl-8 pr-3 py-2.5 text-sm text-white placeholder:text-slate-700 focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 outline-none transition-all" />
                  </div>
                </div>
                <div>
                  <label :for="'goal-time-' + idx" class="block text-xs font-medium text-slate-500 mb-1.5">{{ t('gs_goal_timeline_label') }}</label>
                  <div class="flex gap-2">
                    <div class="flex rounded-xl bg-white/[0.04] border border-white/[0.08] p-0.5 shrink-0" role="tablist">
                      <button @click="goal.timeUnit = 'months'" role="tab" :aria-selected="goal.timeUnit === 'months'" :class="['px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all', goal.timeUnit === 'months' ? 'bg-amber-500 text-white shadow-sm' : 'text-slate-500 hover:text-white']">Mo</button>
                      <button @click="goal.timeUnit = 'years'" role="tab" :aria-selected="goal.timeUnit === 'years'" :class="['px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all', goal.timeUnit === 'years' ? 'bg-amber-500 text-white shadow-sm' : 'text-slate-500 hover:text-white']">Yr</button>
                    </div>
                    <input :id="'goal-time-' + idx" v-model.number="goal.timeValue" type="number" min="1" :max="goal.timeUnit === 'months' ? 120 : 10" :placeholder="goal.timeUnit === 'months' ? '12' : '1'"
                      class="w-full rounded-xl bg-white/[0.04] border border-white/[0.08] px-3 py-2.5 text-sm text-white text-center placeholder:text-slate-700 focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 outline-none transition-all" />
                  </div>
                </div>
              </div>

              <div v-if="goal.description && goal.targetAmount && goal.timeValue" class="rounded-xl bg-amber-500/[0.06] border border-amber-500/20 px-4 py-3 text-xs text-slate-300">
                💡 {{ t('gs_goal_tip_prefix') }} <span class="text-amber-400 font-bold">€{{ Math.round(goal.targetAmount / (goal.timeUnit === 'years' ? goal.timeValue * 12 : goal.timeValue)) }}{{ t('gs_goal_tip_month') }}</span> {{ t('gs_goal_tip_reach') }} <span class="text-white font-semibold">€{{ goal.targetAmount }}</span> {{ t('gs_goal_tip_in') }} <span class="text-white font-semibold">{{ goal.timeValue }} {{ t(goal.timeUnit === 'years' ? 'gs_years' : 'gs_months') }}</span>
              </div>
            </div>
          </div>

          <button @click="addGoalEntry" class="mt-4 flex items-center gap-2 text-xs text-amber-400 hover:text-amber-300 transition-colors font-semibold">
            <span class="w-5 h-5 rounded-full border border-amber-500/40 flex items-center justify-center text-xs">+</span>
            {{ t('gs_add_goal') }}
          </button>

          <div class="mt-6 flex justify-end gap-3">
            <button @click="closeGoals" class="rounded-xl bg-white/[0.04] border border-white/[0.07] px-5 py-2.5 text-sm font-medium text-slate-400 hover:text-white hover:bg-white/[0.07] transition-all">{{ t('gs_cancel') }}</button>
            <button @click="saveGoals" :disabled="!isGoalFormValid"
              :class="['rounded-xl px-5 py-2.5 text-sm font-bold transition-all', isGoalFormValid ? 'bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-lg shadow-amber-500/20 hover:from-amber-400' : 'bg-white/[0.04] border border-white/[0.06] text-slate-700 cursor-not-allowed']">
              {{ t('gs_save_goals') }}
            </button>
          </div>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup>
import AppLogo from '~/components/AppLogo.vue'
import AnimatedGradientText from '~/components/ui/AnimatedGradientText.vue'
import ParticlesBg from '~/components/ui/ParticlesBg.vue'
import { useRouter, useRoute } from '#app'
import { ref, computed, onMounted } from 'vue'
import { useI18n } from '#imports'
import { useSwaAuth } from '~/composables/useSwaAuth'

const { t } = useI18n()
const router = useRouter()
const route = useRoute()
const { displayName, refresh, isAuthenticated } = useSwaAuth()
const userName = ref(route.query.name || 'Guest')
const showUploadModal = ref(false)
const uploadedFiles = ref([])
const uploading = ref(false)
const uploadCompleted = ref(false)
const successMessage = ref('')
const errorMessage = ref('')
const SAS_API = '/api/sas-function'

// Capture authenticated user on mount
onMounted(async () => {
  try {
    // Only fetch auth if no name was provided in query (manual form entry)
    if (!route.query.name) {
      await refresh()
      if (isAuthenticated.value) {
        userName.value = displayName.value
      }
    }
  } catch (err) {
    console.error('Failed to load auth:', err)
  }
})
const showSurveyModal = ref(false)
const surveyQuestions = computed(() => [
  t('gs_q1'),
  t('gs_q2'),
  t('gs_q3'),
  t('gs_q4'),
  t('gs_q5'),
  {
    type: 'choices',
    question: t('gs_q6'),
    options: [t('gs_q6_opt1'), t('gs_q6_opt2'), t('gs_q6_opt3'), t('gs_q6_opt4'), t('gs_q6_opt5')]
  },
  {
    type: 'choices',
    question: t('gs_q7'),
    options: [t('gs_q7_opt1'), t('gs_q7_opt2'), t('gs_q7_opt3')]
  }
])
const answers = ref(new Array(7).fill(null))
const surveyCompleted = ref(false)
const isSurveyComplete = computed(() => answers.value.every(a => a !== null))
const showGoalsModal = ref(false)
const goalEntries = ref([{ description: '', targetAmount: null, timeValue: null, timeUnit: 'months' }])
const goalsCompleted = ref(false)
const uploadResults = ref([])
const isGoalFormValid = computed(() => goalEntries.value.some(g => g.description.trim() && g.targetAmount > 0 && g.timeValue > 0))
const completedCount = computed(() => [uploadCompleted.value, surveyCompleted.value, goalsCompleted.value].filter(Boolean).length)
const progressPct = computed(() => Math.round((completedCount.value / 3) * 100))

function addGoalEntry() {
  goalEntries.value.push({ description: '', targetAmount: null, timeValue: null, timeUnit: 'months' })
}

function removeGoalEntry(idx) {
  goalEntries.value.splice(idx, 1)
} // { blobUrl, filename } guardados en step 1, usados al guardar las metas en step 3

function next() {
  router.push('/analyzing')
}

function openUpload() {
  showUploadModal.value = true
}

function closeUpload() {
  showUploadModal.value = false
}

function onFiles(e) {
  const files = e.target.files
  if (!files) return
  // Only queue – upload is triggered by the Upload button
  const incoming = Array.from(files).map(f => ({ name: f.name, size: f.size, status: 'queued', url: null, _file: f }))
  uploadedFiles.value = [...uploadedFiles.value, ...incoming]
}

function removeFile(index) {
  uploadedFiles.value.splice(index, 1)
}

function clearAll() {
  uploadedFiles.value = []
}

async function uploadAll() {
  if (!uploadedFiles.value.length) return
  uploading.value = true
  errorMessage.value = ''
  let allSuccess = true
  
  for (let i = 0; i < uploadedFiles.value.length; i++) {
    const item = uploadedFiles.value[i]
    if (item.status === 'ready') continue
    if (item.status === 'failed' && !item._file) continue
    try {
      item.status = 'uploading'
      console.log(`[Upload] Uploading file: ${item.name} (${item.size} bytes)`)
      
      // Use direct Function App URL in production, vite proxy in local dev
      const isProduction = typeof window !== 'undefined' && window.location.hostname !== 'localhost'
      const functionBase = isProduction ? 'https://hwbase-fn-sas-00211.azurewebsites.net' : ''

      // Read file as base64 to avoid multipart/busboy issues in Azure Functions
      const fileBase64 = await new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result)
        reader.onerror = reject
        reader.readAsDataURL(item._file)
      })

      const res = await fetch(`${functionBase}/api/sas-function-upload`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileBase64, filename: item.name, userId: 'local-user' })
      })
      
      if (!res.ok) {
        const error = await res.text()
        throw new Error(`Upload failed (${res.status}): ${error}`)
      }
      
      const result = await res.json()
      const blobUrl = result.blobUrl
      
      console.log(`[Upload] File uploaded successfully: ${blobUrl}`)
      item.url = blobUrl
      item.status = 'ready'
      uploadResults.value.push({ blobUrl, filename: item.name })
    } catch (err) {
      console.error(`[Upload Error] ${item.name}:`, err)
      allSuccess = false
      item.status = 'failed'
      item.error = err.message || String(err)
      errorMessage.value = `Upload failed: ${item.error}`
    }
    delete item._file
    uploadedFiles.value.splice(i, 1, { ...item })
  }
  
  uploading.value = false
  
  if (allSuccess && uploadedFiles.value.every(f => f.status === 'ready')) {
    uploadCompleted.value = true
    successMessage.value = '✓ Files uploaded successfully! Proceeding to Step 2...'
    setTimeout(() => {
      closeUpload()
      successMessage.value = ''
    }, 1500)
  }
}

function openSurvey() {
  if (!uploadCompleted.value) {
    errorMessage.value = '⚠ Complete Step 1 (Upload Statements) first!'
    setTimeout(() => { errorMessage.value = '' }, 3000)
    return
  }
  showSurveyModal.value = true
}

function closeSurvey() {
  showSurveyModal.value = false
}

function selectAnswer(idx, val) {
  answers.value[idx] = val
}

function submitSurvey() {
  if (!isSurveyComplete.value) return
  surveyCompleted.value = true
  successMessage.value = '✓ Survey completed! Moving to Step 3...'
  setTimeout(() => {
    showSurveyModal.value = false
    successMessage.value = ''
  }, 1000)
}

function openGoals() {
  if (!surveyCompleted.value) {
    errorMessage.value = '⚠ Complete Step 2 (Survey) first!'
    setTimeout(() => { errorMessage.value = '' }, 3000)
    return
  }
  showGoalsModal.value = true
}

function closeGoals() {
  showGoalsModal.value = false
}

function saveGoals() {
  const parsedGoals = goalEntries.value
    .filter(g => g.description.trim() && g.targetAmount > 0 && g.timeValue > 0)
    .map(g => ({
      description: g.description.trim(),
      targetAmount: g.targetAmount,
      deadlineMonths: g.timeUnit === 'years' ? g.timeValue * 12 : g.timeValue
    }))
  if (!parsedGoals.length) return
  goalsCompleted.value = true

  const isProduction = typeof window !== 'undefined' && window.location.hostname !== 'localhost'
  const functionBase = isProduction ? 'https://hwbase-fn-sas-00211.azurewebsites.net' : ''

  // Ahora sí tenemos todo: archivos subidos + survey + metas → lanzar análisis
  for (const uploaded of uploadResults.value) {
    fetch(`${functionBase}/api/mock-analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        blobUrl: uploaded.blobUrl,
        filename: uploaded.filename,
        userId: 'local-user',
        surveyAnswers: answers.value,
        goals: parsedGoals
      })
    }).catch(err => console.error('Analysis request failed:', err))
  }

  successMessage.value = '✓ Goals saved! All steps complete. Click Next to view your insights.'
  setTimeout(() => {
    showGoalsModal.value = false
    successMessage.value = ''
  }, 1500)
}
</script>

