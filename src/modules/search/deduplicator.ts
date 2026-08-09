import type { SearchResult } from "./types";

function normalizeTitle(title: string): string {
  return title.toLowerCase().replace(/\s+/g, " ").trim();
}

function dedupeKey(r: SearchResult): string {
  if (r.infoHash) return `hash:${r.infoHash.toLowerCase()}`;
  if (r.guid) return `guid:${r.guid}`;
  if (r.downloadUrl) return `url:${r.downloadUrl}`;
  return `title:${normalizeTitle(r.title)}|${r.size ?? ""}`;
}

export function deduplicateResults(results: SearchResult[]): SearchResult[] {
  const seen = new Set<string>();
  const out: SearchResult[] = [];
  for (const r of results) {
    const key = dedupeKey(r);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(r);
  }
  return out;
}
