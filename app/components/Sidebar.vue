<template>
  <aside class="w-64 bg-white border-r min-h-screen p-4">
    <div class="flex items-center space-x-2 mb-6">
      <div class="w-10 h-10 bg-[color:var(--color-green-500)] rounded-full"></div>
      <div class="text-lg font-semibold">HabitWealth</div>
    </div>
    <nav class="space-y-2">
      <NuxtLink :to="'/'" class="block px-3 py-2 rounded" :class="{ 'bg-slate-100': route.path === '/' }">Home</NuxtLink>
      <NuxtLink :to="'/insights'" class="block px-3 py-2 rounded" :class="{ 'bg-slate-100': route.path === '/insights' }">Insights</NuxtLink>
      <NuxtLink :to="'/goals'" class="block px-3 py-2 rounded" :class="{ 'bg-slate-100': route.path === '/goals' }">Goals</NuxtLink>
      <NuxtLink :to="'/profile'" class="block px-3 py-2 rounded" :class="{ 'bg-slate-100': route.path === '/profile' }">Profile</NuxtLink>
    </nav>
  </aside>
</template>

<script setup>
import { useRoute } from '#app'
const route = useRoute()
</script>
