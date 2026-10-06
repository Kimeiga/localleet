import { problems, flattenTests } from "../problems/index.js";
import { marked } from "../vendor/marked.js";
import { createEditor, renderKeyBar } from "./editor.js";
import * as runner from "./runner.js";
import * as ai from "./ai.js";
import * as store from "./store.js";

// ------------------------------------------------------------------ utils
const $ = (sel, root = document) => root.querySelector(sel);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

marked.use({
  renderer: {
    html: (t) => esc(typeof t === "string" ? t : t.text),
    link(t) {
      const href = typeof t === "string" ? t : t.href;
      const text = typeof t === "string" ? arguments[2] : t.text;
      return /^https?:/i.test(href) ? `<a href="${esc(href)}" target="_blank" rel="noopener">${esc(text)}</a>` : esc(text);
    },
  },
});
const md = (s) => marked.parse(s || "");

let toastTimer;
function toast(msg, ms = 2600) {
  const el = $("#toast");
  el.textContent = msg;
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (el.hidden = true), ms);
}

const byId = new Map(problems.map((p) => [p.id, p]));
const TOPIC_NOTES = {
  "Chalk-style (multi-part)":
    "Long problems with parts that unlock one at a time, like a real 45-minute round. Themes: features, resolvers, point-in-time data, parsing, grids.",
  Playground: "Run any Python you like.",
};

// ------------------------------------------------------------------ settings & progress
const settings = Object.assign(
  { model: null, autoLoad: false, fontPx: 14, interviewDate: "", interviewLen: 45 },
  store.load("settings", {}),
);
const saveSettings = () => store.save("settings", settings);
const progress = store.load("progress", {}); // id -> { solved, parts: [bool], tried, unlocked }
const saveProgress = () => store.save("progress", progress);
const prog = (id) => (progress[id] ??= { solved: false, tried: false, parts: [], unlocked: 0 });

// ------------------------------------------------------------------ python status
runner.onStatus((status, detail) => {
  const pill = $("#py-pill");
  pill.className = "pill" + (status === "ready" ? " ok" : status === "error" ? " warn" : "");
  pill.textContent = status === "ready" ? `Python ${detail}` : status === "error" ? "Python failed" : "Python…";
  if (status === "error") pill.title = detail;
});

function updateNet() {
  $("#net-pill").hidden = navigator.onLine;
}
addEventListener("online", updateNet);
addEventListener("offline", updateNet);

// ------------------------------------------------------------------ home
function renderHome() {
  const q = $("#search").value.trim().toLowerCase();
  const diff = $("#diff-filter").value;
  const hideSolved = $("#hide-solved").checked;
  const groups = new Map();
  for (const p of problems) {
    const pr = progress[p.id];
    if (diff && p.difficulty !== diff && !p.playground) continue;
    if (hideSolved && pr?.solved) continue;
    if (q && !`${p.title} ${p.topic} ${(p.tags || []).join(" ")}`.toLowerCase().includes(q)) continue;
    if (!groups.has(p.topic)) groups.set(p.topic, []);
    groups.get(p.topic).push(p);
  }
  const list = $("#problem-list");
  list.innerHTML = "";
  if (!groups.size) list.innerHTML = `<p class="muted">No problems match.</p>`;
  for (const [topic, ps] of groups) {
    const solved = ps.filter((p) => progress[p.id]?.solved).length;
    const sec = document.createElement("section");
    sec.className = "topic";
    sec.innerHTML = `
      <h2>${esc(topic)} ${topic === "Playground" ? "" : `<small>${solved}/${ps.length}</small>`}</h2>
      ${TOPIC_NOTES[topic] ? `<p class="desc">${esc(TOPIC_NOTES[topic])}</p>` : ""}
      <ul class="plist">${ps
        .map((p) => {
          const pr = progress[p.id];
          const dot = pr?.solved ? "solved" : pr?.tried ? "tried" : "";
          const meta = p.parts ? `${p.parts.length} parts · ${pr?.parts?.filter(Boolean).length || 0} done` : (p.tags || []).slice(0, 3).join(" · ");
          return `<li><button class="prow" data-id="${p.id}">
            <span class="status-dot ${dot}">${pr?.solved ? "✓" : ""}</span>
            <span class="title">${esc(p.title)}<br><span class="meta">${esc(meta)}</span></span>
            ${p.playground ? "" : `<span class="diff ${p.difficulty}">${p.difficulty}</span>`}
          </button></li>`;
        })
        .join("")}</ul>`;
    list.appendChild(sec);
  }
  const real = problems.filter((p) => !p.playground);
  $("#stat-solved").textContent = real.filter((p) => progress[p.id]?.solved).length;
  $("#stat-total").textContent = real.length;
  renderCountdown();
}

