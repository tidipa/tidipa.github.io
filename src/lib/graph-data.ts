// The site's link graph, built from the docs collection: each page's outgoing links and tags.
// Serves the graph view (/graph.json) and the backlinks. This replaces Quartz's contentIndex.json.
import { getCollection } from "astro:content";
import { tagLabels } from "./tags.mjs";

export type GraphPage = { title: string; links: string[]; tags: string[] };
/** `pages` is keyed by page URL (e.g. "/khandhaka/1-11/"); `tags` maps tag keys to labels. */
export type GraphData = { pages: Record<string, GraphPage>; tags: Record<string, string> };

export const pageUrl = (id: string) => (id === "index" ? "/" : `/${id}/`);

// Internal links are standard root-relative Markdown links, e.g. ](/khandhaka/1-10/#anchor)
const internalLink = /\]\((\/[^)\s#]*)/g;

async function buildGraphData(): Promise<GraphData> {
	const docs = await getCollection("docs", ({ id, data }) => id !== "404" && !data.draft);
	const urls = new Set(docs.map(({ id }) => pageUrl(id).normalize("NFC")));
	const pages: Record<string, GraphPage> = {};
	const usedTags = new Set<string>();
	for (const { id, body = "", data } of docs) {
		const url = pageUrl(id).normalize("NFC");
		const links = new Set<string>();
		for (const [, href] of body.matchAll(internalLink)) {
			let target = decodeURI(href).normalize("NFC");
			if (!target.endsWith("/")) target += "/";
			if (target !== url && urls.has(target)) links.add(target);
		}
		const tags = data.tags ?? [];
		tags.forEach((tag) => usedTags.add(tag));
		pages[url] = { title: data.title, links: [...links], tags };
	}
	const labels = tagLabels("./src/content/docs");
	const tags = Object.fromEntries([...usedTags].sort().map((key) => [key, labels.get(key) ?? key]));
	return { pages, tags };
}

let cached: Promise<GraphData> | undefined;
/** Built once per production build; rebuilt on each request in dev so edits show up. */
export function getGraphData() {
	return import.meta.env.DEV ? buildGraphData() : (cached ??= buildGraphData());
}

/** Pages that link to `url`, sorted by title. */
export async function getBacklinks(url: string) {
	const { pages } = await getGraphData();
	const target = url.normalize("NFC");
	return Object.entries(pages)
		.filter(([, page]) => page.links.includes(target))
		.map(([href, page]) => ({ href, title: page.title }))
		.sort((a, b) => a.title.localeCompare(b.title));
}
