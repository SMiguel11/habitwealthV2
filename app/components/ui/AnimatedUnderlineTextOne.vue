<template>
  <span class="animated-text group relative inline-block align-middle" :style="durationStyle">
    <span :class="textClassName">{{ text }}</span>

    <svg
      class="pointer-events-none absolute left-0 -bottom-2 h-4 w-full"
      viewBox="0 0 300 24"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <path
        class="path-default"
        :d="underlinePath"
        fill="none"
        :stroke="underlineColor"
        stroke-width="2.2"
        stroke-linecap="round"
      />
      <path
        class="path-hover"
        :d="underlineHoverPath"
        fill="none"
        :stroke="underlineColor"
        stroke-width="2.2"
        stroke-linecap="round"
      />
    </svg>
  </span>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  text: { type: String, required: true },
  textClassName: { type: String, default: 'text-2xl font-bold text-white' },
  underlinePath: {
    type: String,
    default: 'M 0,12 Q 75,4 150,12 Q 225,20 300,12'
  },
  underlineHoverPath: {
    type: String,
    default: 'M 0,12 Q 75,20 150,12 Q 225,4 300,12'
  },
  underlineDuration: { type: Number, default: 1.2 },
  underlineColor: { type: String, default: '#34d399' }
})

const durationStyle = computed(() => ({
  '--underline-duration': `${props.underlineDuration}s`
}))
</script>

<style scoped>
.path-default {
  opacity: 0.9;
  transition: opacity var(--underline-duration) ease, transform var(--underline-duration) ease;
}

.path-hover {
  opacity: 0;
  stroke-dasharray: 320;
  stroke-dashoffset: 320;
  transition: opacity 0.2s ease, stroke-dashoffset var(--underline-duration) ease;
}

.animated-text:hover .path-default,
.animated-text:focus-within .path-default {
  opacity: 0;
  transform: translateY(1px);
}

.animated-text:hover .path-hover,
.animated-text:focus-within .path-hover {
  opacity: 1;
  stroke-dashoffset: 0;
}
</style>
