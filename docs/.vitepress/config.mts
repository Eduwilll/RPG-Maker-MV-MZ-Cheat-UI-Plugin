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
      { text: 'Guide', link: '/guide/introduction/getting-started' },
      { text: 'Translation', link: '/guide/translation/translation-usage' },
      { text: 'Features', link: '/guide/features/features' },
      { text: 'Changelog', link: '/guide/meta/changelog' },
      {
        text: 'v1.1.2',
        items: [
          { text: 'Releases', link: 'https://github.com/Eduwilll/RPG-Maker-MV-MZ-Cheat-UI-Plugin/releases' },
          { text: 'Changelog', link: '/guide/meta/changelog' },
        ]
      }
    ],

    sidebar: [
      {
        text: 'Introduction',
        items: [
          { text: 'What is this?', link: '/guide/introduction/what-is-this' },
          { text: 'Getting Started', link: '/guide/introduction/getting-started' },
          { text: 'Development & Test', link: '/guide/introduction/development' },
        ]
      },
      {
        text: 'Installation',
        items: [
          { text: 'RPG Maker MV', link: '/guide/installation/install-mv' },
          { text: 'RPG Maker MZ', link: '/guide/installation/install-mz' },
          { text: 'Updating nwjs', link: '/guide/installation/update-nwjs' },
        ]
      },
      {
        text: 'Translation',
        items: [
          { text: 'Translation Guide', link: '/guide/translation/translation-usage' },
          { text: 'Translation Engines', link: '/guide/translation/translation-engines' },
          { text: 'Server Setup Guide', link: '/guide/translation/translation-setup' },
        ]
      },
      {
        text: 'Usage',
        items: [
          { text: 'Features', link: '/guide/features/features' },
          { text: 'Shortcuts', link: '/guide/features/shortcuts' },
          { text: 'Sharing Settings', link: '/guide/features/sharing-settings' },
        ]
      },
      {
        text: 'Troubleshooting',
        items: [
          { text: 'Common Issues', link: '/guide/troubleshooting/troubleshooting' },
        ]
      },
      {
        text: 'Meta',
        items: [
          { text: 'Changelog', link: '/guide/meta/changelog' },
          { text: 'Contributing', link: '/guide/meta/contributing' },
          { text: 'License', link: '/guide/meta/license' },
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
