"""LocalLeet test harness.

Runs inside Pyodide (browser) and plain CPython (scripts/verify.mjs), so it
only uses the standard library.

A test is a dict with either:
  {"call": "<python expr>", "expect": "<python expr>", "cmp": "<mode>"}
or
  {"name": "...", "code": "<python statements, use assert>"}
"""

import contextlib
import io
import json
import math
import time
import traceback


# ---------------------------------------------------------------- helpers
# These are injected into the user's namespace (LeetCode-style).

class ListNode:
    def __init__(self, val=0, next=None):
        self.val = val
        self.next = next

    def __repr__(self):
        return f"ListNode({list_vals(self)})"


class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right

    def __repr__(self):
        return f"TreeNode({tree_vals(self)})"


def build_list(vals):
    head = None
    for v in reversed(vals):
        head = ListNode(v, head)
    return head


def list_vals(head, limit=10_000):
    out = []
    while head is not None and len(out) < limit:
        out.append(head.val)
        head = head.next
    return out


def build_tree(vals):
    """Level-order list (LeetCode style, None for gaps) -> TreeNode."""
    if not vals or vals[0] is None:
        return None
    nodes = iter(vals)
    root = TreeNode(next(nodes))
    queue = [root]
    i = 0
    while i < len(queue):
        node = queue[i]
        i += 1
        for side in ("left", "right"):
            try:
                v = next(nodes)
            except StopIteration:
                return root
            if v is not None:
                child = TreeNode(v)
                setattr(node, side, child)
                queue.append(child)
    return root


def tree_vals(root):
    """TreeNode -> level-order list with trailing Nones trimmed."""
    out, queue, i = [], [root], 0
    while i < len(queue):
        node = queue[i]
        i += 1
        if node is None:
            out.append(None)
            continue
        out.append(node.val)
        queue.append(node.left)
        queue.append(node.right)
    while out and out[-1] is None:
        out.pop()
    return out


HELPERS = {
    "ListNode": ListNode,
    "TreeNode": TreeNode,
    "build_list": build_list,
    "list_vals": list_vals,
    "build_tree": build_tree,
    "tree_vals": tree_vals,
}


# ------------------------------------------------------------ comparison

def _norm_nested(x):
    if isinstance(x, (list, tuple)):
        return sorted((_norm_nested(i) for i in x), key=repr)
    return x


def compare(actual, expected, mode):
    mode = mode or "exact"
    if mode == "exact":
        return actual == expected
    if mode == "sorted":  # order of the outer list doesn't matter
        return sorted(actual, key=repr) == sorted(expected, key=repr)
    if mode == "nested":  # order doesn't matter at any depth
        return _norm_nested(actual) == _norm_nested(expected)
    if mode == "float":
        return math.isclose(actual, expected, rel_tol=1e-6, abs_tol=1e-6)
    if mode == "any_of":  # expected is a list of acceptable answers
        return any(actual == e for e in expected)
    if mode == "truthy":
        return bool(actual) == bool(expected)
    raise ValueError(f"unknown cmp mode {mode!r}")


def _short_repr(x, limit=600):
    r = repr(x)
    return r if len(r) <= limit else r[:limit] + "…"


def _clean_tb(exc):
    """Traceback limited to frames from the user's code / test."""
    frames = [f for f in traceback.extract_tb(exc.__traceback__)
              if f.filename in ("<solution>", "<test>")]
    lines = []
    for f in frames:
        where = "your code" if f.filename == "<solution>" else "test"
        lines.append(f"  {where}, line {f.lineno}, in {f.name}")
        if f.line:
            lines.append(f"    {f.line}")
    lines.append(f"{type(exc).__name__}: {exc}")
    return "\n".join(lines)


# ------------------------------------------------------------------ run

def run(user_code, tests, budget_s=8.0):
    """Execute user_code then each test. Returns a JSON-able dict."""
    if isinstance(tests, str):
        tests = json.loads(tests)
    result = {"compile_error": None, "stdout": "", "tests": []}
    ns = {"__name__": "__main__"}
    ns.update(HELPERS)

    buf = io.StringIO()
    try:
        compiled = compile(user_code, "<solution>", "exec")
        with contextlib.redirect_stdout(buf):
            exec(compiled, ns)
    except Exception as e:  # noqa: BLE001
        result["compile_error"] = _clean_tb(e) if not isinstance(e, SyntaxError) \
            else "".join(traceback.format_exception_only(type(e), e)).replace('File "<solution>", ', "")
        result["stdout"] = buf.getvalue()
        return result
    result["stdout"] = buf.getvalue()

    start = time.perf_counter()
    for t in tests:
        entry = {"name": t.get("name") or t.get("call") or "test",
                 "pass": False, "stdout": "", "error": None,
                 "input": t.get("call"), "expected": None, "actual": None,
                 "part": t.get("part")}
        if time.perf_counter() - start > budget_s:
            entry["error"] = "Skipped: time budget exceeded (is something too slow?)"
            result["tests"].append(entry)
            continue
        out = io.StringIO()
        t0 = time.perf_counter()
        try:
            with contextlib.redirect_stdout(out):
                if "call" in t:
                    expected = eval(t["expect"], dict(HELPERS))
                    actual = eval(compile(t["call"], "<test>", "eval"), ns)
                    entry["expected"] = _short_repr(expected)
                    entry["actual"] = _short_repr(actual)
                    entry["pass"] = bool(compare(actual, expected, t.get("cmp")))
                else:
                    exec(compile(t["code"], "<test>", "exec"), dict(ns))
                    entry["pass"] = True
        except AssertionError as e:
            entry["error"] = ("AssertionError: " + str(e)) if str(e) else _clean_tb(e)
        except Exception as e:  # noqa: BLE001
            entry["error"] = _clean_tb(e)
        entry["ms"] = round((time.perf_counter() - t0) * 1000, 2)
        entry["stdout"] = out.getvalue()[:4000]
        result["tests"].append(entry)
    return result


def run_json(user_code, tests_json, budget_s=8.0):
    return json.dumps(run(user_code, tests_json, budget_s))


def run_plain(user_code):
    """Playground: just run code, return stdout + error."""
    buf = io.StringIO()
    ns = {"__name__": "__main__"}
    ns.update(HELPERS)
    err = None
    try:
        with contextlib.redirect_stdout(buf):
            exec(compile(user_code, "<solution>", "exec"), ns)
    except SyntaxError as e:
        err = "".join(traceback.format_exception_only(type(e), e)).replace('File "<solution>", ', "")
    except Exception as e:  # noqa: BLE001
        err = _clean_tb(e)
    return json.dumps({"stdout": buf.getvalue()[:20000], "error": err})


if __name__ == "__main__":  # CLI used by scripts/verify.mjs
    import sys
    payload = json.load(sys.stdin)
    print(run_json(payload["code"], payload["tests"], payload.get("budget", 30)))