function renderCountdown() {
  const t = settings.interviewDate ? new Date(settings.interviewDate).getTime() : NaN;
  const show = !Number.isNaN(t) && t > Date.now();
  $("#countdown-stat").hidden = !show;
  if (!show) return;
  const mins = Math.floor((t - Date.now()) / 60000);
  const d = Math.floor(mins / 1440), h = Math.floor((mins % 1440) / 60);
  $("#stat-countdown").textContent = d > 0 ? `${d}d ${h}h` : `${h}h ${mins % 60}m`;
}

$("#problem-list").addEventListener("click", (e) => {
  const row = e.target.closest(".prow");
  if (row) location.hash = `#/p/${row.dataset.id}`;
});
for (const id of ["search", "diff-filter", "hide-solved"]) $(`#${id}`).addEventListener("input", renderHome);

// ------------------------------------------------------------------ problem view state
let cur = null; // current problem
let editor = null;
let lastResults = new Map(); // id -> results
const chats = new Map(); // id -> [{role, content}]
let tutorMode = "tutor";
let interview = store.load("interview", null); // { id, start, lenMin }
let timerHandle = null;
let running = false;

function setTab(tab) {
  $("#pv").dataset.tab = tab;
  for (const b of $("#tabs").children) b.classList.toggle("active", b.dataset.tab === tab);
  if (tab === "code") editor?.view.requestMeasure();
  if (tab === "tutor") onTutorOpen();
}
$("#tabs").addEventListener("click", (e) => {
  const b = e.target.closest("button[data-tab]");
  if (b) setTab(b.dataset.tab);
});

const isWide = () => matchMedia("(min-width: 900px)").matches;

function openProblem(id) {
  const p = byId.get(id);
  if (!p) return (location.hash = "#/");
  cur = p;
  runner.warmUp();
  $("#home").hidden = true;
  $("#problem").hidden = false;
  $("#back-btn").hidden = false;
  $("#top-title").textContent = p.title;
  document.title = `${p.title} · LocalLeet`;

  editor?.destroy();
  const code = store.load(`code:${p.id}`, p.starter);
  editor = createEditor($("#editor"), {
    doc: code,
    fontPx: settings.fontPx,
    onChange: debounce((v) => store.save(`code:${p.id}`, v), 400),
  });
  renderKeyBar($("#keybar"), () => editor?.view);

  $("#run-btn").textContent = p.playground ? "▶ Run" : "▶ Run tests";
  $("#interview-btn").hidden = !!p.playground;
  renderProblemPane();
  renderPartSelect();
  renderResults(lastResults.get(p.id));
  renderChat();
  updateInterviewUI();
  setTab(isWide() ? "problem" : p.playground ? "code" : "problem");
}

function closeProblem() {
  cur = null;
  editor?.destroy();
  editor = null;
  $("#problem").hidden = true;
  $("#home").hidden = false;
  $("#back-btn").hidden = true;
  $("#top-title").textContent = "LocalLeet";
  document.title = "LocalLeet";
  renderHome();
}

$("#back-btn").addEventListener("click", () => (location.hash = "#/"));
$("#brand").addEventListener("click", () => (location.hash = "#/"));

