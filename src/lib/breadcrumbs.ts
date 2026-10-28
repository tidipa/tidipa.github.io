// The breadcrumb trail for a page: Home, its parent folders, then the page itself. Shown above the
// title (PageTitle.astro) and given to search engines as a BreadcrumbList (route-data.ts).
import { getCollection } from "astro:content";
import { pageUrl } from "./graph-data";

export type Crumb = { label: string; href: string };

export async function getBreadcrumbs(id: string, title: string): Promise<Crumb[]> {
	if (id === "index") return [{ label: "Home", href: "/" }];
	const titles = new Map((await getCollection("docs")).map((entry) => [entry.id, entry.data.title]));
	// Each parent folder links to its index page (e.g. /khandhaka/) or the folder page that
	// starlight-group-pages generates (e.g. /articles/).
	const folders = id.split("/").slice(0, -1);
	return [
		{ label: "Home", href: "/" },
		...folders.map((folder, i) => {
			const folderId = folders.slice(0, i + 1).join("/");
			return { label: titles.get(folderId) ?? folder.charAt(0).toUpperCase() + folder.slice(1), href: `/${folderId}/` };
		}),
		{ label: title, href: pageUrl(id) },
	];
}
