// CodeMirror 6 Python editor with an on-screen key bar for phone keyboards,
// which have no Tab key and bury brackets/colons on a second page.
import {
  EditorView, EditorState, Compartment, keymap, lineNumbers, highlightActiveLine,
  highlightActiveLineGutter, drawSelection, defaultKeymap, history, historyKeymap,
  indentWithTab, indentMore, indentLess, undo, redo, toggleComment, indentUnit,
  bracketMatching, syntaxHighlighting, defaultHighlightStyle, indentOnInput, python,
  oneDark, closeBrackets, closeBracketsKeymap,
} from "../vendor/codemirror.js";

const theme = new Compartment();
const fontSize = new Compartment();
const dark = () => matchMedia("(prefers-color-scheme: dark)").matches;

const baseTheme = EditorView.theme({
  "&": { height: "100%" },
  ".cm-scroller": { fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace", lineHeight: "1.5" },
  ".cm-content": { paddingBottom: "40vh" },
  ".cm-gutters": { border: "none" },
});

const sizeTheme = (px) => EditorView.theme({ ".cm-scroller": { fontSize: `${px}px` } });

export function createEditor(parent, { doc, onChange, fontPx = 14 }) {
  const view = new EditorView({
    parent,
    state: EditorState.create({
      doc,
      extensions: [
        lineNumbers(),
        highlightActiveLineGutter(),
        highlightActiveLine(),
        drawSelection(),
        history(),
        indentUnit.of("    "),
        EditorState.tabSize.of(4),
        indentOnInput(),
        bracketMatching(),
        closeBrackets(),
        python(),
        syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
        keymap.of([...closeBracketsKeymap, ...defaultKeymap, ...historyKeymap, indentWithTab,
          { key: "Mod-/", run: toggleComment }]),
        baseTheme,
        theme.of(dark() ? oneDark : []),
        fontSize.of(sizeTheme(fontPx)),
        EditorView.contentAttributes.of({ autocapitalize: "off", autocorrect: "off", spellcheck: "false" }),
        EditorView.updateListener.of((u) => u.docChanged && onChange?.(u.state.doc.toString())),
      ],
    }),
  });
  const mq = matchMedia("(prefers-color-scheme: dark)");
  const onScheme = () => view.dispatch({ effects: theme.reconfigure(dark() ? oneDark : []) });
  mq.addEventListener?.("change", onScheme);

  return {
    view,
    get value() {
      return view.state.doc.toString();
    },
    set value(text) {
      view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: text } });
    },
    setFontSize(px) {
      view.dispatch({ effects: fontSize.reconfigure(sizeTheme(px)) });
    },
    destroy() {
      mq.removeEventListener?.("change", onScheme);
      view.destroy();
    },
  };
}

const KEYS = [
  { label: "⇥", title: "Indent", run: (v) => indentMore(v) },
  { label: "⇤", title: "Dedent", run: (v) => indentLess(v) },
  { label: "↶", title: "Undo", run: (v) => undo(v) },
  { label: "↷", title: "Redo", run: (v) => redo(v) },
  ..."():[]{}=_'\"#.,+-*/<>!%".split("").map((c) => ({ label: c, insert: c })),
  { label: "self", insert: "self." },
  { label: "return", insert: "return " },
];

export function renderKeyBar(container, getView) {
  container.innerHTML = "";
  for (const k of KEYS) {
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = k.label;
    b.title = k.title || k.label;
    // mousedown/preventDefault keeps focus (and the keyboard) in the editor.
    b.addEventListener("pointerdown", (e) => e.preventDefault());
    b.addEventListener("click", () => {
      const view = getView();
      if (!view) return;
      if (k.run) k.run(view);
      else view.dispatch(view.state.replaceSelection(k.insert), { scrollIntoView: true, userEvent: "input" });
      view.focus();
    });
    container.appendChild(b);
  }
}
