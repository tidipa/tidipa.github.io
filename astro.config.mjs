// @ts-check
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { defineConfig, fontProviders } from "astro/config";
import { unified } from "@astrojs/markdown-remark";
import starlight from "@astrojs/starlight";
import mermaid from "astro-mermaid";
import rehypeCitation from "rehype-citation";
import rehypeKatex from "rehype-katex";
import remarkMath from "remark-math";
import starlightGroupPages from "starlight-group-pages";
import starlightLinksValidator from "starlight-links-validator";
import starlightTags from "starlight-tags";
import { writeTagsConfig } from "./src/lib/tags.mjs";

// starlight-tags reads its tag definitions (labels for the folded tag IDs) from this file.
writeTagsConfig("./src/content/docs", "./.astro/tags.yml");

// Astro caches each page's rendered Markdown until the page or the config changes. Putting the
// bibliography's hash into the config makes an edit to bibliography.bib re-render every page.
const bibliographyHash = createHash("sha1").update(readFileSync("./bibliography.bib")).digest("hex");

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
  // Astro 7's default Markdown processor (Sätteri) does not run remark/rehype plugins, and
  // citations (rehype-citation) and maths (remark-math + rehype-katex) need them. Starlight and
  // astro-mermaid both detect this unified() processor and add their own plugins to it.
  markdown: {
    processor: unified({
      remarkPlugins: [remarkMath],
      rehypePlugins: [
        rehypeKatex,
        // Pandoc-style citations, e.g. [@Norman1997], resolved against bibliography.bib and
        // rendered in APA style, with the bibliography appended to the end of the page.
        [rehypeCitation, { bibliography: "./bibliography.bib", csl: "apa", bibliographyHash }],
      ],
    }),
  },
  vite: {
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
    // Mermaid diagrams: client-side, follows the light/dark toggle. Colours come from the
    // site's own --sl-color-* tokens via themeCSS, so diagrams never hard-code colours.
    mermaid({
      theme: "default",
      autoTheme: true,
      enableLog: false,
      mermaidConfig: {
        fontFamily: '"Noto Sans", sans-serif',
        flowchart: { curve: "basis", useMaxWidth: true, padding: 8, nodeSpacing: 28, rankSpacing: 44 },
        themeCSS: `
          .node rect, .node circle, .node ellipse, .node polygon, .node path { fill: var(--sl-color-gray-6); stroke: var(--sl-color-accent); stroke-width: 1.5px; }
          .node polygon { fill: var(--sl-color-accent-low); }
          .label, .nodeLabel, .edgeLabel, .cluster span, .cluster .label { color: var(--sl-color-text) !important; font-family: var(--sl-font, "Noto Sans"), sans-serif; }
          .node polygon ~ .label .nodeLabel, .node polygon ~ .label span { color: var(--sl-color-white) !important; }
          .edgeLabel, .edgeLabel p, .edgeLabel span, .labelBkg { background-color: var(--sl-color-bg) !important; }
          .edgePath .path, .flowchart-link { stroke: var(--sl-color-gray-3); stroke-width: 1.5px; }
          .arrowheadPath, marker path { fill: var(--sl-color-gray-3); stroke: var(--sl-color-gray-3); }
          .cluster rect { fill: var(--sl-color-bg-nav); stroke: var(--sl-color-hairline); }
        `,
      },
    }),
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
