import { defineConfig } from 'vitepress'
import {
  groupIconMdPlugin,
  groupIconVitePlugin,
  localIconLoader
} from 'vitepress-plugin-group-icons'

export default defineConfig({
  title: 'RPG Cheat UI Plugin',
  description: 'GUI-based cheat overlay for RPG Maker MV and MZ games',

  // Change this to /RPG-Maker-MV-MZ-Cheat-UI-Plugin/ to match your repo name
  base: '/RPG-Maker-MV-MZ-Cheat-UI-Plugin/',

  head: [
    ['link', { rel: 'icon', href: '/RPG-Maker-MV-MZ-Cheat-UI-Plugin/favicon.ico' }],
    ['meta', { name: 'theme-color', content: '#00c97a' }],
    ['meta', { property: 'og:title', content: 'RPG Cheat UI Plugin' }],
    ['meta', { property: 'og:description', content: 'GUI-based cheat overlay for RPG Maker MV/MZ' }],
  ],

  themeConfig: {
    logo: '/logo.svg',
    siteTitle: 'RPG Cheat UI',

    nav: [
      { text: 'Home', link: '/' },
      { text: 'Guide', link: '/guide/getting-started' },
      { text: 'Translation', link: '/guide/translation-usage' },
      { text: 'Features', link: '/guide/features' },
      { text: 'Changelog', link: '/guide/changelog' },
      {
        text: 'v1.1.2',
        items: [
          { text: 'Releases', link: 'https://github.com/Eduwilll/RPG-Maker-MV-MZ-Cheat-UI-Plugin/releases' },
          { text: 'Changelog', link: '/guide/changelog' },
        ]
      }
    ],

    sidebar: [
      {
        text: 'Introduction',
        items: [
          { text: 'What is this?', link: '/guide/what-is-this' },
          { text: 'Getting Started', link: '/guide/getting-started' },
        ]
      },
      {
        text: 'Installation',
        items: [
          { text: 'RPG Maker MV', link: '/guide/install-mv' },
          { text: 'RPG Maker MZ', link: '/guide/install-mz' },
          { text: 'Updating nwjs', link: '/guide/update-nwjs' },
        ]
      },
      {
        text: 'Translation',
        items: [
          { text: 'Translation Guide', link: '/guide/translation-usage' },
          { text: 'Translation Engines', link: '/guide/translation-engines' },
          { text: 'Server Setup Guide', link: '/guide/translation-setup' },
        ]
      },
      {
        text: 'Usage',
        items: [
          { text: 'Features', link: '/guide/features' },
          { text: 'Shortcuts', link: '/guide/shortcuts' },
          { text: 'Sharing Settings', link: '/guide/sharing-settings' },
        ]
      },
      {
        text: 'Troubleshooting',
        items: [
          { text: 'Common Issues', link: '/guide/troubleshooting' },
        ]
      },
      {
        text: 'Meta',
        items: [
          { text: 'Changelog', link: '/guide/changelog' },
          { text: 'Contributing', link: '/guide/contributing' },
          { text: 'License', link: '/guide/license' },
        ]
      }
    ],

    socialLinks: [
      { icon: 'github', link: 'https://github.com/Eduwilll/RPG-Maker-MV-MZ-Cheat-UI-Plugin' }
    ],

    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Originally by paramonos · Fork maintained by Eduwilll'
    },

    editLink: {
      pattern: 'https://github.com/Eduwilll/RPG-Maker-MV-MZ-Cheat-UI-Plugin/edit/main/docs/:path',
      text: 'Edit this page on GitHub'
    },

    search: {
      provider: 'local'
    },

    lastUpdated: {
      text: 'Last updated',
      formatOptions: {
        dateStyle: 'short',
      }
    }
  },

  lastUpdated: true,
  markdown: {
    config(md) {
      md.use(groupIconMdPlugin)
    }
  },
  vite: {
    plugins: [
      groupIconVitePlugin()
    ]
  }
})
