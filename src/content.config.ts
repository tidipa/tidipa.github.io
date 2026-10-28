import { defineCollection } from 'astro/content/config';
import type { Loader } from 'astro/loaders';
import { z } from 'astro/zod';
import { docsLoader, i18nLoader } from '@astrojs/starlight/loaders';
import { docsSchema, i18nSchema } from '@astrojs/starlight/schema';
import { describe } from './lib/description';
import { tagKey } from './lib/tags.mjs';

/** Starlight's docs loader, giving pages without a description one made from their text. */
function withDescriptions(loader: Loader): Loader {
	return {
		...loader,
		load: (context) =>
			loader.load({
				...context,
				store: new Proxy(context.store, {
					get(store, prop) {
						if (prop === 'set') {
							return (entry: Parameters<typeof store.set>[0]) =>
								store.set(
									entry.data.description || !entry.rendered?.html
										? entry
										: {
												...entry,
												// Flagged so the page doesn't show it as the description box (PageTitle.astro).
												data: { ...entry.data, description: describe(entry.rendered.html), descriptionGenerated: true },
											},
								);
						}
						const value = Reflect.get(store, prop, store);
						return typeof value === 'function' ? value.bind(store) : value;
					},
				}),
			}),
	};
}

export const collections = {
	docs: defineCollection({
		loader: withDescriptions(docsLoader()),
		schema: docsSchema({
			extend: ({ image }) =>
				z.object({
					// Each spelling of a tag folds to its starlight-tags ID; tags.yml holds the labels.
					tags: z
						.array(z.string())
						.optional()
						.transform((tags) => tags && [...new Set(tags.map(tagKey).filter(Boolean))]),
					hideTags: z.boolean().default(false),
					// A longer summary of a reproduced article or book, shown under its description (the
					// Khandhaka pages have theirs in the text instead).
					summary: z.string().optional(),
					// Shown under the description (PageTitle.astro) and used as the page's social image.
					cover: z
						.object({
							image: image(), // relative to the page, e.g. ./3V1.11.png
							alt: z.string(),
							caption: z.string().optional(),
						})
						.optional(),
					// Set by the loader for pages whose description was made from their text (see above).
					descriptionGenerated: z.boolean().optional(),
				}),
		}),
	}),
	i18n: defineCollection({ loader: i18nLoader(), schema: i18nSchema() }),
};
