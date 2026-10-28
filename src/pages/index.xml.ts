// RSS feed of every page, newest first, at the same /index.xml URL Quartz used.
import { execFileSync } from "node:child_process";
import rss from "@astrojs/rss";
import type { APIContext } from "astro";
import { getCollection } from "astro:content";

// The date Starlight shows as "Last updated": the file's most recent commit.
function lastCommitDate(filePath?: string) {
	if (!filePath) return undefined;
	try {
		const iso = execFileSync("git", ["log", "-1", "--format=%cI", "--", filePath], { encoding: "utf8" }).trim();
		return iso ? new Date(iso) : undefined;
	} catch {
		return undefined;
	}
}

export async function GET(context: APIContext) {
	const docs = await getCollection("docs", ({ id, data }) => id !== "404" && !data.draft);
	const items = docs
		.map(({ id, filePath, data }) => ({
			title: data.title,
			description: data.description,
			link: id === "index" ? "/" : `/${id}/`,
			pubDate: lastCommitDate(filePath) ?? new Date(),
		}))
		.sort((a, b) => b.pubDate.getTime() - a.pubDate.getTime() || a.title.localeCompare(b.title));
	return rss({
		title: "Tidipa",
		description:
			"A new, open source, independent, rational English translation of selections from the Pāḷi Tipiṭaka",
		site: context.site!,
		items,
	});
}
