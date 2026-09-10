#!/usr/bin/env bash
# Build a web / portal distribution of Trice from www/.
#
#   ./scripts/pack-web.sh              plain build   -> dist-web/ + trice-web.zip   (itch.io, your own site)
#   ./scripts/pack-web.sh poki         wires in the Poki adapter
#   ./scripts/pack-web.sh crazygames   wires in the CrazyGames adapter
#
# The game is already one self-contained file; the only per-portal difference is a
# single <script> tag for that portal's SDK adapter (www/portal-*.js).
set -euo pipefail
cd "$(dirname "$0")/.."
PORTAL="${1:-none}"
OUT="dist-web"

rm -rf "$OUT" && mkdir -p "$OUT"
cp -R www/. "$OUT"/

insert_adapter() {
  node -e '
    const fs = require("fs"), p = process.argv[1], tag = process.argv[2];
    let h = fs.readFileSync(p, "utf8");
    if (h.indexOf(tag) === -1)
      h = h.replace("<script>\n(function(){", tag + "\n<script>\n(function(){");
    fs.writeFileSync(p, h);
  ' "$OUT/index.html" "$1"
}

case "$PORTAL" in
  poki)
    cp portal/portal-poki.js "$OUT"/
    insert_adapter '<script src="portal-poki.js"></script>'
    echo "→ Poki adapter wired. Register the game at https://sdk.poki.dev and test in the Poki Inspector."
    ;;
  crazygames)
    cp portal/portal-crazygames.js "$OUT"/
    insert_adapter '<script src="portal-crazygames.js"></script>'
    echo "→ CrazyGames adapter wired. Submit via https://developer.crazygames.com (docs: https://docs.crazygames.com)."
    ;;
  none)
    echo "→ Plain web build. For itch.io: upload the zip, set 'This file will be played in the browser',"
    echo "  viewport ~420 x 860, and enable the fullscreen button."
    ;;
  *)
    echo "Unknown portal '$PORTAL' — use: poki | crazygames | none" >&2; exit 1;;
esac

( cd "$OUT" && zip -qr "../trice-web.zip" . )
echo "Built  $OUT/  and  trice-web.zip"