function route() {
  const m = location.hash.match(/^#\/p\/([\w-]+)/);
  if (m) openProblem(m[1]);
  else closeProblem();
}
addEventListener("hashchange", route);

// ------------------------------------------------------------------ problem pane
const inInterview = () => interview && cur && interview.id === cur.id;

function renderProblemPane() {
  const p = cur;
  const pr = prog(p.id);
  const pane = $("#pane-problem");
  const hidden = inInterview();
  let html = `<h1>${esc(p.title)}</h1>
    <div class="ptags">
      ${p.playground ? "" : `<span class="diff ${p.difficulty}">${p.difficulty}</span>`}
      <span class="tag">${esc(p.topic)}</span>
      ${(p.tags || []).map((t) => `<span class="tag">${esc(t)}</span>`).join("")}
    </div>`;

  if (p.parts) {
    html += `<div class="md">${md(p.intro)}</div>`;
    p.parts.forEach((part, i) => {
      const done = pr.parts[i];
      const locked = i > pr.unlocked;
      html += `<details class="part ${locked ? "locked" : ""}" ${i === pr.unlocked && !locked ? "open" : ""} data-part="${i}">
        <summary><span class="status-dot ${done ? "solved" : ""}">${done ? "✓" : ""}</span>${esc(part.title)}${locked ? " 🔒" : ""}</summary>
        ${locked
          ? `<div class="part-lock">Pass the earlier parts to unlock, as in a real interview. <button class="btn small ghost" data-unlock="${i}">Show anyway</button></div>`
          : `<div class="part-body"><div class="md">${md(part.prompt)}</div>${hidden ? "" : hintsHTML(part.hints, `${p.id}:${i}`)}</div>`}
      </details>`;
    });
  } else {
    html += `<div class="md">${md(p.prompt)}</div>`;
    if (!hidden && p.hints) html += hintsHTML(p.hints, p.id);
  }

  if (!p.playground) {
    if (hidden) {
      html += `<p class="muted small">Hints and the reference solution are hidden during interview mode.</p>`;
    } else if (p.solution) {
      html += `<details class="reveal"><summary>Reference solution &amp; explanation</summary>
        ${p.explanation ? `<div class="section-title">Key idea</div><div class="md">${md(p.explanation)}</div>` : ""}
        ${p.complexity ? `<div class="section-title">Complexity</div><p class="small">${esc(p.complexity)}</p>` : ""}
        <div class="section-title">Solution</div><div class="md"><pre><code>${esc(p.solution)}</code></pre></div>
      </details>`;
    }
  }
  pane.innerHTML = html;
}

const hintState = new Map(); // key -> number of hints shown
function hintsHTML(hints, key) {
  if (!hints?.length) return "";
  const n = hintState.get(key) || 0;
  return `<div class="hints">
    ${hints.slice(0, n).map((h, i) => `<div class="hint"><b>Hint ${i + 1}.</b> ${md(h).replace(/^<p>|<\/p>\s*$/g, "")}</div>`).join("")}
    ${n < hints.length ? `<button class="btn small ghost" data-hint="${esc(key)}">💡 Show hint ${n + 1} of ${hints.length}</button>` : ""}
  </div>`;
}

$("#pane-problem").addEventListener("click", (e) => {
  const h = e.target.closest("[data-hint]");
  if (h) {
    const key = h.dataset.hint;
    hintState.set(key, (hintState.get(key) || 0) + 1);
    renderProblemPane();
    return;
  }
  const u = e.target.closest("[data-unlock]");
  if (u) {
    prog(cur.id).unlocked = Math.max(prog(cur.id).unlocked, Number(u.dataset.unlock));
    saveProgress();
    renderProblemPane();
    renderPartSelect();
  }
});

function renderPartSelect() {
  const sel = $("#part-select");
  if (!cur.parts) {
    sel.hidden = true;
    return;
  }
  const pr = prog(cur.id);
  sel.hidden = false;
  sel.innerHTML = cur.parts
    .map((_, i) => `<option value="${i}" ${i > pr.unlocked ? "disabled" : ""}>${i === 0 ? "Part 1" : `Parts 1–${i + 1}`}</option>`)
    .join("") + `<option value="all">All parts</option>`;
  sel.value = String(Math.min(pr.unlocked, cur.parts.length - 1));
}

// ------------------------------------------------------------------ running
$("#run-btn").addEventListener("click", runCode);
document.addEventListener("keydown", (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && cur) {
    e.preventDefault();
    runCode();
  }
});

