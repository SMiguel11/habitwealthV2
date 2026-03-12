<template>
  <div aria-hidden="true" class="pointer-events-none absolute inset-0 overflow-hidden">
    <div class="absolute inset-0 bg-slate-950"></div>

    <div class="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(56,189,248,0.26)_0%,rgba(14,116,144,0.15)_38%,transparent_68%)]"></div>
    <div class="absolute -top-40 left-1/2 h-[420px] w-[760px] -translate-x-1/2 bg-[radial-gradient(ellipse_at_top,rgba(59,130,246,0.2)_0%,transparent_66%)]"></div>
    <div class="absolute top-[22%] left-[56%] h-[360px] w-[360px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(56,189,248,0.18)_0%,transparent_68%)] blur-3xl"></div>
    <div class="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:30px_30px]"></div>

    <div class="particles-layer absolute inset-0">
      <span
        v-for="particle in particles"
        :key="particle.id"
        class="particle"
        :style="particle.style"
      ></span>
    </div>

    <div class="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-sky-400/25 to-transparent"></div>
  </div>
</template>

<script setup>
const particles = Array.from({ length: 56 }, (_, i) => {
  const left = (i * 37) % 100
  const top = (i * 19) % 100
  const size = 2 + (i % 4)
  const duration = 8 + (i % 6) * 1.8
  const delay = (i % 7) * 0.8
  const opacity = 0.24 + (i % 4) * 0.08

  return {
    id: i,
    style: {
      left: `${left}%`,
      top: `${top}%`,
      width: `${size}px`,
      height: `${size}px`,
      opacity,
      animationDuration: `${duration}s`,
      animationDelay: `-${delay}s`,
      boxShadow: '0 0 12px rgba(56, 189, 248, 0.65)'
    }
  }
})
</script>

<style scoped>
.particle {
  position: absolute;
  display: block;
  border-radius: 9999px;
  background: radial-gradient(circle at 30% 30%, rgba(224, 242, 254, 0.98), rgba(56, 189, 248, 0.5));
  mix-blend-mode: screen;
  filter: blur(0.3px);
  animation-name: float-particle;
  animation-timing-function: ease-in-out;
  animation-iteration-count: infinite;
}

@keyframes float-particle {
  0% {
    transform: translate3d(0, 0, 0);
  }
  50% {
    transform: translate3d(0, -22px, 0) scale(1.08);
  }
  100% {
    transform: translate3d(0, 0, 0);
  }
}
</style>
