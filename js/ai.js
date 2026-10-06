// On-device AI tutor. Two engines, both fully local after the first download:
//   - WebLLM (WebGPU): fast; Safari 26+ on iPhone/iPad/Mac, Chrome, Edge.
//   - wllama (llama.cpp compiled to wasm, CPU): fallback without WebGPU.
// Model weights are cached by the engines (Cache Storage / OPFS) so the tutor
// keeps working in airplane mode.

export const MODELS = [
  {
    key: "coder-0.5b",
    label: "Qwen2.5-Coder 0.5B",
    note: "Fast, works on most iPhones",
    engine: "webllm",
    size: "≈290 MB",
    webllm: { f16: "Qwen2.5-Coder-0.5B-Instruct-q4f16_1-MLC", f32: "Qwen2.5-Coder-0.5B-Instruct-q4f32_1-MLC" },
  },
  {
    key: "coder-1.5b",
    label: "Qwen2.5-Coder 1.5B",
    note: "Smarter; needs ~2 GB of GPU memory (iPhone 15 Pro or newer, M-series iPad/Mac)",
    engine: "webllm",
    size: "≈880 MB",
    webllm: { f16: "Qwen2.5-Coder-1.5B-Instruct-q4f16_1-MLC", f32: "Qwen2.5-Coder-1.5B-Instruct-q4f32_1-MLC" },
  },
  {
    key: "coder-0.5b-cpu",
    label: "Qwen2.5-Coder 0.5B (CPU)",
    note: "For devices without WebGPU (older iOS). Slower.",
    engine: "wllama",
    size: "≈490 MB",
    gguf: { repo: "Qwen/Qwen2.5-Coder-0.5B-Instruct-GGUF", file: "qwen2.5-coder-0.5b-instruct-q4_k_m.gguf" },
  },
  {
    key: "coder-1.5b-cpu",
    label: "Qwen2.5-Coder 1.5B (CPU)",
    note: "Smarter CPU model; slow on phones.",
    engine: "wllama",
    size: "≈1.1 GB",
    gguf: { repo: "Qwen/Qwen2.5-Coder-1.5B-Instruct-GGUF", file: "qwen2.5-coder-1.5b-instruct-q4_k_m.gguf" },
  },
];

const vendor = (p) => new URL(`../vendor/${p}`, import.meta.url).href;

let caps = null;
export async function capabilities() {
  if (caps) return caps;
  caps = { webgpu: false, f16: false };
  try {
    if (navigator.gpu) {
      const adapter = await navigator.gpu.requestAdapter();
      if (adapter) {
        caps.webgpu = true;
        caps.f16 = adapter.features.has("shader-f16");
      }
    }
  } catch {
    /* no WebGPU */
  }
  return caps;
}

export async function recommendedModel() {
  return (await capabilities()).webgpu ? "coder-0.5b" : "coder-0.5b-cpu";
}

const state = { status: "idle", modelKey: null, progress: 0, text: "" };
const subs = new Set();
export function onState(fn) {
  subs.add(fn);
  fn({ ...state });
  return () => subs.delete(fn);
}
function set(patch) {
  Object.assign(state, patch);
  for (const fn of subs) fn({ ...state });
}
export const getState = () => ({ ...state });

let webllm = null; // module
let engine = null; // WebLLM engine
let llmWorker = null;
let wllama = null; // Wllama instance
let webllmModelId = null;

async function webllmModule() {
  webllm ??= await import("../vendor/web-llm.js");
  return webllm;
}

async function newWllama() {
  const { Wllama } = await import("../vendor/wllama/wllama.js");
  const w = new Wllama({ default: vendor("wllama/wllama.wasm") }, { suppressNativeLog: true });
  w.setCompat({ worker: vendor("wllama/compat/wllama.js"), wasm: vendor("wllama/compat/wllama.wasm") });
  return w;
}

async function webllmId(model) {
  const { f16 } = await capabilities();
  return f16 ? model.webllm.f16 : model.webllm.f32;
}

export async function unload() {
  try {
    await engine?.unload();
  } catch {}
  llmWorker?.terminate();
  try {
    await wllama?.exit();
  } catch {}
  engine = llmWorker = wllama = webllmModelId = null;
  set({ status: "idle", modelKey: null, progress: 0, text: "" });
}