async function runCode() {
  if (!cur || running) return;
  running = true;
  const btn = $("#run-btn");
  btn.disabled = true;
  btn.textContent = "Running…";
  $("#results").innerHTML = `<p class="muted">${runner.pythonVersion() ? "Running…" : "Starting Python (first run takes a few seconds)…"}</p>`;
  if (!isWide()) setTab("results");
  try {
    const code = editor.value;
    store.save(`code:${cur.id}`, code);
    let res;
    if (cur.playground) {
      res = await runner.runPlain(code);
      res.playground = true;
    } else {
      let tests = flattenTests(cur);
      const sel = $("#part-select").value;
      if (cur.parts && sel !== "all") tests = tests.filter((t) => t.part <= Number(sel));
      res = await runner.runTests(code, tests);
      res.ranParts = cur.parts ? (sel === "all" ? cur.parts.length - 1 : Number(sel)) : null;
      recordProgress(res);
    }
    lastResults.set(cur.id, res);
    renderResults(res);
  } catch (e) {
    renderResults({ compile_error: String(e), tests: [], stdout: "" });
  } finally {
    running = false;
    btn.disabled = false;
    btn.textContent = cur?.playground ? "▶ Run" : "▶ Run tests";
  }
}

function recordProgress(res) {
  const pr = prog(cur.id);
  pr.tried = true;
  if (!res.compile_error && !res.timeout) {
    if (cur.parts) {
      const before = pr.unlocked;
      cur.parts.forEach((_, i) => {
        const ts = res.tests.filter((t) => t.part === i);
        if (ts.length && ts.every((t) => t.pass)) pr.parts[i] = true;
      });
      while (pr.parts[pr.unlocked] && pr.unlocked < cur.parts.length - 1) pr.unlocked++;
      pr.solved = cur.parts.every((_, i) => pr.parts[i]);
      if (pr.unlocked > before) {
        toast(`Part ${before + 1} done! ${cur.parts[pr.unlocked].title.split("—")[0].trim()} unlocked.`);
        renderProblemPane();
        renderPartSelect();
      } else if (pr.solved && res.tests.every((t) => t.pass)) {
        toast("All parts solved. 🎉");
        renderProblemPane();
      }
    } else if (res.tests.length && res.tests.every((t) => t.pass)) {
      if (!pr.solved) toast("Accepted! 🎉 Now say the complexity out loud.");
      pr.solved = true;
    }
  }
  saveProgress();
}

function renderResults(res) {
  const box = $("#results");
  const badge = $("#results-badge");
  badge.hidden = true;
  if (!res) {
    box.innerHTML = `<p class="muted">Run your code to see ${cur?.playground ? "its output" : "test results"} here. <span class="small">(⌘/Ctrl + Enter)</span></p>`;
    return;
  }
  if (res.timeout) {
    box.innerHTML = `<div class="summary bad"><span class="big">⏱ Time limit exceeded</span></div><pre class="out err">${esc(res.error)}</pre>
      <p class="muted small">Python was restarted. Look for a loop whose condition never changes, or recursion with no base case.</p>`;
    badge.hidden = false;
    badge.className = "badge bad";
    badge.textContent = "!";
    return;
  }
  if (res.playground) {
    box.innerHTML = `${res.stdout ? `<div class="section-title">Output</div><pre class="out">${esc(res.stdout)}</pre>` : `<p class="muted">No output. Use print().</p>`}
      ${res.error ? `<div class="section-title">Error</div><pre class="out err">${esc(res.error)}</pre>` : ""}`;
    return;
  }
  if (res.compile_error) {
    box.innerHTML = `<div class="summary bad"><span class="big">Your code didn't run</span></div>
      ${res.stdout ? `<pre class="out">${esc(res.stdout)}</pre>` : ""}<pre class="out err">${esc(res.compile_error)}</pre>`;
    badge.hidden = false;
    badge.className = "badge bad";
    badge.textContent = "!";
    return;
  }
  const passed = res.tests.filter((t) => t.pass).length;
  const all = passed === res.tests.length;
  badge.hidden = false;
  badge.className = `badge ${all ? "ok" : "bad"}`;
  badge.textContent = `${passed}/${res.tests.length}`;

  let html = `<div class="summary ${all ? "ok" : "bad"}"><span class="big">${all ? "✓ All tests passed" : `${passed} / ${res.tests.length} tests passed`}</span>`;
  if (cur.parts) {
    html += cur.parts
      .map((_, i) => {
        const ts = res.tests.filter((t) => t.part === i);
        return ts.length ? `<span class="tag">P${i + 1}: ${ts.filter((t) => t.pass).length}/${ts.length}</span>` : "";
      })
      .join("");
  }
  html += `</div>`;
  if (res.stdout) html += `<div class="section-title">Output while loading your code</div><pre class="out">${esc(res.stdout)}</pre>`;
  let lastPart = -1;
  let firstFail = true;
  for (const t of res.tests) {
    if (cur.parts && t.part !== lastPart) {
      lastPart = t.part;
      html += `<div class="part-head">${esc(cur.parts[t.part].title)}</div>`;
    }
    const open = !t.pass && firstFail;
    if (!t.pass) firstFail = false;
    html += `<details class="test" ${open ? "open" : ""}>
      <summary><span class="mark ${t.pass ? "ok" : "bad"}">${t.pass ? "✓" : "✗"}</span><span class="tname">${esc(t.name)}</span>${t.ms != null ? `<span class="ms">${t.ms} ms</span>` : ""}</summary>
      <div class="kv">
        ${t.input && t.input !== t.name ? `<div><label>Input</label><pre>${esc(t.input)}</pre></div>` : ""}
        ${t.expected != null ? `<div><label>Expected</label><pre>${esc(t.expected)}</pre></div>` : ""}
        ${t.actual != null ? `<div><label>Your output</label><pre>${esc(t.actual)}</pre></div>` : ""}
        ${t.stdout ? `<div><label>Printed</label><pre>${esc(t.stdout)}</pre></div>` : ""}
        ${t.error ? `<div><label>Error</label><pre class="err">${esc(t.error)}</pre></div>` : ""}
      </div>
    </details>`;
  }
  box.innerHTML = html;
}

