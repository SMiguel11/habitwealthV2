<template>
  <div class="bg-white rounded-lg p-4 shadow flex flex-col justify-between">
    <div class="flex justify-between items-start">
      <div>
        <div class="text-sm text-gray-500">{{ title }}</div>
        <div class="text-2xl font-semibold">{{ value }}</div>
      </div>
      <div v-if="badge" class="ml-2">
        <span class="inline-block bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">{{ badge }}</span>
      </div>
    </div>
    <div class="mt-3">
      <TrendChart :series="[{ data: trend } ]" type="line" height="64" />
    </div>
  </div>
</template>

<script setup>
import TrendChart from './TrendChart.vue'
const props = defineProps({
  title: { type: String, default: '' },
  value: { type: [String, Number], default: '' },
  trend: { type: Array, default: () => [] },
  badge: { type: String, default: '' }
})
</script>
