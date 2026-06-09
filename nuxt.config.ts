// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: [
    '@nuxt/eslint',
    '@nuxt/ui',
    '@nuxt/image',
    '@nuxt/fonts',
    '@vueuse/nuxt'
  ],

  devtools: {
    enabled: true
  },

  css: ['~/assets/css/main.css'],

  runtimeConfig: {
    directusToken: '',
    directusInternalUrl: '', // SSR-only; falls back to public URL when empty
    // AI product import (server-only). Defaults read the same env the scripts use.
    directusAdminToken: process.env.ADMIN_TOKEN || '',
    anthropicApiKey: process.env.ANTHROPIC_API_KEY || '',
    importSecret: process.env.IMPORT_SECRET || '',
    importModel: process.env.IMPORT_MODEL || 'claude-haiku-4-5',
    public: {
      directusUrl: 'http://localhost:8056',
      directusToken: ''
    }
  },

  compatibilityDate: '2025-01-15',

  eslint: {
    config: {
      stylistic: {
        commaDangle: 'never',
        braceStyle: '1tbs'
      }
    }
  }
})