export async function load(key) {
  const model = MODELS.find((m) => m.key === key);
  if (!model) throw new Error(`unknown model ${key}`);
  if (state.status === "ready" && state.modelKey === key) return;
  await unload();
  set({ status: "loading", modelKey: key, progress: 0, text: "Starting…" });
  try {
    if (model.engine === "webllm") {
      if (!(await capabilities()).webgpu) throw new Error("WebGPU isn't available in this browser. Pick a CPU model instead.");
      const { CreateWebWorkerMLCEngine, CreateMLCEngine } = await webllmModule();
      webllmModelId = await webllmId(model);
      const initProgressCallback = (r) => set({ progress: r.progress ?? 0, text: r.text ?? "" });
      try {
        llmWorker = new Worker(new URL("./llm-worker.js", import.meta.url), { type: "module" });
        engine = await CreateWebWorkerMLCEngine(llmWorker, webllmModelId, { initProgressCallback });
      } catch (e) {
        // Some browsers expose WebGPU to pages but not to workers: run on the page instead.
        if (/memory|OOM|allocate/i.test(String(e?.message || e))) throw e;
        console.warn("WebLLM worker failed, retrying on main thread", e);
        llmWorker?.terminate();
        llmWorker = null;
        engine = await CreateMLCEngine(webllmModelId, { initProgressCallback });
      }
    } else {
      wllama = await newWllama();
      // loadModelFromHF always queries the Hugging Face API (fails offline);
      // loadModelFromUrl checks the local cache first.
      const url = `https://huggingface.co/${model.gguf.repo}/resolve/main/${model.gguf.file}`;
      await wllama.loadModelFromUrl(url, {
        n_ctx: 4096,
        progressCallback: ({ loaded, total }) =>
          set({ progress: total ? loaded / total : 0, text: `Downloading ${fmtMB(loaded)} / ${fmtMB(total)}` }),
      });
    }
    set({ status: "ready", progress: 1, text: "" });
  } catch (e) {
    console.error(e);
    await unload().catch(() => {});
    set({ status: "error", modelKey: key, text: friendlyError(e) });
    throw e;
  }
}

function friendlyError(e) {
  const msg = String(e?.message || e);
  if (/fetch|network|Failed to load|NetworkError/i.test(msg) && !navigator.onLine) {
    return "You're offline and this model isn't downloaded yet. Connect once to download it.";
  }
  if (/memory|OOM|allocate|device lost|lost/i.test(msg)) {
    return "Ran out of memory. Try the 0.5B model, or close other tabs/apps.";
  }
  return msg;
}

const fmtMB = (b) => `${Math.round((b || 0) / 1e6)} MB`;

let abort = null;

/** Stream a chat completion. messages: [{role, content}]. Returns full text. */
export async function chat(messages, { onToken, maxTokens = 320, temperature = 0.3 } = {}) {
  if (state.status !== "ready") throw new Error("Model not loaded");
  let text = "";
  if (engine) {
    const stream = await engine.chat.completions.create({
      messages,
      stream: true,
      temperature,
      max_tokens: maxTokens,
    });
    abort = () => engine.interruptGenerate();
    for await (const chunk of stream) {
      const t = chunk.choices?.[0]?.delta?.content || "";
      if (t) {
        text += t;
        onToken?.(text);
      }
    }
  } else {
    const ctrl = new AbortController();
    abort = () => ctrl.abort();
    try {
      const stream = await wllama.createChatCompletion({
        messages,
        stream: true,
        temperature,
        max_tokens: maxTokens,
        abortSignal: ctrl.signal,
      });
      for await (const chunk of stream) {
        const t = chunk.choices?.[0]?.delta?.content || "";
        if (t) {
          text += t;
          onToken?.(text);
        }
      }
    } catch (e) {
      if (!ctrl.signal.aborted) throw e;
    }
  }
  abort = null;
  return text;
}

export function stop() {
  abort?.();
}

export async function isCached(key) {
  const model = MODELS.find((m) => m.key === key);
  try {
    if (model.engine === "webllm") {
      const { hasModelInCache } = await webllmModule();
      return await hasModelInCache(await webllmId(model));
    }
    const w = wllama || (await newWllama());
    const entries = await w.cacheManager.list();
    return entries.some((e) => e.name.endsWith(model.gguf.file));
  } catch {
    return false;
  }
}

