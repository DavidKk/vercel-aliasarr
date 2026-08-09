import type { MediaIdentity } from "@/shared/types";
import type { TorznabRequest } from "@/modules/torznab/types";

export function buildIdentityFromTorznab(req: TorznabRequest): MediaIdentity {
  return {
    mediaType: "series",
    tvdbId: req.tvdbId,
    tmdbId: req.tmdbId,
    imdbId: req.imdbId,
    primaryTitle: req.q,
  };
}