$("#reset-btn").addEventListener("click", () => {
  if (!cur || !confirm("Replace your code with the starter code?")) return;
  editor.value = cur.starter;
  store.save(`code:${cur.id}`, cur.starter);
});

// ------------------------------------------------------------------ interview mode
$("#interview-btn").addEventListener("click", () => {
  if (inInterview()) return endInterview();
  if (interview && !confirm("End your other interview session and start one here?")) return;
  if (!confirm(`Start a ${settings.interviewLen}-minute interview?\n\nThe AI tutor, hints and solution are hidden until you end it, just like the real thing. Talk through your approach out loud.`)) return;
  interview = { id: cur.id, start: Date.now(), lenMin: settings.interviewLen };
  store.save("interview", interview);
  updateInterviewUI();
  renderProblemPane();
  toast("Interview started. Good luck!");
});

function endInterview() {
  const used = Math.round((Date.now() - interview.start) / 60000);
  const p = byId.get(interview.id);
  const pr = progress[interview.id];
  const parts = p?.parts ? `${pr?.parts?.filter(Boolean).length || 0}/${p.parts.length} parts` : pr?.solved ? "solved" : "not solved yet";
  interview = null;
  store.remove("interview");
  updateInterviewUI();
  if (cur) renderProblemPane();
  toast(`Interview ended after ${used} min: ${parts}.`, 4500);
}

