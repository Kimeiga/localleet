// Main-thread wrapper around py-worker.js with a wall-clock time limit.
const TIME_LIMIT_MS = 15_000;

let worker = null;
let readyPromise = null;
let version = null;
let seq = 0;
const pending = new Map();
const listeners = new Set();

export function onStatus(fn) {
  listeners.add(fn);
}
function emit(status, detail) {
  for (const fn of listeners) fn(status, detail);
}

function start() {
  emit("loading");
  worker = new Worker(new URL("./py-worker.js", import.meta.url), { type: "module" });
  readyPromise = new Promise((resolve, reject) => {
    worker.onmessage = ({ data }) => {
      if (data.type === "ready") {
        version = data.version;
        emit("ready", version);
        resolve();
      } else if (data.type === "fatal") {
        emit("error", data.error);
        reject(new Error(data.error));
      } else if (data.type === "result") {
        const p = pending.get(data.id);
        if (p) {
          pending.delete(data.id);
          clearTimeout(p.timer);
          p.resolve(data.result);
        }
        if (data.fatal) restart();
      }
    };
    worker.onerror = (e) => {
      emit("error", e.message);
      reject(new Error(e.message || "Python worker failed to start"));
    };
  });
  return readyPromise;
}

export function warmUp() {
  if (!worker) start().catch(() => {});
  return readyPromise;
}

export function pythonVersion() {
  return version;
}

function restart() {
  worker?.terminate();
  worker = null;
  for (const p of pending.values()) clearTimeout(p.timer);
  pending.clear();
  start().catch(() => {});
}

async function send(payload) {
  if (!worker) start();
  await readyPromise;
  const id = ++seq;
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      pending.delete(id);
      restart();
      resolve({
        compile_error: null,
        timeout: true,
        stdout: "",
        tests: [],
        error: `Time limit exceeded (${TIME_LIMIT_MS / 1000}s). Is there an infinite loop?`,
      });
    }, TIME_LIMIT_MS);
    pending.set(id, { resolve, timer });
    worker.postMessage({ id, ...payload });
  });
}

export const runTests = (code, tests) => send({ kind: "tests", code, tests });
export const runPlain = (code) => send({ kind: "plain", code });
