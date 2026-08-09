#!/usr/bin/env bash
set -euo pipefail
BASE="${1:?base url}"
KEY="${2:?apikey}"
curl -fsS "$BASE/api/health" | grep -q '"status"'
curl -fsS "$BASE/api/torznab?t=caps&apikey=$KEY" | grep -q '<caps'
curl -fsS "$BASE/api/torznab?t=tvsearch&tvdbid=366625&season=2&ep=12&apikey=$KEY" | grep -q '<rss'
echo "smoke ok"
