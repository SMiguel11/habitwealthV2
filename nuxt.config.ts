// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: [
    '@nuxt/eslint',
    '@nuxt/ui',
    '@nuxtjs/i18n'
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

  i18n: {
    vueI18n: './i18n/i18n.config.ts',
    defaultLocale: 'en',
    langDir: 'locales',
    locales: [
      { code: 'en', name: 'English', file: 'en.json', iso: 'en-GB' },
      { code: 'es', name: 'Español', file: 'es.json', iso: 'es-ES' }
    ],
    strategy: 'no_prefix',
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