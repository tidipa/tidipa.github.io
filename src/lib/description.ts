// Descriptions for pages that have none: Quartz v5's Description plugin (quartz-community/description,
// src/transformer.ts). Copyright (c) 2021 jackyzha0, MIT License (see LICENSE.txt).
//
// Quartz takes the text of the rendered page; here it comes from the HTML that Astro's content loader
// renders, and content.config.ts stores the result as the page's description, so Starlight's meta
// tags, the Open Graph images, the RSS feed and the tag and folder pages all use it. Quartz's HTML
// escaping is left out: Starlight escapes attribute values itself.
const descriptionLength = 150;
const maxDescriptionLength = 300;

const urlRegex = new RegExp(
	/(https?:\/\/)?(?<domain>([\da-z.-]+)\.([a-z.]{2,6})(:\d+)?)(?<path>[/\w.-]*)(\?[/\w.=&;-]*)?/,
	"g",
);

const entities: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };

/** The page's visible text, without Starlight's screen-reader labels, aside titles or Mermaid source. */
function toText(html: string) {
	return html
		.replace(/<(script|style)\b[\s\S]*?<\/\1>/gi, " ")
		.replace(/<pre class="mermaid"[\s\S]*?<\/pre>/gi, " ")
		.replace(/<span class="sr-only"[^>]*>[\s\S]*?<\/span>/gi, " ")
		.replace(/<p class="starlight-aside__title"[\s\S]*?<\/p>/gi, " ")
		// Block elements separate words; inline ones (links, emphasis) don't, e.g. "<a>Pages</a>." -> "Pages."
		.replace(/<\/?(?:address|article|aside|blockquote|br|dd|details|div|dl|dt|figcaption|figure|h[1-6]|hr|li|ol|p|pre|section|summary|table|td|th|tr|ul)\b[^>]*>/gi, " ")
		.replace(/<[^>]+>/g, "")
		.replace(/&(#x[\da-f]+|#\d+|[a-z]+);/gi, (entity, name: string) => {
			if (name[0] === "#") {
				return String.fromCodePoint(name[1] === "x" ? parseInt(name.slice(2), 16) : parseInt(name.slice(1), 10));
			}
			return entities[name.toLowerCase()] ?? entity;
		})
		.trim();
}

export function describe(html: string) {
	const text = toText(html).replace(urlRegex, "$<domain>" + "$<path>");

	const sentences = text.replace(/\s+/g, " ").split(/\.\s/);
	let finalDesc = "";
	let sentenceIdx = 0;

	while (sentenceIdx < sentences.length) {
		const sentence = sentences[sentenceIdx];
		if (!sentence) break;

		const currentSentence = sentence.endsWith(".") ? sentence : sentence + ".";
		const nextLength = finalDesc.length + currentSentence.length + (finalDesc ? 1 : 0);

		if (nextLength <= descriptionLength || sentenceIdx === 0) {
			finalDesc += (finalDesc ? " " : "") + currentSentence;
			sentenceIdx++;
		} else {
			break;
		}
	}

	return finalDesc.length > maxDescriptionLength ? finalDesc.slice(0, maxDescriptionLength) + "..." : finalDesc;
}
