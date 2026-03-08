<template>
  <client-only>
    <component v-if="ApexChart" :is="ApexChart" :options="computedOptions" :series="series" :type="type" :height="height" />
  </client-only>
</template>

<script setup>
import { defineAsyncComponent, computed } from 'vue'

const props = defineProps({
  series: { type: Array, default: () => [] },
  type: { type: String, default: 'line' },
  height: { type: [Number, String], default: 120 },
  colors: { type: Array, default: () => ['#00C16A'] }
})

const ApexChart = defineAsyncComponent(() => import('vue3-apexcharts'))

const computedOptions = computed(() => ({
  chart: { toolbar: { show: false }, sparkline: { enabled: true } },
  stroke: { curve: 'smooth', width: 2 },
  colors: props.colors,
  tooltip: { enabled: false },
  grid: { show: false },
  xaxis: { labels: { show: false } },
  yaxis: { show: false }
}))
</script>
