// NAFDAC Greenbook's data contains literal HTML entities (e.g. "BG Pharma
// &amp; Healthcare Limited") rather than the actual characters. Decodes the
// handful that show up in practice in product/company/category names.
// Idempotent: running it on already-clean text is a no-op, so it's safe to
// apply both when scraping fresh data AND when reading previously-cached
// data that predates this fix.
const HTML_ENTITIES: Record<string, string> = {
  "&amp;": "&",
  "&apos;": "'",
  "&quot;": '"',
  "&lt;": "<",
  "&gt;": ">",
  "&#039;": "'",
}

export function decodeHtmlEntities(value: string): string {
  return value.replace(/&amp;|&apos;|&quot;|&lt;|&gt;|&#039;/g, (match) => HTML_ENTITIES[match])
}