function updateInterviewUI() {
  const on = inInterview();
  $("#interview-btn").innerHTML = on ? "■ End interview" : `⏱ Interview<span class="wide-only"> mode</span>`;
  $("#ai-locked").hidden = !on;
  clearInterval(timerHandle);
  const timer = $("#timer");
  if (!interview || !cur || interview.id !== cur.id) {
    timer.hidden = true;
    return;
  }
  const tick = () => {
    const left = interview.start + interview.lenMin * 60000 - Date.now();
    const s = Math.abs(Math.round(left / 1000));
    timer.textContent = `${left < 0 ? "+" : ""}${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
    timer.classList.toggle("over", left < 0);
    if (left < 0 && !interview.warned) {
      interview.warned = true;
      toast("Time's up! In the real interview you'd wrap up and discuss next steps.", 5000);
    }
  };
  timer.hidden = false;
  tick();
  timerHandle = setInterval(tick, 1000);
}

// ------------------------------------------------------------------ AI tutor
let aiState = ai.getState();
let generating = false;
ai.onState((s) => {
  aiState = s;
  renderModelStatus();
  renderModelList();
});

function modelLabel(key) {
  return ai.MODELS.find((m) => m.key === key)?.label || key;
}

async function chosenModel() {
  settings.model ??= await ai.recommendedModel();
  return settings.model;
}

function renderModelStatus() {
  const el = $("#model-status");
  if (!el) return;
  const s = aiState;
  const busy = s.status === "loading";
  let html;
  if (s.status === "ready") {
    html = `<span class="pill ok">● ${esc(modelLabel(s.modelKey))}</span>`;
  } else if (busy) {
    html = `<span>Loading ${esc(modelLabel(s.modelKey))}</span><span class="progress"><i style="width:${Math.round(s.progress * 100)}%"></i></span><span class="muted">${Math.round(s.progress * 100)}%</span>`;
  } else {
    html = `<button class="btn small primary" id="load-model">Load AI tutor</button>
      <span class="muted">${s.status === "error" ? `<span style="color:var(--bad)">${esc(s.text)}</span>` : esc(settings.model ? modelLabel(settings.model) : "Runs on your device")}</span>
      <button class="btn small ghost" id="pick-model">Models…</button>`;
  }
  el.innerHTML = html;
  const ready = s.status === "ready";
  for (const b of $("#quick-chips").children) b.disabled = !ready || generating;
  $("#chat-send").disabled = !ready && !generating;
}

$("#model-status").addEventListener("click", async (e) => {
  if (e.target.id === "load-model") loadModel(await chosenModel());
  if (e.target.id === "pick-model") openSettings();
});

async function loadModel(key) {
  settings.model = key;
  saveSettings();
  try {
    await ai.load(key);
    toast(`${modelLabel(key)} is ready. It works offline now.`);
  } catch {
    /* status shows the error */
  }
}

function onTutorOpen() {
  if (settings.autoLoad && aiState.status === "idle" && !inInterview()) chosenModel().then(loadModel);
  renderModelStatus();
}

$("#tutor-mode").addEventListener("click", (e) => {
  const b = e.target.closest("button[data-mode]");
  if (!b) return;
  tutorMode = b.dataset.mode;
  for (const x of $("#tutor-mode").children) x.classList.toggle("active", x === b);
  $("#chat-input").placeholder = tutorMode === "interviewer" ? "Answer the interviewer…" : "Ask the tutor…";
  if (tutorMode === "interviewer" && aiState.status === "ready" && !generating) ask(ai.QUICK_PROMPTS.interview, { hidden: true });
});

$("#quick-chips").addEventListener("click", (e) => {
  const b = e.target.closest("button[data-q]");
  if (b) ask(ai.QUICK_PROMPTS[b.dataset.q]);
});

$("#chat-form").addEventListener("submit", (e) => {
  e.preventDefault();
  if (generating) return ai.stop();
  const input = $("#chat-input");
  const text = input.value.trim();
  if (!text) return;
  input.value = "";
  autoGrow(input);
  ask(text);
});
$("#chat-input").addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey && !e.isComposing && matchMedia("(hover: hover)").matches) {
    e.preventDefault();
    $("#chat-form").requestSubmit();
  }
});
const autoGrow = (el) => {
  el.style.height = "auto";
  el.style.height = Math.min(el.scrollHeight, 140) + "px";
};
$("#chat-input").addEventListener("input", (e) => autoGrow(e.target));

function renderChat() {
  const box = $("#chat");
  const hist = chats.get(cur.id) || [];
  if (!hist.length) {
    box.innerHTML = `<div class="msg note">Ask for a hint, paste an error, or switch to <b>Mock interviewer</b> to practice explaining your approach.<br>The tutor sees the problem, your code and your latest test results. It's told not to hand you the solution.</div>`;
    return;
  }
  box.innerHTML = hist
    .filter((m) => !m.hidden)
    .map((m) => (m.role === "user" ? `<div class="msg user">${esc(m.content)}</div>` : `<div class="msg assistant"><div class="md">${md(m.content)}</div></div>`))
    .join("");
  box.scrollTop = box.scrollHeight;
}

