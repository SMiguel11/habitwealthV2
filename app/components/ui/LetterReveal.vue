<template>
  <!-- Single accessible text node for screen readers, per-letter spans hidden from AT -->
  <span :class="wrapperClass" :aria-label="text" role="text" class="letter-reveal-root">
    <span
      v-for="(char, i) in chars"
      :key="i"
      aria-hidden="true"
      class="letter-char"
      :style="{ animationDelay: `${(baseDelay + i * stagger).toFixed(3)}s` }"
    >{{ char === ' ' ? '\u00a0' : char }}</span>
  </span>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  text: { type: String, required: true },
  wrapperClass: { type: String, default: '' },
  /** seconds before first letter starts */
  baseDelay: { type: Number, default: 0.25 },
  /** seconds between each letter */
  stagger: { type: Number, default: 0.085 },
})

const chars = computed(() => props.text.split(''))
</script>

<style scoped>
.letter-reveal-root {
  display: inline;
}

.letter-char {
  display: inline-block;
  background-image: linear-gradient(135deg, #6ee7b7 0%, #5eead4 45%, #67e8f9 100%);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  color: transparent;
  animation: letter-in 1.1s cubic-bezier(0.16, 1, 0.3, 1) both;
}

@keyframes letter-in {
  from {
    opacity: 0;
    transform: translateY(0.42em) rotateX(78deg);
    filter: blur(7px);
  }
  55% {
    opacity: 1;
    filter: blur(0);
  }
  to {
    opacity: 1;
    transform: translateY(0) rotateX(0deg);
    filter: blur(0);
  }
}
</style>