export async function deleteCached(key) {
  const model = MODELS.find((m) => m.key === key);
  if (state.modelKey === key) await unload();
  if (model.engine === "webllm") {
    const { deleteModelAllInfoInCache } = await webllmModule();
    await deleteModelAllInfoInCache(await webllmId(model));
  } else {
    const w = await newWllama();
    for (const e of await w.cacheManager.list()) {
      if (e.name.endsWith(model.gguf.file)) await w.cacheManager.delete(e.name);
    }
  }
}

// ------------------------------------------------------------ prompts

const clip = (s, n) => (s && s.length > n ? s.slice(0, n) + "\n…(truncated)" : s || "");

const TUTOR = `You are a friendly, concise Python coding-interview tutor running offline on the student's phone.
Rules:
- NEVER write the solution or any code longer than 2 lines. Do not output code blocks. The student must write the code themselves.
- Give ONE focused hint or observation at a time, at most 4 short sentences.
- Prefer guiding questions ("What happens when the list is empty?") and naming techniques (hash map, two pointers, BFS, heap...).
- Tiny generic Python syntax examples (1-3 lines) are fine when the student is stuck on syntax.
- If the student's code has a bug, point to the line or idea that's wrong and why, not the corrected code.
- Mention time/space complexity when relevant, using Big-O.`;

const INTERVIEWER = `You are a software engineer conducting a 45-minute Python technical interview, running offline on the candidate's phone.
Stay in character as the interviewer:
- Ask one question at a time: clarifying questions, edge cases, complexity, trade-offs, how they'd test it, what they'd do with more time.
- React briefly to the candidate's answers and push one level deeper.
- Do not give the solution. If they're stuck, give a small nudge like a real interviewer would.
- Keep each message under 4 sentences.`;

// CPU models spend most of their time reading the prompt, so they get a
// shorter one.
export const isCompact = () => MODELS.find((m) => m.key === state.modelKey)?.engine === "wllama";

export function buildMessages({ mode, problem, partIndex, code, results, history, userText }) {
  const k = isCompact() ? 0.55 : 1;
  const part = problem.parts?.[partIndex];
  const statement = problem.parts
    ? `${problem.intro}\n\nCurrent part: ${part.title}\n${part.prompt}`
    : problem.prompt;
  const failing = (results?.tests || [])
    .filter((t) => !t.pass)
    .slice(0, 2)
    .map((t) => `- ${t.name}${t.expected ? `: expected ${t.expected}, got ${t.actual}` : ""}${t.error ? `\n  ${t.error}` : ""}`)
    .join("\n");
  const status = results
    ? results.compile_error
      ? `Their code fails to run:\n${clip(results.compile_error, 500)}`
      : `Test results: ${results.tests.filter((t) => t.pass).length}/${results.tests.length} passing.${failing ? `\nFailing:\n${clip(failing, 700)}` : ""}`
    : "They haven't run the tests yet.";

  const context = `Problem: ${problem.title}\n${clip(statement, 1800 * k)}\n\nStudent's current code:\n\`\`\`python\n${clip(code, 2400 * k)}\n\`\`\`\n${status}`;
  const msgs = [{ role: "system", content: `${mode === "interviewer" ? INTERVIEWER : TUTOR}\n\n${context}` }];
  let budget = 1600 * k;
  const recent = [];
  for (let i = history.length - 1; i >= 0 && budget > 0; i--) {
    const m = history[i];
    budget -= m.content.length;
    recent.unshift({ role: m.role, content: clip(m.content, 800) });
  }
  msgs.push(...recent, { role: "user", content: userText });
  return msgs;
}

export const QUICK_PROMPTS = {
  hint: "Give me one small hint for my next step. Don't give away the solution.",
  bug: "My tests are failing. What's the most likely bug in my code? Point me to it without rewriting the code.",
  complexity: "What's the time and space complexity of my current code, and can it be improved?",
  approach: "Before I code: what questions should I ask, and what approaches should I consider?",
  interview: "Start the mock interview. Ask me your first question about this problem.",
};
