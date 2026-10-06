# LocalLeet

Offline Python interview practice for iPhone, iPad and desktop, with an AI tutor that runs **on your device**.

- **Real Python 3.14** in the browser (Pyodide/WebAssembly), with no server. Tests run in a worker, so infinite loops get stopped.
- **61 problems**, each with tests, 3 progressive hints, a reference solution and an explanation:
  - **6 multi-part "Chalk-style" problems.** Parts unlock one at a time, and there's more than fits in 45 minutes, like the real round. Themes: feature classes and resolvers via Python metaprogramming, resolver dependency graphs, rain flow on a height grid, a point-in-time feature store, an expression evaluator, and an in-memory DB with transactions.
  - **55 classic LeetCode problems** in Python: arrays and hashing, two pointers / sliding window, stack, binary search, linked lists, trees, heaps, graphs, intervals, DP, backtracking and design.
  - A **Python playground** for anything else.
- **On-device AI tutor** (Qwen2.5-Coder 0.5B/1.5B), told to give hints rather than solutions. It offers quick actions (hint, find my bug, complexity, approach) and a **mock interviewer** mode. It runs on WebLLM (WebGPU) on iOS 26+ / Safari 26+, Chrome and Edge, with a CPU fallback (wllama / llama.cpp WebAssembly) for older devices.
- **Interview mode.** A 45-minute timer, with the AI tutor, hints and solutions turned off, matching the "no AI tools" rule of real interviews.
- **Works in airplane mode** after the first visit. A service worker caches the app and Python. The AI engines cache the model weights the first time you load a model.
- A phone-friendly editor (CodeMirror) with a key bar for Tab, brackets, `:` and friends. Drafts and progress save automatically.

## Install on iPhone

1. Open the site in **Safari** while online, and wait for the "Ready for offline" message.
2. Tap **Share → Add to Home Screen**. Installed web apps keep their offline data; Safari may clear data for sites you haven't installed after a few weeks unused.
3. For the AI tutor: open any problem → **AI Tutor** → **Load AI tutor** once while online. On iOS 26+ this uses the GPU model (≈290 MB). The 1.5B model (≈880 MB) is smarter but needs an iPhone 15 Pro or newer. Older iOS falls back to the CPU model (≈490 MB, slower).

Then it works fully offline.

## Native iOS app

`ios/` contains a native Swift app that wraps the same web UI (all problems, offline Python) and runs the AI tutor natively:

- **Apple on-device model** (iOS 26+, Apple Intelligence devices): built in, no download.
- **Qwen2.5-Coder 1.5B** (1.1 GB) and **Ornith 1.5 9B** (5.8 GB) through llama.cpp on the GPU (Metal), downloaded in the app. Ornith 9B is much smarter but needs a lot of memory: aim for an iPhone with 12 GB of RAM (17 Pro or newer) or an M-series iPad.

How it's built:

```bash
ios/scripts/prepare.sh        # copies the web app into the bundle, fetches llama.cpp (pinned)
cd ios && xcodegen generate   # creates LocalLeet.xcodeproj (brew install xcodegen)
open LocalLeet.xcodeproj      # run on a device; the llama.cpp framework has no simulator slice
```

CI:

- **GitHub Actions** (`.github/workflows/ios.yml`) builds an unsigned `.ipa` on every push and uploads it as an artifact. You can sideload it with AltStore, SideStore or Sideloadly using a free Apple ID; free-ID installs expire after 7 days.
- **Codemagic** (`codemagic.yaml`):
  - `ios-unsigned` builds the same sideloadable `.ipa`.
  - `ios-testflight` signs the app and uploads it to TestFlight. It needs the Apple Developer Program, an App Store Connect app with bundle ID `io.github.kimeiga.localleet`, and an App Store Connect API key added to Codemagic under the name `LocalLeet`.
- For Ornith 9B, enable **Increased Memory Limit** on the App ID and set `INCREASED_MEMORY_LIMIT=true` in the TestFlight workflow.

## Hosting

It's a static site, so any static host works. **GitHub Pages:** repo **Settings → Pages → Build and deployment → Deploy from a branch → `main` / `(root)`**. The app will be at `https://<user>.github.io/localleet/`. iOS needs HTTPS for service workers, and Pages provides it.

## Development

```bash
npm install          # pulls Pyodide, CodeMirror, WebLLM, wllama, marked
npm run build        # bundles them into vendor/ and refreshes the service worker's precache list
npm run serve        # http://localhost:8080
npm run verify       # every reference solution passes its tests (uses local python3)
node scripts/e2e.mjs            # headless Chromium: all solutions pass in Pyodide + UI flow
node scripts/e2e-offline.mjs    # stops the server and checks the app still works
node scripts/e2e-offline.mjs --ai --safari   # also downloads the CPU model and asks it for a hint offline
```

`vendor/` is committed so the repo root deploys as-is. After changing any app file, run `npm run precache` (or `npm run build`) so installed copies pick up the update.

### Adding problems

Problems live in `problems/*.js`. Each one has a Markdown `prompt`, a `starter`, `tests`, `hints` and a `solution` (multi-part problems use `intro` + `parts`). A test is either
`{ call: "two_sum([2, 7], 9)", expect: "[0, 1]", cmp: "sorted" }` or `{ name, code }` with assertions. See `py/harness.py` for the comparison modes and the `ListNode`/`TreeNode` helpers. `npm run verify` checks it all.

## Notes

- Small on-device models make mistakes, and sometimes write code despite being told not to. Code blocks longer than 3 lines in tutor replies are hidden behind a spoiler. Treat the tutor like a study buddy, not an oracle, and check its claims by running the tests.
- The GPU (WebGPU) models answer in seconds. The CPU fallback is much slower: in testing, a hint took 3–4 minutes on a server CPU, so prefer a WebGPU device (iOS 26+).
- Nothing you type leaves your device. The only network requests are the app files and, when you choose, the model download from Hugging Face.
