#!/usr/bin/env bash
set -euo pipefail
BASE="${1:?base url}"
KEY="${2:?apikey}"
HEALTH_RESPONSE="$(mktemp)"
CAPS_RESPONSE="$(mktemp)"
TV_RESPONSE="$(mktemp)"
MOVIE_RESPONSE="$(mktemp)"
trap 'rm -f "$HEALTH_RESPONSE" "$CAPS_RESPONSE" "$TV_RESPONSE" "$MOVIE_RESPONSE"' EXIT

# Write responses before checking them. Piping a large RSS response into `grep -q`
# makes grep close early and curl exits with code 23 under pipefail.
curl -fsS "$BASE/api/health" -o "$HEALTH_RESPONSE"
curl -fsS "$BASE/api/torznab/api?t=caps&apikey=$KEY" -o "$CAPS_RESPONSE"
curl -fsS "$BASE/api/torznab/api?t=tvsearch&cat=5000,5030,5040,5045&tvdbid=366625&season=2&ep=12&apikey=$KEY" -o "$TV_RESPONSE"
curl -fsS "$BASE/api/torznab/api?t=movie&cat=2000,2030,2040,2045&tmdbid=980477&year=2023&apikey=$KEY" -o "$MOVIE_RESPONSE"

grep -q '"status"' "$HEALTH_RESPONSE"
grep -q '<caps' "$CAPS_RESPONSE"
grep -q '<rss' "$TV_RESPONSE"
grep -q '<rss' "$MOVIE_RESPONSE"
echo "smoke ok"
