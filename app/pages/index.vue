<template>
  <div class="min-h-screen flex items-center justify-center bg-hero bg-cover bg-center">
    <div class="w-full max-w-2xl text-center px-6 py-16">
      <AppLogo class="mx-auto h-20 w-auto mb-4" />
      <h1 class="text-4xl md:text-5xl font-bold tracking-tight text-[var(--color-green-800)]">HABIT
        <span class="text-[var(--color-green-500)]">WEALTH</span>
      </h1>
      <p class="mt-3 text-gray-600">Boost your financial health through emotional-smart saving</p>

      <form @submit.prevent="start" class="mt-8 flex items-center justify-center gap-4">
        <label class="sr-only" for="name">Name</label>
        <input id="name" v-model="name" placeholder="NAME:" class="px-4 py-2 rounded-full border border-gray-200 shadow-sm w-64 text-sm" />
        <button type="submit" class="px-6 py-2 rounded-full bg-gradient-to-r from-[color:var(--color-green-400)] to-[color:var(--color-green-600)] text-white font-semibold shadow">Get
          Started</button>
      </form>

      <div class="mt-8 flex items-center justify-center gap-6">
        <div class="flex items-center gap-3 bg-white/70 backdrop-blur rounded-full px-4 py-2 shadow">
          <div class="w-8 h-8 bg-blue-200 rounded-full flex items-center justify-center">🏦</div>
          <div class="text-sm text-gray-700">Upload Bank Statements</div>
        </div>
        <div class="flex items-center gap-3 bg-white/70 backdrop-blur rounded-full px-4 py-2 shadow">
          <div class="w-8 h-8 bg-pink-200 rounded-full flex items-center justify-center">💡</div>
          <div class="text-sm text-gray-700">Emotional Spending Insights</div>
        </div>
        <div class="flex items-center gap-3 bg-white/70 backdrop-blur rounded-full px-4 py-2 shadow">
          <div class="w-8 h-8 bg-yellow-200 rounded-full flex items-center justify-center">🎯</div>
          <div class="text-sm text-gray-700">Personalized Saving Tips</div>
        </div>
      </div>

      <div class="mt-6 flex items-center justify-center gap-4">
        <button class="p-2 rounded-full bg-white shadow">🇬🇧</button>
        <button class="p-2 rounded-full bg-white shadow">🇪🇸</button>
        <button class="p-2 rounded-full bg-white shadow">❓</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useRouter } from '#app'
import { ref } from 'vue'
import AppLogo from '~/components/AppLogo.vue'

const router = useRouter()
const name = ref('')

function start() {
  router.push({ path: '/get-started', query: { name: name.value } })
}
</script>
