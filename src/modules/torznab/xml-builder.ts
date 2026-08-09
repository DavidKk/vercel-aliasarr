import { create } from "xmlbuilder2";
import type { TorznabItem } from "./types";

export function buildErrorXml(code: number, description: string): string {
  const doc = create({ version: "1.0", encoding: "UTF-8" })
    .ele("error")
    .att("code", String(code))
    .att("description", description);
  return doc.end({ prettyPrint: true });
}

export function buildRssXml(
  items: TorznabItem[],
  opts?: { offset?: number; total?: number }
): string {
  const doc = create({ version: "1.0", encoding: "UTF-8" }).ele("rss", {
    version: "2.0",
    "xmlns:torznab": "http://torznab.com/schemas/2015/feed",
  });

  const channel = doc.ele("channel");
  channel.ele("title").txt("Aliasarr");
  channel.ele("description").txt("Chinese alias Torznab proxy");
  channel
    .ele("torznab:response")
    .att("offset", String(opts?.offset ?? 0))
    .att("total", String(opts?.total ?? items.length));

  for (const item of items) {
    const node = channel.ele("item");
    node.ele("title").txt(item.title);
    node.ele("guid").att("isPermaLink", "false").txt(item.guid);
    node.ele("link").txt(item.link);
    node.ele("pubDate").txt(item.pubDate.toUTCString());
    if (item.size != null) {
      node.ele("size").txt(String(item.size));
    }
    node
      .ele("enclosure")
      .att("url", item.link)
      .att("length", String(item.size ?? 0))
      .att("type", "application/x-bittorrent");

    for (const cat of item.categories) {
      node.ele("category").txt(String(cat));
      node.ele("torznab:attr").att("name", "category").att("value", String(cat));
    }
    if (item.seeders != null) {
      node
        .ele("torznab:attr")
        .att("name", "seeders")
        .att("value", String(item.seeders));
    }
    if (item.peers != null) {
      node
        .ele("torznab:attr")
        .att("name", "peers")
        .att("value", String(item.peers));
    }
    if (item.infoHash) {
      node
        .ele("torznab:attr")
        .att("name", "infohash")
        .att("value", item.infoHash);
    }
  }

  return doc.end({ prettyPrint: true });
}
