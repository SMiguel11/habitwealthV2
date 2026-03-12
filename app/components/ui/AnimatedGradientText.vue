<template>
  <div
    :class="['flex justify-center items-center', className]"
    @mouseenter="onHover(true)"
    @mouseleave="onHover(false)"
  >
    <component
      :is="as"
      :class="[
        'animated-gradient-text leading-normal',
        textClassName
      ]"
      :style="textStyle"
    >
      {{ text }}
    </component>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'

const props = defineProps({
  text: { type: String, required: true },
  gradientColors: {
    type: String,
    default: 'linear-gradient(90deg, #34d399, #67e8f9, #34d399)'
  },
  gradientAnimationDuration: { type: Number, default: 1 },
  hoverEffect: { type: Boolean, default: false },
  className: { type: String, default: '' },
  textClassName: { type: String, default: 'text-4xl font-bold' },
  as: { type: String, default: 'h1' }
})

const isHovered = ref(false)

function onHover(value) {
  if (props.hoverEffect) isHovered.value = value
}

const textStyle = computed(() => ({
  '--gradient-colors': props.gradientColors,
  '--gradient-duration': `${props.gradientAnimationDuration}s`,
  background: 'var(--gradient-colors)',
  backgroundSize: '200% auto',
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  textShadow: isHovered.value ? '0 0 8px rgba(255,255,255,0.3)' : 'none'
}))
</script>

<style scoped>
.animated-gradient-text {
  animation: gradient-pan var(--gradient-duration) ease-in-out infinite alternate;
}

@keyframes gradient-pan {
  from {
    background-position: 0 0;
  }
  to {
    background-position: 100% 0;
  }
}
</style>
