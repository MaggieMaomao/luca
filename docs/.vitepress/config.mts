import { defineConfig } from 'vitepress'

// Luca docs site. `docs/` is the content root; dev-process notes are excluded
// so only the curated guide + reference pages ship.
export default defineConfig({
  title: 'Luca',
  description: 'An open-source game engine + game collection for the browser. Build games — including with your AI.',
  lang: 'en-US',
  // GitHub project pages: https://maggiemaomao.github.io/luca/. Change to '/'
  // for a custom domain or user page.
  base: '/luca/',
  cleanUrls: true,
  lastUpdated: true,


  themeConfig: {
    nav: [
      { text: 'Guide', link: '/guide/getting-started' },
      { text: 'Build a game', link: '/guide/your-first-game' },
      { text: 'Reference', link: '/GAME_DEFINITION' },
      { text: 'API', link: '/reference/api/' },
      { text: 'GitHub', link: 'https://github.com/MaggieMaomao/luca' },
    ],
    sidebar: [
      {
        text: 'Guide',
        items: [
          { text: 'What is Luca?', link: '/guide/getting-started' },
          { text: 'Concepts', link: '/guide/concepts' },
          { text: 'Build your first game', link: '/guide/your-first-game' },
        ],
      },
      {
        text: 'Reference',
        items: [
          { text: 'Game definition', link: '/GAME_DEFINITION' },
          { text: 'Architecture', link: '/ARCHITECTURE' },
          { text: 'Gesture algorithm', link: '/GESTURE_ALGORITHM' },
          { text: 'Completion API', link: '/COMPLETION_API' },
        ],
      },
    ],
    socialLinks: [
      { icon: 'github', link: 'https://github.com/MaggieMaomao/luca' },
    ],
    editLink: {
      pattern: 'https://github.com/MaggieMaomao/luca/edit/main/docs/:path',
    },
    footer: {
      message: 'MIT Licensed',
      copyright: 'Copyright © 2026 MaggieMaomao',
    },
    search: { provider: 'local' },
  },
})
