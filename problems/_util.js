// Tagged templates for authoring problems.
// `py` / `md` keep backslashes literally (String.raw) and strip the common
// leading indentation so code can be indented naturally inside the JS file.

function dedent(strings, values) {
  let s = String.raw({ raw: strings.raw ?? strings }, ...values);
  // In raw strings an escaped backtick keeps its backslash; drop it.
  s = s.replace(/\\`/g, "`").replace(/\\\$\{/g, "${");
  s = s.replace(/^\n/, "").replace(/\n[ \t]*$/, "");
  const lines = s.split("\n");
  const indents = lines.filter((l) => l.trim()).map((l) => l.match(/^ */)[0].length);
  const min = indents.length ? Math.min(...indents) : 0;
  return lines.map((l) => l.slice(min)).join("\n");
}

export const py = (strings, ...values) => dedent(strings, values);
export const md = (strings, ...values) => dedent(strings, values);
