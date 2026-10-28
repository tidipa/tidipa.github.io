// Open Graph images for pages without their own `socialImage`, generated at build time in the
// site's light-mode colours (the replacement for Quartz's CustomOgImages). Served at /og/<id>.png.
import { getCollection } from "astro:content";
import { OGImageRoute } from "astro-og-canvas";

const pages = Object.fromEntries(
	(await getCollection("docs", ({ id, data }) => id !== "404" && !data.draft && !data.socialImage)).map(
		({ id, data }) => [id, data],
	),
);

// Many descriptions are a paragraph long; keep the first ~200 characters, cut at a word.
const shorten = (text = "") => (text.length > 200 ? text.slice(0, 200).replace(/\s+\S*$/, "") + "…" : text);

const font = (subset: string, weight: number) =>
	`https://api.fontsource.org/v1/fonts/noto-sans/${subset}-${weight}-normal.ttf`;

export const { getStaticPaths, GET } = await OGImageRoute({
	pages,
	getImageOptions: (_id, page) => ({
		title: page.title,
		description: shorten(page.description),
		logo: { path: "./src/assets/tidipa-icon.png", size: [96] },
		bgGradient: [[244, 238, 232]],
		border: { color: [181, 101, 167], width: 16, side: "inline-start" },
		padding: 72,
		font: {
			title: { families: ["Noto Sans"], weight: "Bold", color: [39, 39, 42], size: 60, lineHeight: 1.2 },
			description: { families: ["Noto Sans"], color: [97, 95, 95], size: 30, lineHeight: 1.45 },
		},
		// Latin plus Latin Extended (latin-ext) covers the Pāḷi and Sanskrit diacritics.
		fonts: [font("latin", 400), font("latin", 700), font("latin-ext", 400), font("latin-ext", 700)],
	}),
});