async function ask(text, { hidden = false } = {}) {
  if (!cur || generating || inInterview()) return;
  if (aiState.status !== "ready") {
    toast("Load the AI tutor first.");
    return;
  }
  const hist = chats.get(cur.id) || [];
  chats.set(cur.id, hist);
  const messages = ai.buildMessages({
    mode: tutorMode,
    problem: cur,
    partIndex: Math.min(prog(cur.id).unlocked, (cur.parts?.length || 1) - 1),
    code: editor.value,
    results: lastResults.get(cur.id),
    history: hist.filter((m) => m.content),
    userText: text,
  });
  hist.push({ role: "user", content: text, hidden });
  const reply = { role: "assistant", content: "" };
  hist.push(reply);
  renderChat();
  const bubble = $("#chat").lastElementChild.querySelector(".md");
  bubble.innerHTML = `<span class="muted">Thinking…</span>`;
  generating = true;
  $("#chat-send").textContent = "Stop";
  renderModelStatus();
  let raf = 0;
  try {
    await ai.chat(messages, {
      onToken: (full) => {
        reply.content = full;
        if (!raf) {
          raf = requestAnimationFrame(() => {
            raf = 0;
            bubble.innerHTML = md(reply.content);
            $("#chat").scrollTop = $("#chat").scrollHeight;
          });
        }
      },
    });
  } catch (e) {
    reply.content = `⚠️ ${e.message || e}`;
  } finally {
    generating = false;
    $("#chat-send").textContent = "Send";
    if (!reply.content) reply.content = "_(no response)_";
    renderChat();
    renderModelStatus();
  }
}

// ------------------------------------------------------------------ settings
async function renderModelList() {
  const list = $("#model-list");
  if (!$("#settings").open) return;
  const caps = await ai.capabilities();
  const rec = await ai.recommendedModel();
  const cached = await Promise.all(ai.MODELS.map((m) => ai.isCached(m.key)));
  list.innerHTML = ai.MODELS.map((m, i) => {
    const unsupported = m.engine === "webllm" && !caps.webgpu;
    const isCur = aiState.modelKey === m.key;
    const loaded = isCur && aiState.status === "ready";
    const loading = isCur && aiState.status === "loading";
    return `<div class="model ${settings.model === m.key ? "current" : ""}">
      <div class="name">${esc(m.label)} ${m.key === rec ? `<span class="tag">recommended</span>` : ""}</div>
      <div class="info">${esc(m.note)} · ${m.size}${cached[i] ? " · <b>downloaded ✓</b>" : ""}${unsupported ? " · needs WebGPU" : ""}</div>
      <div class="actions">
        ${loaded ? `<span class="pill ok">loaded</span>` : loading ? `<span class="pill">${Math.round(aiState.progress * 100)}%</span>`
          : `<button class="btn small ${cached[i] ? "" : "primary"}" data-load="${m.key}" ${unsupported || aiState.status === "loading" ? "disabled" : ""}>${cached[i] ? "Load" : "Download"}</button>`}
        ${cached[i] && !loading ? `<button class="btn small ghost" data-del="${m.key}" title="Delete download">🗑</button>` : ""}
      </div>
    </div>`;
  }).join("");
  $("#gpu-info").textContent = caps.webgpu
    ? `WebGPU available${caps.f16 ? " (fp16)" : ""}: models run on your GPU.`
    : "WebGPU isn't available here (it needs iOS 26+ / Safari 26+, or recent Chrome). The CPU models still work, just slower.";
}

$("#model-list").addEventListener("click", async (e) => {
  const l = e.target.closest("[data-load]");
  const d = e.target.closest("[data-del]");
  if (l) loadModel(l.dataset.load).then(renderModelList);
  if (d && confirm("Delete this model's download from this device?")) {
    await ai.deleteCached(d.dataset.del);
    renderModelList();
    toast("Deleted.");
  }
});

function openSettings() {
  $("#auto-load").checked = settings.autoLoad;
  $("#font-size").value = settings.fontPx;
  $("#interview-date").value = settings.interviewDate || "";
  $("#interview-len").value = settings.interviewLen;
  $("#settings").showModal();
  renderModelList();
  renderOfflineInfo();
}
$("#settings-btn").addEventListener("click", openSettings);
$("#auto-load").addEventListener("change", (e) => {
  settings.autoLoad = e.target.checked;
  saveSettings();
});
$("#font-size").addEventListener("input", (e) => {
  settings.fontPx = Number(e.target.value);
  saveSettings();
  editor?.setFontSize(settings.fontPx);
});
$("#interview-date").addEventListener("change", (e) => {
  settings.interviewDate = e.target.value;
  saveSettings();
  renderCountdown();
});
$("#interview-len").addEventListener("change", (e) => {
  settings.interviewLen = Math.max(5, Math.min(120, Number(e.target.value) || 45));
  saveSettings();
});
$("#reset-progress").addEventListener("click", () => {
  if (!confirm("Delete all progress and saved code? Downloaded AI models are kept.")) return;
  for (const p of problems) store.remove(`code:${p.id}`);
  for (const k of Object.keys(progress)) delete progress[k];
  saveProgress();
  lastResults = new Map();
  toast("Progress reset.");
  if (cur) openProblem(cur.id);
  else renderHome();
});
$("#persist-btn").addEventListener("click", async () => {
  const ok = await navigator.storage?.persist?.();
  toast(ok ? "The browser will keep your data." : "The browser didn't grant persistence. Add to Home Screen to keep data on iPhone.");
  renderOfflineInfo();
});

