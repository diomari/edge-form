import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'edge-form',
  description: 'Cloudflare contact form backend with spam protection, D1 storage, delivery adapters, dashboard, and CSV export.',
  cleanUrls: true,
  lastUpdated: true,
  srcExclude: [
    'technical-plan.md',
    'implementation-tasks.md',
    'case-study-edge-form.md',
    'case-study-jigspot.md',
  ],
  themeConfig: {
    nav: [
      { text: 'Guide', link: '/getting-started' },
      { text: 'API', link: '/api' },
      { text: 'Testing', link: '/vitest' },
    ],
    sidebar: [
      {
        text: 'Guide',
        items: [
          { text: 'Overview', link: '/' },
          { text: 'Getting Started', link: '/getting-started' },
          { text: 'D1 Setup', link: '/d1-setup' },
          { text: 'API Reference', link: '/api' },
          { text: 'Examples', link: '/examples' },
          { text: 'Operations', link: '/operations' },
        ],
      },
      {
        text: 'Adapters',
        items: [
          { text: 'Resend', link: '/adapters/resend' },
          { text: 'Webhook', link: '/adapters/webhook' },
        ],
      },
      {
        text: 'Quality & Security',
        items: [
          { text: 'Vitest', link: '/vitest' },
          { text: 'Security & Privacy', link: '/security/privacy' },
        ],
      },
    ],
    search: {
      provider: 'local',
    },
  },
})
