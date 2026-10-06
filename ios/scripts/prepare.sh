#!/usr/bin/env bash
# Prepares the iOS build:
#   1. copies the web app (UI, problems, offline Python) into ios/LocalLeet/web
#   2. downloads the prebuilt llama.cpp xcframework (pinned + checksummed)
# Run from anywhere: ios/scripts/prepare.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
IOS="$ROOT/ios"
WEB="$IOS/LocalLeet/web"

LLAMA_TAG="b11433"
LLAMA_SHA256="42feed827d87cb03ebfb6c5c6a76bacd0f34ad34dacd5591a0f1bdc24e6e52ba"

echo "==> Bundling web app into $WEB"
rm -rf "$WEB"
mkdir -p "$WEB/vendor"
cp "$ROOT/index.html" "$ROOT/manifest.webmanifest" "$WEB/"
cp -R "$ROOT/css" "$ROOT/js" "$ROOT/problems" "$ROOT/py" "$ROOT/icons" "$WEB/"
cp -R "$ROOT/vendor/pyodide" "$WEB/vendor/"
cp "$ROOT/vendor/codemirror.js" "$ROOT/vendor/marked.js" "$WEB/vendor/"
# The browser AI engines (vendor/web-llm.js, vendor/wllama) aren't needed:
# the app runs models natively. The service worker isn't used in the app either.
du -sh "$WEB"

FW="$IOS/Frameworks/llama.xcframework"
if [ -d "$FW" ] && [ -f "$IOS/Frameworks/.llama-$LLAMA_TAG" ]; then
  echo "==> llama.xcframework $LLAMA_TAG already present"
else
  echo "==> Downloading llama.cpp $LLAMA_TAG xcframework"
  TMP="$(mktemp -d)"
  curl -fL --retry 3 -o "$TMP/llama.zip" \
    "https://github.com/ggml-org/llama.cpp/releases/download/$LLAMA_TAG/llama-$LLAMA_TAG-xcframework.zip"
  echo "$LLAMA_SHA256  $TMP/llama.zip" | shasum -a 256 -c -
  unzip -q "$TMP/llama.zip" -d "$TMP"
  rm -rf "$FW" "$IOS/Frameworks"/.llama-*
  mkdir -p "$IOS/Frameworks"
  mv "$TMP/build-apple/llama.xcframework" "$FW"
  # macOS slice isn't needed and keeps the app smaller to build
  rm -rf "$FW/macos-arm64_x86_64"
  python3 - "$FW/Info.plist" <<'PY'
import plistlib, sys
p = sys.argv[1]
d = plistlib.load(open(p, "rb"))
d["AvailableLibraries"] = [l for l in d["AvailableLibraries"] if l["LibraryIdentifier"].startswith("ios")]
plistlib.dump(d, open(p, "wb"))
PY
  touch "$IOS/Frameworks/.llama-$LLAMA_TAG"
  rm -rf "$TMP"
fi
echo "==> Ready. Next: cd ios && xcodegen generate"
