import { defineConfig } from "vitepress";
import {
  groupIconMdPlugin,
  groupIconVitePlugin,
} from "vitepress-plugin-group-icons";

const repoBase = "/RPG-Maker-MV-MZ-Cheat-UI-Plugin/";

export default defineConfig({
  title: "RPG Maker MV/MZ Cheat UI",
  description:
    "Documentation for the RPG Maker MV/MZ Cheat UI plugin, translation tools, installation, and development workflow.",
  base: repoBase,
  cleanUrls: true,
  ignoreDeadLinks: [/^https?:\/\/localhost/],

  head: [
    ["link", { rel: "icon", href: "/favicon.ico" }],
    ["link", { rel: "alternate icon", href: `${repoBase}favicon.ico` }],
    ["meta", { name: "theme-color", content: "#1f8f74" }],
    [
      "meta",
      {
        name: "description",
        content:
          "Install, use, translate, and develop the RPG Maker MV/MZ Cheat UI plugin.",
      },
    ],
    ["meta", { property: "og:title", content: "RPG Maker MV/MZ Cheat UI" }],
    [
      "meta",
      {
        property: "og:description",
        content:
          "Install, use, translate, and develop the RPG Maker MV/MZ Cheat UI plugin.",
      },
    ],
    ["meta", { property: "og:type", content: "website" }],
    ["meta", { property: "og:image", content: `${repoBase}images/general-panel.png` }],
    [
      "link",
      {
        rel: "preconnect",
        href: "https://fonts.googleapis.com",
      },
    ],
    [
      "link",
      {
        rel: "preconnect",
        href: "https://fonts.gstatic.com",
        crossorigin: "",
      },
    ],
    [
      "link",
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600&family=Space+Grotesk:wght@400;500;700&display=swap",
      },
    ],
  ],

  themeConfig: {
    logo: "/logo.svg",
    siteTitle: "RPG Cheat UI Docs",

    nav: [
      { text: "Home", link: "/" },
      { text: "Install", link: "/guide/introduction/getting-started" },
      { text: "Features", link: "/guide/features/features" },
      { text: "Translation", link: "/guide/translation/translation-usage" },
      { text: "Development", link: "/guide/introduction/development" },
      {
        text: "More",
        items: [
          { text: "Architecture", link: "/guide/technical/architecture" },
          { text: "Troubleshooting", link: "/guide/troubleshooting/troubleshooting" },
          { text: "Changelog", link: "/guide/meta/changelog" },
          {
            text: "GitHub",
            link: "https://github.com/Eduwilll/RPG-Maker-MV-MZ-Cheat-UI-Plugin",
          },
          {
            text: "Releases",
            link: "https://github.com/Eduwilll/RPG-Maker-MV-MZ-Cheat-UI-Plugin/releases",
          },
        ],
      },
    ],

    sidebar: [
      {
        text: "Introduction",
        items: [
          { text: "What Is This?", link: "/guide/introduction/what-is-this" },
          { text: "Getting Started", link: "/guide/introduction/getting-started" },
          { text: "Development & Test", link: "/guide/introduction/development" },
        ],
      },
      {
        text: "Installation",
        items: [
          { text: "Install on RPG Maker MV", link: "/guide/installation/install-mv" },
          { text: "Install on RPG Maker MZ", link: "/guide/installation/install-mz" },
          { text: "Update NW.js", link: "/guide/installation/update-nwjs" },
        ],
      },
      {
        text: "Usage",
        items: [
          { text: "Feature Reference", link: "/guide/features/features" },
          { text: "Shortcuts", link: "/guide/features/shortcuts" },
          { text: "Sharing Settings", link: "/guide/features/sharing-settings" },
        ],
      },
      {
        text: "Translation",
        items: [
          { text: "Translation Usage", link: "/guide/translation/translation-usage" },
          { text: "Translation Engines", link: "/guide/translation/translation-engines" },
          { text: "Server Setup", link: "/guide/translation/translation-setup" },
        ],
      },
      {
        text: "Technical",
        items: [
          { text: "Architecture", link: "/guide/technical/architecture" },
          {
            text: "Repository Structure",
            link: "/guide/technical/repository-structure",
          },
          {
            text: "Roadmap",
            link: "/guide/technical/roadmap",
          },
          {
            text: "Panel Conventions",
            link: "/guide/technical/panel-conventions",
          },
          {
            text: "Shortcut Conventions",
            link: "/guide/technical/shortcut-conventions",
          },
          {
            text: "Runtime and Data Flow",
            link: "/guide/technical/runtime-and-data-flow",
          },
          {
            text: "Build and Release",
            link: "/guide/technical/build-and-release",
          },
        ],
      },
      {
        text: "Help",
        items: [{ text: "Troubleshooting", link: "/guide/troubleshooting/troubleshooting" }],
      },
      {
        text: "Project",
        items: [
          { text: "Changelog", link: "/guide/meta/changelog" },
          { text: "Contributing", link: "/guide/meta/contributing" },
          { text: "License", link: "/guide/meta/license" },
        ],
      },
    ],

    socialLinks: [
      {
        icon: "github",
        link: "https://github.com/Eduwilll/RPG-Maker-MV-MZ-Cheat-UI-Plugin",
      },
    ],

    footer: {
      message: "Released under the MIT License.",
      copyright: "Original plugin by paramonos. Maintained and expanded by Eduwilll.",
    },

    editLink: {
      pattern:
        "https://github.com/Eduwilll/RPG-Maker-MV-MZ-Cheat-UI-Plugin/edit/main/docs/:path",
      text: "Edit this page on GitHub",
    },

    search: {
      provider: "local",
    },

    outline: {
      level: [2, 3],
      label: "On this page",
    },

    docFooter: {
      prev: "Previous page",
      next: "Next page",
    },

    lastUpdated: {
      text: "Last updated",
      formatOptions: {
        dateStyle: "medium",
      },
    },
  },

  lastUpdated: true,

  markdown: {
    config(md) {
      md.use(groupIconMdPlugin);
    },
  },

  vite: {
    plugins: [groupIconVitePlugin()],
  },
});
