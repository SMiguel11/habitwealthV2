<template>
  <div class="bg-white rounded-lg p-6 shadow">
    <div class="flex items-center justify-between">
      <div>
        <div class="text-sm text-gray-500">HabitWellness Score</div>
        <div class="text-xs text-gray-400">Well done — you're stabilizing your habits</div>
      </div>
    </div>

    <div class="mt-6 flex items-center">
      <div class="gauge" :style="gaugeStyle">
        <div class="inner">
          <div class="text-center">
            <div class="text-4xl font-bold">{{ score }}</div>
            <div class="text-sm text-gray-500">/100</div>
          </div>
        </div>
      </div>
      <div class="ml-6 flex-1">
        <div class="text-sm text-gray-500">Progress</div>
        <div class="w-full h-3 bg-[color:var(--color-green-50)] rounded-full mt-2 overflow-hidden">
          <div :style="{ width: score + '%' }" class="h-full bg-gradient-to-r from-[color:var(--color-green-400)] to-[color:var(--color-green-600)]"></div>
        </div>
        <div class="text-xs text-gray-400 mt-2">You improved 12% vs last month</div>
      </div>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({ score: { type: Number, default: 75 } })

const degree = computed(() => Math.round((props.score / 100) * 180))
const gaugeStyle = computed(() => ({
  background: `conic-gradient(var(--color-green-400) ${degree.value}deg, var(--color-green-50) ${degree.value}deg)`
}))
</script>
