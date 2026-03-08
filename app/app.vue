<script setup>
useHead({
  meta: [
    { name: 'viewport', content: 'width=device-width, initial-scale=1' }
  ],
  link: [
    { rel: 'icon', href: '/favicon.ico' }
  ],
  htmlAttrs: {
    lang: 'en'
  }
})

import AppLogo from '~/components/AppLogo.vue'

const title = 'HabitWealth'
const description = 'HabitWealth — Boost financial wellness with behavioral insights and personalized saving guidance.'

useSeoMeta({
  title,
  description,
  ogTitle: title,
  ogDescription: description,
  ogImage: '/favicon.ico',
  twitterImage: '/favicon.ico',
  twitterCard: 'summary_large_image'
})
</script>

<template>
  <UApp>
    <UHeader>
      <template #left>
        <NuxtLink to="/">
          <AppLogo class="h-10 md:h-12 w-auto" />
        </NuxtLink>
      </template>

      <template #right>
        <UColorModeButton />
      </template>
    </UHeader>

    <UMain>
      <NuxtPage />
    </UMain>

    <UFooter>
      <div class="w-full text-center py-4 text-sm text-gray-500">© {{ new Date().getFullYear() }} HabitWealth</div>
    </UFooter>
  </UApp>
</template>
