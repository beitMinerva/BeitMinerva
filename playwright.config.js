import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 30000,
  use: {
    baseURL: 'http://localhost:5173',
    headless: true,
    viewport: { width: 390, height: 844 }, // iPhone 12 / 13 / 14 Mobile viewport for mobile-first testing
  },
  webServer: {
    command: 'npm run dev -- --port 5173',
    url: 'http://localhost:5173',
    reuseExistingServer: true,
    env: {
      VITE_SUPABASE_URL: 'https://bwmrkzmlstjhzhptvtqy.supabase.co',
      VITE_SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ3bXJrem1sc3RqaHpocHR2dHF5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYyODYwNjEsImV4cCI6MjEwMTg2MjA2MX0.QH_cjxMwmnLyylCEH6_cOGTW3YEB6KfEbpQ-8PvkRQQ'
    }
  },
});
