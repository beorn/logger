import { defineConfig } from "vitepress"

export default defineConfig({
  title: "@beorn/logger",
  description: "Structured logging with spans. ~3KB, zero-overhead disabled logging via optional chaining.",
  base: "/logger/",

  themeConfig: {
    siteTitle: "@beorn/logger",

    nav: [
      { text: "Guide", link: "/guide/getting-started" },
      { text: "API", link: "/api/" },
      { text: "GitHub", link: "https://github.com/beorn/logger" },
    ],

    sidebar: {
      "/guide/": [
        {
          text: "Introduction",
          items: [
            { text: "Getting Started", link: "/guide/getting-started" },
            { text: "Why @beorn/logger?", link: "/guide/why" },
          ],
        },
        {
          text: "Features",
          items: [
            { text: "Zero-Overhead Logging", link: "/guide/zero-overhead" },
            { text: "Spans", link: "/guide/spans" },
            { text: "Worker Threads", link: "/guide/workers" },
          ],
        },
        {
          text: "Migration",
          items: [{ text: "From debug", link: "/guide/migration-from-debug" }],
        },
      ],
      "/api/": [
        {
          text: "API Reference",
          items: [
            { text: "Overview", link: "/api/" },
            { text: "Logger", link: "/api/logger" },
            { text: "Configuration", link: "/api/configuration" },
            { text: "Writers", link: "/api/writers" },
            { text: "Worker Thread", link: "/api/worker" },
          ],
        },
      ],
    },

    socialLinks: [{ icon: "github", link: "https://github.com/beorn/logger" }],

    outline: { level: [2, 3] },

    search: {
      provider: "local",
    },

    footer: {
      message: "Released under the MIT License.",
      copyright: "Copyright &copy; 2026 Bj&oslash;rn Stabell",
    },
  },
})
