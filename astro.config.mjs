// @ts-check
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { defineConfig, fontProviders } from "astro/config";
import { satteri } from "@astrojs/markdown-satteri";
import starlight from "@astrojs/starlight";
import { satteriKatex } from "satteri-katex";
import starlightGroupPages from "starlight-group-pages";
import starlightLinksValidator from "starlight-links-validator";
import starlightTags from "starlight-tags";
import { citations } from "./src/plugins/citations.mjs";
import { mermaidFences } from "./src/plugins/mermaid.mjs";
import { writeTagsConfig } from "./src/lib/tags.mjs";

// starlight-tags reads its tag definitions (labels for the folded tag IDs) from this file.
writeTagsConfig("./src/content/docs", "./.astro/tags.yml");

// Sätteri, Astro 7's Markdown processor, with maths ($…$ and $$…$$, parsed by Sätteri and rendered by
// satteri-katex, a native port of rehype-katex), Mermaid fences turned into <pre class="mermaid"> for
// src/components/Mermaid.astro to render (src/plugins/mermaid.mjs) and pandoc-style citations
// ([@Norman1997] or @Norman1997, resolved against bibliography.bib and rendered in APA style under the
// page's `## References` heading; src/plugins/citations.mjs, a rehype plugin run through
// src/plugins/rehype-bridge.mjs). Starlight detects the Sätteri processor and adds its own plugins to it.
const processor = satteri({
  features: { math: true },
  mdastPlugins: [satteriKatex(), mermaidFences()],
  hastPlugins: [citations()],
});
// Astro caches each page's rendered Markdown until the page or the config digest changes, and the
// digest skips functions, so the plugin alone would not notice an edit to bibliography.bib. The
// file's hash here makes such an edit re-render every page.
Object.assign(processor.options, {
  bibliographyHash: createHash("sha1").update(readFileSync("./bibliography.bib")).digest("hex"),
});

// https://astro.build/config
export default defineConfig({
  site: "https://tidipa.github.io",
  // Fetch pages on hover so navigation is near-instant (the nearest thing to Quartz's SPA routing).
  prefetch: { prefetchAll: true },
  fonts: [
    {
      provider: fontProviders.google(),
      name: "Noto Sans",
      cssVariable: "--sl-font",
      weights: [400, 600, 700],
      styles: ["normal", "italic"],
      subsets: ["latin", "latin-ext"],
    },
    {
      provider: fontProviders.google(),
      name: "Noto Sans Mono",
      cssVariable: "--sl-font-mono",
      weights: [400],
      styles: ["normal"],
      subsets: ["latin", "latin-ext"],
      fallbacks: ["monospace"],
    },
  ],
  markdown: { processor },
  vite: {
    // Pre-bundle Mermaid for the dev server; src/components/Mermaid.astro loads it on demand.
    optimizeDeps: { include: ["mermaid"] },
    build: {
      chunkSizeWarningLimit: 1500,
      rolldownOptions: {
        onwarn(warning, defaultHandler) {
          if (
            warning.code === "MODULE_LEVEL_DIRECTIVE" &&
            warning.message.includes('"use astro:head-inject"')
          ) {
            return;
          }
          defaultHandler(warning);
        },
      },
    },
  },
  integrations: [
    starlight({
      title: "Tidipa",
      description:
        "A new, open source, independent, rational English translation of selections from the Pāḷi Tipiṭaka",
      components: {
        Head: "./src/components/Head.astro",
        PageTitle: "./src/components/PageTitle.astro",
        LastUpdated: "./src/components/LastUpdated.astro",
        // Quartz v5's graph view and backlinks (src/components/Graph.astro, Backlinks.astro).
        PageSidebar: "./src/components/PageSidebar.astro",
        Footer: "./src/components/Footer.astro",
        // Reader mode (Quartz v5) and a toggle for each sidebar, beside the theme picker.
        ThemeSelect: "./src/components/ThemeSelect.astro",
      },
      head: [
        { tag: "link", attrs: { rel: "alternate", type: "application/rss+xml", title: "Tidipa", href: "/index.xml" } },
      ],
      lastUpdated: true,
      // SEO tags and JSON-LD for each page, from its frontmatter.
      routeMiddleware: "./src/route-data.ts",
      social: [
        {
          icon: "github",
          label: "GitHub",
          href: "https://github.com/tidipa/tidipa.github.io",
        },
      ],
      sidebar: [
        {
          label: "Introduction",
          items: [
            { label: "Tidipa", link: "/" },
            "motivation",
            "buddha",
            "ethics",
            "pali",
            "translation",
          ],
        },
        {
          label: "Khandhaka",
          items: [
            "khandhaka",
            "khandhaka/1-1", "khandhaka/1-2", "khandhaka/1-3", "khandhaka/1-4", "khandhaka/1-5",
            "khandhaka/1-6", "khandhaka/1-7", "khandhaka/1-8", "khandhaka/1-9", "khandhaka/1-10",
            "khandhaka/1-11", "khandhaka/1-12", "khandhaka/1-13", "khandhaka/1-14", "khandhaka/1-14-1",
          ],
        },
        {
          label: "Articles",
          collapsed: true,
          items: [{ autogenerate: { directory: "articles" } }],
        },
        {
          label: "Books",
          collapsed: true,
          items: [{ autogenerate: { directory: "books" } }],
        },
        {
          label: "About",
          items: ["aboutme", "website"],
        },
      ],
      customCss: [
        "katex/dist/katex.min.css",
        "./src/styles/custom.css",
      ],
      logo: {
        src: "./src/assets/tidipa-icon.png",
      },
      favicon: "/favicon.png",
      defaultLocale: "root",
      locales: {
        root: {
          label: "English",
          lang: "en",
        },
      },
      plugins: [
        // Fails the build on a broken internal link or heading anchor.
        starlightLinksValidator(),
        // Tag badges, a tag index at /tags/ and a page per tag; labels come from .astro/tags.yml.
        starlightTags({ configPath: ".astro/tags.yml", onInlineTagsNotFound: "error" }),
        // Folder pages listing the articles and books (the Khandhaka keeps its own index).
        starlightGroupPages({ extendIndexPages: false, layout: "list" }),
      ],
    }),
  ],
});
