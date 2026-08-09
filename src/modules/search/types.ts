export interface SearchResult {
  guid: string;
  title: string;
  originalTitle: string;
  indexerId?: number;
  indexerName?: string;
  downloadUrl: string;
  infoHash?: string;
  size?: number;
  seeders?: number;
  peers?: number;
  publishDate?: string;
  categories: number[];
  protocol?: "torrent" | "usenet";
}

export interface GenerateQueriesInput {
  titles: string[];
  season?: number;
  episode?: number;
  maxFormatsPerTitle: number;
  maxQueries: number;
}
