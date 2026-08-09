export type TorznabType = "caps" | "search" | "tvsearch";

export interface TorznabRequest {
  type: TorznabType;
  q?: string;
  season?: number;
  ep?: number;
  tvdbId?: number;
  tmdbId?: number;
  imdbId?: string;
  categories: number[];
  limit: number;
  offset: number;
  apikey?: string;
}

export interface TorznabItem {
  title: string;
  guid: string;
  link: string;
  pubDate: Date;
  size?: number;
  categories: number[];
  seeders?: number;
  peers?: number;
  infoHash?: string;
}
