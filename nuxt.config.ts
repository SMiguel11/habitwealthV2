// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: [
    '@nuxt/eslint',
    '@nuxt/ui'
  ],

  devtools: {
    enabled: true
  },

  css: ['~/assets/css/main.css'],

  routeRules: {
    '/': { prerender: true },
    '/get-started': { prerender: true },
    '/insights': { prerender: true }
  },

  compatibilityDate: '2025-01-15',

  eslint: {
    config: {
      stylistic: {
        commaDangle: 'never',
        braceStyle: '1tbs'
      }
    }
  },

  vite: {
    server: {
      proxy: {
        '/api': {
          target: 'http://localhost:7071', // URL local de Azure Functions
          changeOrigin: true,
          // Do NOT strip /api prefix – Azure Functions serve at /api/<name>
        },
      },
    },
  },
})