async function renderOfflineInfo() {
  const info = $("#offline-info");
  const ready = await appCached();
  const standalone = matchMedia("(display-mode: standalone)").matches || navigator.standalone;
  info.innerHTML = `${ready ? "✓ The app and Python are saved for offline use." : "Downloading app files for offline use… (keep this page open once while online)"}<br>
    ${standalone ? "✓ Running as an installed app." : "Not installed. On iPhone: Share → Add to Home Screen."}`;
  try {
    const est = await navigator.storage.estimate();
    const persisted = await navigator.storage.persisted?.();
    $("#storage-info").textContent = `Using ${Math.round((est.usage || 0) / 1e6)} MB on this device${persisted ? " (persistent)" : ""}.`;
  } catch {}
}

// Ready for offline = the service worker finished installing and the big
// files that Python needs are all in the cache.
const CORE_FILES = ["vendor/pyodide/pyodide.asm.wasm", "vendor/pyodide/python_stdlib.zip", "vendor/pyodide/pyodide.asm.mjs", "vendor/codemirror.js", "js/py-worker.js", "problems/index.js"];
async function appCached() {
  try {
    const reg = await navigator.serviceWorker?.getRegistration();
    if (!reg?.active || reg.installing) return false;
    const hits = await Promise.all(CORE_FILES.map((f) => caches.match(new URL(f, location.href).href)));
    return hits.every(Boolean);
  } catch {
    return false;
  }
}

// ------------------------------------------------------------------ service worker
async function registerSW() {
  if (!("serviceWorker" in navigator)) return;
  try {
    await navigator.serviceWorker.register("sw.js");
    navigator.serviceWorker.addEventListener("message", (e) => {
      if (e.data?.type === "precached") {
        showOfflineCard();
        if ($("#settings").open) renderOfflineInfo();
      }
    });
  } catch (e) {
    console.warn("SW registration failed", e);
  }
}

async function showOfflineCard() {
  const card = $("#offline-card");
  const ready = await appCached();
  if (ready) {
    const shown = store.load("offlineReadyShown", false);
    card.hidden = shown;
    card.className = "card notice";
    card.innerHTML = `✓ <b>Ready for offline.</b> Python and all problems now work without internet. For the AI tutor, open any problem → <b>AI Tutor</b> → <b>Load</b> once while online.`;
    store.save("offlineReadyShown", true);
  } else if (!navigator.onLine) {
    card.hidden = false;
    card.className = "card notice warn";
    card.textContent = "You're offline and the app hasn't finished saving itself yet. Open it once with internet.";
  }
}

// ------------------------------------------------------------------ misc
function debounce(fn, ms) {
  let t;
  return (...a) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...a), ms);
  };
}

// iOS Safari doesn't resize the layout when the keyboard opens; size the
// problem view to the visible area so the editor and key bar stay usable.
if (window.visualViewport) {
  const vv = window.visualViewport;
  const fit = () => {
    document.documentElement.style.setProperty("--app-h", `${Math.round(vv.height)}px`);
    if (cur && vv.height < window.innerHeight - 80) window.scrollTo(0, 0);
  };
  vv.addEventListener("resize", fit);
  vv.addEventListener("scroll", fit);
  fit();
}

// Save the draft when the app is backgrounded (iOS may kill it).
document.addEventListener("visibilitychange", () => {
  if (document.hidden && cur && editor) store.save(`code:${cur.id}`, editor.value);
});
setInterval(renderCountdown, 60_000);

updateNet();
renderHome();
route();
registerSW();
showOfflineCard();
// Start Python in the background so the first run is fast.
setTimeout(() => runner.warmUp(), 500);
