// Multi-part, "practical" interview problems in the style Chalk describes:
// one problem with more parts than fit in 45 minutes, written in Python.
// Themes follow Chalk's domain (features, resolvers, point-in-time data) and
// reported questions (feature/resolver metaprogramming, rain flow on a grid).
import { py, md } from "./_util.js";

export default [
  // ------------------------------------------------------------------ 1
  {
    id: "chalk-feature-classes",
    title: "Feature Classes & Resolvers (metaprogramming)",
    difficulty: "Hard",
    topic: "Chalk-style (multi-part)",
    tags: ["metaprogramming", "decorators", "type hints", "graphs"],
    timeLimitMin: 45,
    intro: md`
      You're building a tiny version of a feature-store SDK. Users declare **feature classes**
      with type annotations, and **resolvers** — plain functions whose parameter and return
      annotations say which features they read and produce.

      \`\`\`python
      @features
      class User:
          id: int
          birth_year: int
          age: int
          email: str | None

      @resolver
      def get_age(birth_year: User.birth_year) -> User.age:
          return 2026 - birth_year
      \`\`\`

      A \`Feature\` dataclass is provided. Work through the parts in order — there is more here
      than fits in 45 minutes, so talk through trade-offs as you go.
    `,
    parts: [
      {
        title: "Part 1 — the @features decorator",
        prompt: md`
          Implement \`features(cls)\`, a class decorator. For each annotated attribute of the
          class, replace the class attribute with a \`Feature\`:

          - \`name\` — the attribute name (\`"birth_year"\`)
          - \`namespace\` — the class name in **snake_case** (\`User\` → \`"user"\`,
            \`CreditCardTxn\` → \`"credit_card_txn"\`)
          - \`typ\` — the annotated type (\`int\`)

          Also set \`cls.__features__\` to the list of features **in declaration order**.
          Methods and non-annotated attributes must be left alone. Return the class.

          \`\`\`python
          User.age            # Feature(name='age', namespace='user', typ=int, ...)
          User.age.fqn        # 'user.age'
          [f.name for f in User.__features__]   # ['id', 'birth_year', 'age', 'email']
          \`\`\`
        `,
        hints: [
          "Annotations live on the class. `typing.get_type_hints(cls)` (or `cls.__annotations__`) gives you a name → type mapping, in declaration order.",
          "`setattr(cls, name, Feature(...))` replaces the class attribute. For snake_case, insert an underscore before each capital letter that isn't the first character, then lowercase.",
          "A regex like `re.sub(r'(?<!^)(?=[A-Z])', '_', name).lower()` does the snake_case conversion.",
        ],
        tests: [
          { name: "creates Feature objects", code: py`
              @features
              class User:
                  id: int
                  birth_year: int
                  age: int
              assert isinstance(User.age, Feature), f"User.age is {User.age!r}, expected a Feature"
              assert User.age.name == "age", f"name = {User.age.name!r}"
              assert User.age.namespace == "user", f"namespace = {User.age.namespace!r}"
              assert User.age.typ is int, f"typ = {User.age.typ!r}"
              assert User.age.fqn == "user.age"
            ` },
          { name: "__features__ keeps declaration order", code: py`
              @features
              class User:
                  zeta: str
                  alpha: int
                  mid: float
              got = [f.name for f in User.__features__]
              assert got == ["zeta", "alpha", "mid"], f"got {got}"
            ` },
          { name: "snake_case namespace", code: py`
              @features
              class CreditCardTxn:
                  amount: float
              assert CreditCardTxn.amount.namespace == "credit_card_txn", CreditCardTxn.amount.namespace
              assert str(CreditCardTxn.amount) == "credit_card_txn.amount"
            ` },
          { name: "methods and plain attributes untouched", code: py`
              @features
              class Account:
                  balance: float
                  VERSION = 3
                  def describe(self):
                      return "acct"
              assert Account.VERSION == 3
              assert Account.describe(None) == "acct"
              assert [f.name for f in Account.__features__] == ["balance"]
            ` },
          { name: "decorator returns the class", code: py`
              class Thing:
                  x: int
              out = features(Thing)
              assert out is Thing, f"features() returned {out!r}"
            ` },
        ],
      },
      {
        title: "Part 2 — optional features, defaults, and instances",
        prompt: md`
          Extend \`@features\`:

          - \`email: str | None\` (or \`Optional[str]\`) → \`typ=str\`, \`nullable=True\`.
          - \`country: str = "US"\` → \`default="US"\` (the class attribute still becomes a \`Feature\`).
          - Feature classes become constructible with **keyword arguments**:
            \`User(id=1, birth_year=1990)\`. Missing required features raise \`TypeError\`;
            unknown names raise \`TypeError\`; missing optional features get their default, or
            \`None\` if nullable with no default.
        `,
        hints: [
          "`typing.get_origin(t)` returns `typing.Union` for `Optional[str]` and `types.UnionType` for `str | None`; `typing.get_args(t)` gives the members.",
          "Look up the class's raw default with `cls.__dict__.get(name, MISSING)` *before* you overwrite it with the Feature.",
          "Generate an `__init__(self, **kwargs)` that walks `cls.__features__`, and assign it with `cls.__init__ = __init__`. Instance attributes shadow the class-level Feature objects.",
        ],
        tests: [
          { name: "str | None is nullable", code: py`
              @features
              class User:
                  id: int
                  email: str | None
              assert User.email.nullable is True, f"nullable = {User.email.nullable}"
              assert User.email.typ is str, f"typ = {User.email.typ!r}"
              assert User.id.nullable is False
            ` },
          { name: "Optional[...] is nullable", code: py`
              from typing import Optional
              @features
              class User:
                  nickname: Optional[str]
              assert User.nickname.nullable is True
              assert User.nickname.typ is str
            ` },
          { name: "defaults are recorded", code: py`
              @features
              class User:
                  id: int
                  country: str = "US"
              assert isinstance(User.country, Feature), "class attribute should become a Feature"
              assert User.country.default == "US", f"default = {User.country.default!r}"
              assert User.id.default is MISSING
            ` },
          { name: "keyword construction", code: py`
              @features
              class User:
                  id: int
                  email: str | None
                  country: str = "US"
              u = User(id=7)
              assert (u.id, u.email, u.country) == (7, None, "US"), (u.id, u.email, u.country)
              u2 = User(id=8, email="a@b.c", country="CA")
              assert (u2.id, u2.email, u2.country) == (8, "a@b.c", "CA")
            ` },
          { name: "missing / unknown fields raise TypeError", code: py`
              @features
              class User:
                  id: int
                  name: str
              for kwargs in ({"id": 1}, {"id": 1, "name": "x", "bogus": 2}):
                  try:
                      User(**kwargs)
                  except TypeError:
                      pass
                  else:
                      raise AssertionError(f"User(**{kwargs}) should raise TypeError")
            ` },
        ],
      },
      {
        title: "Part 3 — has-one relationships",
        prompt: md`
          A feature whose type is another feature class is a **relationship**. Chained attribute
          access must produce a new \`Feature\` that remembers the path:

          \`\`\`python
          @features
          class Account:
              id: int
              balance: float

          @features
          class User:
              id: int
              account: Account

          User.account.balance.fqn      # 'user.account.balance'
          User.account.balance.typ      # float
          User.account.balance.path     # ('account',)
          \`\`\`

          Relationships can nest (\`User.account.bank.routing\` → \`'user.account.bank.routing'\`).
          Accessing a name that doesn't exist on the related class raises \`AttributeError\`.

          *Discussion point:* what happens if a related class has a feature called \`name\` or
          \`path\`? (It collides with \`Feature\`'s own fields. How would you fix that?)
        `,
        hints: [
          "Python calls `__getattr__` only when normal attribute lookup fails — that's the hook for `User.account.balance`.",
          "In `Feature.__getattr__(self, item)`, check whether `self.typ` has `__features__`. If so, find the target feature and return a copy with `namespace=self.namespace` and `path=self.path + (self.name,)`.",
          "`dataclasses.replace(target, namespace=..., path=...)` builds the copy. Guard dunder names (raise AttributeError for anything starting with `_`) so copying/pickling still works.",
        ],
        tests: [
          { name: "one hop", code: py`
              @features
              class Account:
                  id: int
                  balance: float
              @features
              class User:
                  id: int
                  account: Account
              f = User.account.balance
              assert isinstance(f, Feature), f"got {f!r}"
              assert f.fqn == "user.account.balance", f.fqn
              assert f.typ is float
              assert f.path == ("account",), f.path
              assert User.account.typ is Account
            ` },
          { name: "nested hops", code: py`
              @features
              class Bank:
                  routing: str
              @features
              class Account:
                  bank: Bank
              @features
              class User:
                  account: Account
              f = User.account.bank.routing
              assert f.fqn == "user.account.bank.routing", f.fqn
              assert f.path == ("account", "bank"), f.path
            ` },
          { name: "unknown attribute raises AttributeError", code: py`
              @features
              class Account:
                  balance: float
              @features
              class User:
                  account: Account
              try:
                  User.account.nope
              except AttributeError:
                  pass
              else:
                  raise AssertionError("expected AttributeError")
              try:
                  User.id_that_does_not_exist
              except AttributeError:
                  pass
            ` },
          { name: "original features unchanged", code: py`
              @features
              class Account:
                  balance: float
              @features
              class User:
                  account: Account
              _ = User.account.balance
              assert Account.balance.fqn == "account.balance", Account.balance.fqn
              assert Account.balance.path == ()
            ` },
        ],
      },
      {
        title: "Part 4 — @resolver and resolve()",
        prompt: md`
          Implement \`@resolver\`. It reads the decorated function's **parameter annotations**
          (each a \`Feature\`) as \`inputs\` and its **return annotation** as \`output\`, wraps it in
          a \`Resolver\` (provided), appends it to the global \`RESOLVERS\` list, and returns it.
          A \`Resolver\` must still be callable like the original function.

          Then implement \`resolve(want, given)\`:
          - \`want\`: list of \`Feature\`s to compute; \`given\`: \`dict[Feature, value]\`.
          - Run resolvers (in dependency order) to compute every wanted feature.
          - Return \`{feature.fqn: value}\` for the wanted features only.
          - Call each resolver at most once. Raise \`ValueError\` if something can't be computed.

          \`\`\`python
          @resolver
          def get_age(birth_year: User.birth_year) -> User.age:
              return 2026 - birth_year

          resolve([User.age], {User.birth_year: 1990})   # {'user.age': 36}
          \`\`\`
        `,
        hints: [
          "`inspect.signature(fn)` gives `.parameters` (each with `.annotation`) and `.return_annotation`. `typing.get_type_hints` would try to treat Features as types — read the raw annotations instead.",
          "Index resolvers by output feature. Computing a feature = if it's in `given`, use it; else find its resolver, recursively compute its inputs, call it, memoize.",
          "Track features currently being computed (a 'visiting' set) to detect cycles and raise ValueError instead of recursing forever.",
        ],
        tests: [
          { name: "resolver metadata", code: py`
              RESOLVERS.clear()
              @features
              class User:
                  birth_year: int
                  age: int
              @resolver
              def get_age(birth_year: User.birth_year) -> User.age:
                  return 2026 - birth_year
              assert get_age.inputs == [User.birth_year], f"inputs = {get_age.inputs}"
              assert get_age.output == User.age, f"output = {get_age.output}"
              assert RESOLVERS == [get_age], f"RESOLVERS = {RESOLVERS}"
              assert get_age(2000) == 26, "Resolver should still be callable"
            ` },
          { name: "resolve one step", code: py`
              RESOLVERS.clear()
              @features
              class User:
                  birth_year: int
                  age: int
              @resolver
              def get_age(birth_year: User.birth_year) -> User.age:
                  return 2026 - birth_year
              got = resolve([User.age], {User.birth_year: 1990})
              assert got == {"user.age": 36}, f"got {got}"
            ` },
          { name: "resolve a chain, each resolver once", code: py`
              RESOLVERS.clear()
              calls = []
              @features
              class User:
                  birth_year: int
                  age: int
                  is_adult: bool
                  segment: str
              @resolver
              def get_age(birth_year: User.birth_year) -> User.age:
                  calls.append("age")
                  return 2026 - birth_year
              @resolver
              def get_adult(age: User.age) -> User.is_adult:
                  calls.append("adult")
                  return age >= 18
              @resolver
              def get_segment(age: User.age, adult: User.is_adult) -> User.segment:
                  calls.append("segment")
                  return f"{'adult' if adult else 'minor'}-{age // 10 * 10}s"
              got = resolve([User.segment, User.is_adult], {User.birth_year: 2001})
              assert got == {"user.segment": "adult-20s", "user.is_adult": True}, f"got {got}"
              assert sorted(calls) == ["adult", "age", "segment"], f"calls = {calls}"
            ` },
          { name: "given values win over resolvers", code: py`
              RESOLVERS.clear()
              @features
              class User:
                  birth_year: int
                  age: int
              @resolver
              def get_age(birth_year: User.birth_year) -> User.age:
                  raise AssertionError("should not be called")
              assert resolve([User.age], {User.age: 50}) == {"user.age": 50}
            ` },
          { name: "impossible -> ValueError", code: py`
              RESOLVERS.clear()
              @features
              class User:
                  a: int
                  b: int
                  c: int
              @resolver
              def a_from_b(b: User.b) -> User.a:
                  return b
              @resolver
              def b_from_a(a: User.a) -> User.b:
                  return a
              for want, given in (([User.c], {}), ([User.a], {})):
                  try:
                      resolve(want, given)
                  except ValueError:
                      pass
                  else:
                      raise AssertionError(f"resolve({want}) should raise ValueError")
            ` },
        ],
      },
    ],
    starter: py`
      from dataclasses import dataclass
      from typing import Any, Callable


      class _Missing:
          def __repr__(self) -> str:
              return "MISSING"


      MISSING = _Missing()


      @dataclass(frozen=True)
      class Feature:
          name: str                   # attribute name, e.g. "age"
          namespace: str              # snake_case class name, e.g. "user"
          typ: Any                    # Python type, e.g. int
          nullable: bool = False      # Part 2
          default: Any = MISSING      # Part 2
          path: tuple = ()            # Part 3: relationship hops, e.g. ("account",)

          @property
          def fqn(self) -> str:
              return ".".join((self.namespace, *self.path, self.name))

          def __str__(self) -> str:
              return self.fqn


      def features(cls):
          # Part 1-3
          pass


      @dataclass(eq=False)
      class Resolver:
          fn: Callable
          inputs: list
          output: Feature

          def __call__(self, *args, **kwargs):
              return self.fn(*args, **kwargs)


      RESOLVERS: list[Resolver] = []


      def resolver(fn):
          # Part 4
          pass


      def resolve(want: list[Feature], given: dict[Feature, Any]) -> dict[str, Any]:
          # Part 4
          pass
    `,
    solution: py`
      import dataclasses
      import inspect
      import re
      import types
      import typing
      from dataclasses import dataclass
      from typing import Any, Callable


      class _Missing:
          def __repr__(self) -> str:
              return "MISSING"


      MISSING = _Missing()


      @dataclass(frozen=True)
      class Feature:
          name: str
          namespace: str
          typ: Any
          nullable: bool = False
          default: Any = MISSING
          path: tuple = ()

          @property
          def fqn(self) -> str:
              return ".".join((self.namespace, *self.path, self.name))

          def __str__(self) -> str:
              return self.fqn

          def __getattr__(self, item):
              # Only reached when normal lookup fails: relationship hops.
              if item.startswith("_"):
                  raise AttributeError(item)
              target = getattr(self.typ, "__features__", None)
              by_name = {f.name: f for f in target or ()}
              if item not in by_name:
                  raise AttributeError(f"{self.fqn} has no feature {item!r}")
              return dataclasses.replace(
                  by_name[item],
                  namespace=self.namespace,
                  path=self.path + (self.name,) + by_name[item].path,
              )


      def _snake(name: str) -> str:
          return re.sub(r"(?<!^)(?=[A-Z])", "_", name).lower()


      def _unwrap_optional(t):
          if typing.get_origin(t) in (typing.Union, types.UnionType):
              args = [a for a in typing.get_args(t) if a is not type(None)]
              if len(args) < len(typing.get_args(t)):
                  return (args[0] if len(args) == 1 else typing.Union[tuple(args)]), True
          return t, False


      def features(cls):
          ns = _snake(cls.__name__)
          feats = []
          for name, t in typing.get_type_hints(cls).items():
              typ, nullable = _unwrap_optional(t)
              default = cls.__dict__.get(name, MISSING)
              f = Feature(name, ns, typ, nullable, default)
              setattr(cls, name, f)
              feats.append(f)
          cls.__features__ = feats

          def __init__(self, **kwargs):
              for f in feats:
                  if f.name in kwargs:
                      value = kwargs.pop(f.name)
                  elif f.default is not MISSING:
                      value = f.default
                  elif f.nullable:
                      value = None
                  else:
                      raise TypeError(f"missing required feature {f.name!r}")
                  setattr(self, f.name, value)
              if kwargs:
                  raise TypeError(f"unknown features: {sorted(kwargs)}")

          cls.__init__ = __init__
          return cls


      @dataclass(eq=False)
      class Resolver:
          fn: Callable
          inputs: list
          output: Feature

          def __call__(self, *args, **kwargs):
              return self.fn(*args, **kwargs)


      RESOLVERS: list[Resolver] = []


      def resolver(fn):
          sig = inspect.signature(fn)
          inputs = [p.annotation for p in sig.parameters.values()]
          r = Resolver(fn, inputs, sig.return_annotation)
          RESOLVERS.append(r)
          return r


      def resolve(want: list[Feature], given: dict[Feature, Any]) -> dict[str, Any]:
          by_output = {r.output: r for r in RESOLVERS}
          values = dict(given)
          visiting = set()

          def compute(f):
              if f in values:
                  return values[f]
              if f in visiting:
                  raise ValueError(f"cycle at {f}")
              if f not in by_output:
                  raise ValueError(f"no resolver or input for {f}")
              visiting.add(f)
              r = by_output[f]
              values[f] = r(*[compute(i) for i in r.inputs])
              visiting.discard(f)
              return values[f]

          return {f.fqn: compute(f) for f in want}
    `,
    complexity: "Decorators: O(#features). resolve(): O(R + F) — each resolver and feature visited once thanks to memoization.",
    explanation: md`
      The whole problem rests on two Python hooks: **class decorators** (get the class object
      after it's built and rewrite its attributes from its annotations) and **\`__getattr__\`**
      (called only when normal lookup fails, which makes \`User.account.balance\` work without
      breaking the dataclass's real fields). Resolvers come from \`inspect.signature\`, which
      exposes annotations as plain objects — here, Features. \`resolve\` is a DFS over the
      dependency graph with memoization (each resolver runs once) and a visiting set to catch cycles.
    `,
  },

  // ------------------------------------------------------------------ 2
  {
    id: "chalk-resolver-graph",
    title: "Resolver Dependency Graph",
    difficulty: "Medium",
    topic: "Chalk-style (multi-part)",
    tags: ["graphs", "topological sort", "dfs", "memoization"],
    timeLimitMin: 45,
    intro: md`
      A feature pipeline is a set of **resolvers**. Each one reads some named features and
      produces one or more named features:

      \`\`\`python
      Resolver("age", inputs=["birth_year"], outputs=["age"], fn=lambda y: 2026 - y)
      \`\`\`

      Given the resolvers, some known input values, and a list of wanted feature names,
      compute the wanted features. The \`Resolver\` dataclass and two exception types are provided.
      If a resolver has several outputs, \`fn\` returns a tuple in the same order.
    `,
    parts: [
      {
        title: "Part 1 — compute wanted features",
        prompt: md`
          Implement \`resolve(resolvers, inputs, want) -> dict\`. Every feature has **at most one**
          resolver in this part. Values in \`inputs\` are used as-is (never recomputed). Return a
          dict containing **only** the wanted features.

          \`\`\`python
          rs = [
              Resolver("age", ["birth_year"], ["age"], lambda y: 2026 - y),
              Resolver("adult", ["age"], ["is_adult"], lambda a: a >= 18),
          ]
          resolve(rs, {"birth_year": 2000}, ["is_adult"])   # {'is_adult': True}
          \`\`\`
        `,
        hints: [
          "Build a map from each output feature to the resolver that produces it.",
          "Write a recursive `compute(feature)`: if it's already known return it; otherwise compute the resolver's inputs first, call it, store the result(s).",
          "Storing every computed value in one dict (seeded with `inputs`) is both your memo table and your output source.",
        ],
        tests: [
          { name: "single step", code: py`
              rs = [Resolver("age", ["birth_year"], ["age"], lambda y: 2026 - y)]
              got = resolve(rs, {"birth_year": 1990}, ["age"])
              assert got == {"age": 36}, f"got {got}"
            ` },
          { name: "chain", code: py`
              rs = [
                  Resolver("adult", ["age"], ["is_adult"], lambda a: a >= 18),
                  Resolver("age", ["birth_year"], ["age"], lambda y: 2026 - y),
              ]
              got = resolve(rs, {"birth_year": 2015}, ["is_adult"])
              assert got == {"is_adult": False}, f"got {got}"
            ` },
          { name: "diamond + multiple wants", code: py`
              rs = [
                  Resolver("b", ["a"], ["b"], lambda a: a + 1),
                  Resolver("c", ["a"], ["c"], lambda a: a * 10),
                  Resolver("d", ["b", "c"], ["d"], lambda b, c: b + c),
              ]
              got = resolve(rs, {"a": 2}, ["d", "b"])
              assert got == {"d": 23, "b": 3}, f"got {got}"
            ` },
          { name: "inputs are not recomputed", code: py`
              def boom(_):
                  raise AssertionError("resolver should not run: value was given")
              rs = [Resolver("age", ["birth_year"], ["age"], boom)]
              got = resolve(rs, {"age": 40}, ["age"])
              assert got == {"age": 40}, f"got {got}"
            ` },
          { name: "multi-output resolver", code: py`
              rs = [
                  Resolver("split", ["full_name"], ["first", "last"], lambda n: tuple(n.split(" ", 1))),
                  Resolver("initials", ["first", "last"], ["initials"], lambda f, l: f[0] + l[0]),
              ]
              got = resolve(rs, {"full_name": "Ada Lovelace"}, ["initials", "last"])
              assert got == {"initials": "AL", "last": "Lovelace"}, f"got {got}"
            ` },
        ],
      },
      {
        title: "Part 2 — errors: cycles and missing inputs",
        prompt: md`
          - If computing a wanted feature requires a feature that has no resolver and isn't in
            \`inputs\`, raise \`MissingInputError(missing)\` where \`missing\` is the **sorted list
            of all** such leaf features needed (not just the first one found).
          - If the dependencies form a cycle that \`inputs\` don't break, raise \`CycleError\`.
          - A cycle that *is* broken by a given input is fine.
        `,
        hints: [
          "Keep a set of features on the current DFS path. Seeing a feature already on the path means a cycle.",
          "To report *all* missing leaves, don't stop at the first failure: collect missing names from every input of the resolver before deciding.",
          "Planning (can this be computed, and what's missing?) can be a separate pass from executing. That way nothing runs if the request is invalid.",
        ],
        tests: [
          { name: "missing leaf", code: py`
              rs = [Resolver("age", ["birth_year"], ["age"], lambda y: 2026 - y)]
              try:
                  resolve(rs, {}, ["age"])
              except MissingInputError as e:
                  assert e.missing == ["birth_year"], f"missing = {e.missing}"
              else:
                  raise AssertionError("expected MissingInputError")
            ` },
          { name: "reports all missing leaves, sorted", code: py`
              rs = [
                  Resolver("score", ["x", "y"], ["score"], lambda x, y: x + y),
                  Resolver("x", ["zeta", "alpha"], ["x"], lambda a, b: a + b),
              ]
              try:
                  resolve(rs, {}, ["score"])
              except MissingInputError as e:
                  assert e.missing == ["alpha", "y", "zeta"], f"missing = {e.missing}"
              else:
                  raise AssertionError("expected MissingInputError")
            ` },
          { name: "cycle", code: py`
              rs = [
                  Resolver("a", ["b"], ["a"], lambda b: b),
                  Resolver("b", ["c"], ["b"], lambda c: c),
                  Resolver("c", ["a"], ["c"], lambda a: a),
              ]
              try:
                  resolve(rs, {}, ["a"])
              except CycleError:
                  pass
              else:
                  raise AssertionError("expected CycleError")
            ` },
          { name: "cycle broken by an input", code: py`
              rs = [
                  Resolver("a", ["b"], ["a"], lambda b: b + 1),
                  Resolver("b", ["a"], ["b"], lambda a: a + 1),
              ]
              got = resolve(rs, {"b": 5}, ["a"])
              assert got == {"a": 6}, f"got {got}"
            ` },
          { name: "nothing runs when invalid", code: py`
              ran = []
              rs = [
                  Resolver("p", [], ["p"], lambda: ran.append("p") or 1),
                  Resolver("q", ["p", "missing"], ["q"], lambda p, m: 0),
              ]
              try:
                  resolve(rs, {}, ["q"])
              except MissingInputError:
                  pass
              assert ran == [], f"resolvers ran before validation: {ran}"
            ` },
        ],
      },
      {
        title: "Part 3 — run only what's needed, once",
        prompt: md`
          Resolvers can be expensive. Make sure:
          - resolvers that aren't needed for the wanted features never run, and
          - each resolver runs **at most once** per \`resolve\` call (even multi-output ones,
            even when many features depend on it).
        `,
        hints: [
          "If your Part 1 memoizes every computed value, a resolver runs again only if you forget to store *all* of its outputs.",
          "Driving the computation from `want` (top-down DFS) means unreachable resolvers are never touched.",
          "Count calls by wrapping each fn while you debug; that's exactly what the tests do.",
        ],
        tests: [
          { name: "unneeded resolvers never run", code: py`
              calls = []
              rs = [
                  Resolver("a", ["x"], ["a"], lambda x: calls.append("a") or x),
                  Resolver("b", ["x"], ["b"], lambda x: calls.append("b") or x),
              ]
              resolve(rs, {"x": 1}, ["a"])
              assert calls == ["a"], f"calls = {calls}"
            ` },
          { name: "shared dependency runs once", code: py`
              calls = []
              def track(name, f):
                  def g(*a):
                      calls.append(name)
                      return f(*a)
                  return g
              rs = [
                  Resolver("base", ["x"], ["base"], track("base", lambda x: x * 2)),
                  Resolver("l", ["base"], ["l"], track("l", lambda b: b + 1)),
                  Resolver("r", ["base"], ["r"], track("r", lambda b: b - 1)),
                  Resolver("top", ["l", "r", "base"], ["top"], track("top", lambda l, r, b: l * r + b)),
              ]
              got = resolve(rs, {"x": 5}, ["top", "l", "r"])
              assert got == {"top": 109, "l": 11, "r": 9}, f"got {got}"
              assert sorted(calls) == ["base", "l", "r", "top"], f"calls = {calls}"
            ` },
          { name: "multi-output resolver runs once", code: py`
              calls = []
              rs = [Resolver("mm", ["xs"], ["lo", "hi"], lambda xs: calls.append(1) or (min(xs), max(xs)))]
              got = resolve(rs, {"xs": [3, 1, 4]}, ["lo", "hi"])
              assert got == {"lo": 1, "hi": 4}, f"got {got}"
              assert len(calls) == 1, f"ran {len(calls)} times"
            ` },
          { name: "deep chain (no recursion blowup at 500)", code: py`
              n = 500
              rs = [Resolver(f"r{i}", [f"f{i}"], [f"f{i+1}"], lambda v: v + 1) for i in range(n)]
              got = resolve(rs, {"f0": 0}, [f"f{n}"])
              assert got == {f"f{n}": n}, f"got {got}"
            ` },
        ],
      },
      {
        title: "Part 4 — alternative resolvers, cheapest wins",
        prompt: md`
          Now several resolvers may produce the same feature, and each has a \`cost\` (default 1).
          For each feature choose the resolver with the lowest **total cost**: its own cost plus
          the total cost of computing its inputs (given inputs cost 0). Skip alternatives whose
          inputs can't be satisfied. If no alternative works, raise \`MissingInputError\`.
        `,
        hints: [
          "This is a shortest-path problem on a dependency graph: `best(f) = 0` if given, else the min over producers r of `r.cost + Σ best(input)`.",
          "Memoize `best(f)` along with the chosen resolver. Treat an alternative that raises MissingInputError/CycleError as unusable rather than failing the whole request.",
          "Execution then follows the chosen resolver per feature: the same DFS as Part 1.",
        ],
        tests: [
          { name: "picks the cheaper alternative", code: py`
              rs = [
                  Resolver("slow", ["user_id"], ["score"], lambda u: "slow", cost=10),
                  Resolver("fast", ["user_id"], ["score"], lambda u: "fast", cost=2),
              ]
              assert resolve(rs, {"user_id": 1}, ["score"]) == {"score": "fast"}
            ` },
          { name: "counts the cost of inputs", code: py`
              rs = [
                  Resolver("direct", ["user_id"], ["score"], lambda u: "direct", cost=5),
                  Resolver("via_cache", ["cache_key"], ["score"], lambda k: "cache", cost=1),
                  Resolver("key", ["user_id"], ["cache_key"], lambda u: f"k{u}", cost=10),
              ]
              assert resolve(rs, {"user_id": 1}, ["score"]) == {"score": "direct"}
              # With the cache key given, the cache path costs 1.
              assert resolve(rs, {"user_id": 1, "cache_key": "k1"}, ["score"]) == {"score": "cache"}
            ` },
          { name: "skips unsatisfiable alternatives", code: py`
              rs = [
                  Resolver("from_email", ["email"], ["user_id"], lambda e: "email", cost=1),
                  Resolver("from_phone", ["phone"], ["user_id"], lambda p: "phone", cost=50),
              ]
              assert resolve(rs, {"phone": "555"}, ["user_id"]) == {"user_id": "phone"}
            ` },
          { name: "no alternative works", code: py`
              rs = [
                  Resolver("from_email", ["email"], ["user_id"], lambda e: 1),
                  Resolver("from_phone", ["phone"], ["user_id"], lambda p: 2),
              ]
              try:
                  resolve(rs, {}, ["user_id"])
              except MissingInputError:
                  pass
              else:
                  raise AssertionError("expected MissingInputError")
            ` },
        ],
      },
    ],
    starter: py`
      from dataclasses import dataclass
      from typing import Any, Callable


      @dataclass
      class Resolver:
          name: str
          inputs: list[str]
          outputs: list[str]
          fn: Callable[..., Any]
          cost: int = 1


      class CycleError(Exception):
          pass


      class MissingInputError(Exception):
          def __init__(self, missing: list[str]):
              super().__init__(f"missing inputs: {missing}")
              self.missing = missing


      def resolve(resolvers: list[Resolver], inputs: dict[str, Any], want: list[str]) -> dict[str, Any]:
          pass
    `,
    solution: py`
      import sys
      from collections import defaultdict
      from dataclasses import dataclass
      from typing import Any, Callable


      @dataclass
      class Resolver:
          name: str
          inputs: list[str]
          outputs: list[str]
          fn: Callable[..., Any]
          cost: int = 1


      class CycleError(Exception):
          pass


      class MissingInputError(Exception):
          def __init__(self, missing: list[str]):
              super().__init__(f"missing inputs: {missing}")
              self.missing = missing


      def resolve(resolvers: list[Resolver], inputs: dict[str, Any], want: list[str]) -> dict[str, Any]:
          sys.setrecursionlimit(max(sys.getrecursionlimit(), 10_000))
          producers = defaultdict(list)
          for r in resolvers:
              for out in r.outputs:
                  producers[out].append(r)

          plan = {}        # feature -> (total cost, chosen resolver or None)
          on_path = set()

          def best(f):
              if f in inputs:
                  return 0, None
              if f in plan:
                  return plan[f]
              if f in on_path:
                  raise CycleError(f)
              if not producers[f]:
                  raise MissingInputError([f])
              on_path.add(f)
              choice, missing, cycle = None, set(), None
              try:
                  for r in producers[f]:
                      cost, miss = r.cost, set()
                      try:
                          for i in r.inputs:
                              try:
                                  cost += best(i)[0]
                              except MissingInputError as e:
                                  miss.update(e.missing)
                      except CycleError as e:
                          cycle = e
                          continue
                      if miss:
                          missing |= miss
                      elif choice is None or cost < choice[0]:
                          choice = (cost, r)
              finally:
                  on_path.discard(f)
              if choice is None:
                  if cycle is not None and not missing:
                      raise cycle
                  raise MissingInputError(sorted(missing))
              plan[f] = choice
              return choice

          missing = set()
          for f in want:
              try:
                  best(f)
              except MissingInputError as e:
                  missing.update(e.missing)
          if missing:
              raise MissingInputError(sorted(missing))

          values = dict(inputs)

          def compute(f):
              if f in values:
                  return values[f]
              r = plan[f][1]
              out = r.fn(*[compute(i) for i in r.inputs])
              if len(r.outputs) == 1:
                  values[r.outputs[0]] = out
              else:
                  values.update(zip(r.outputs, out))
              return values[f]

          return {f: compute(f) for f in want}
    `,
    complexity: "O(R·k + F) where k is the average number of inputs: every feature is planned once (memoized) and every chosen resolver runs once.",
    explanation: md`
      Split the work into **plan** and **execute**. Planning is a memoized DFS from the wanted
      features: a feature costs 0 if given, else the cheapest producer's cost plus its inputs'
      costs. The DFS path set detects cycles, and missing leaves are unioned instead of failing
      fast. Execution then walks the chosen resolvers top-down, storing *every* output in one
      values dict, so nothing runs twice and unreachable resolvers never run.
    `,
  },

  // ------------------------------------------------------------------ 3
  {
    id: "chalk-rain-flow",
    title: "Rain Flow on a Height Grid",
    difficulty: "Medium",
    topic: "Chalk-style (multi-part)",
    tags: ["grid", "dfs", "memoization", "heap"],
    timeLimitMin: 45,
    intro: md`
      You get a terrain as a grid of integer heights. Rain falls on every cell and water flows
      downhill. Reports from Chalk interviews mention a problem like this (grid traversal,
      flow toward local minima, propagating state), so expect follow-ups.
    `,
    parts: [
      {
        title: "Part 1 — where does each drop end up?",
        prompt: md`
          From a cell, water moves to the **lowest** of its 4 neighbors (up, down, left, right),
          but only if that neighbor is **strictly lower** than the current cell. Ties between
          equally low neighbors go to the first in the order **up, left, right, down**. Water stops
          at a cell with no strictly lower neighbor: a **sink**.

          Implement \`flow_sinks(grid) -> list[list[tuple[int, int]]]\` returning, for every cell,
          the \`(row, col)\` of the sink its water reaches.

          \`\`\`
          grid = [[5, 4, 3],
                  [6, 1, 2],
                  [7, 8, 0]]
          flow_sinks(grid) == [[(1,1), (1,1), (2,2)],
                               [(1,1), (1,1), (2,2)],
                               [(1,1), (2,2), (2,2)]]
          \`\`\`
        `,
        hints: [
          "Each cell has exactly one 'next' cell (or none if it's a sink), so the flow forms a forest of trees pointing at sinks.",
          "Following the chain from every cell is O(n²) in the worst case (a long slide). Memoize the sink of every cell you visit.",
          "Use an explicit stack (or iterate along the path, then fill memo backwards) so a 300×300 spiral doesn't hit Python's recursion limit.",
        ],
        tests: [
          { call: "flow_sinks([[5,4,3],[6,1,2],[7,8,0]])", expect: "[[(1,1),(1,1),(2,2)],[(1,1),(1,1),(2,2)],[(1,1),(2,2),(2,2)]]" },
          { call: "flow_sinks([[1]])", expect: "[[(0,0)]]" },
          { call: "flow_sinks([[3,3,3]])", expect: "[[(0,0),(0,1),(0,2)]]" },
          { name: "tie-break: up, left, right, down", call: "flow_sinks([[9,1,9],[1,5,1],[9,1,9]])[1][1]", expect: "(0,1)" },
          { call: "flow_sinks([[1,2,3,4,5]])", expect: "[[(0,0),(0,0),(0,0),(0,0),(0,0)]]" },
          { name: "long winding slide (301x301) is fast", code: py`
              # One path of ~45,000 cells snakes through high walls down to (0, 0).
              # Following every cell's path from scratch is O(L^2): too slow.
              n, wall = 301, 10**9
              grid = [[wall] * n for _ in range(n)]
              h = 0
              for r in range(0, n, 2):
                  forward = (r // 2) % 2 == 0
                  for c in (range(n) if forward else range(n - 1, -1, -1)):
                      grid[r][c] = h
                      h += 1
                  if r + 2 < n:
                      grid[r + 1][n - 1 if forward else 0] = h
                      h += 1
              out = flow_sinks(grid)
              bad = [(r, c) for r in range(n) for c in range(n) if out[r][c] != (0, 0)]
              assert not bad, f"{len(bad)} cells don't drain to (0, 0), e.g. {bad[:3]}"
            ` },
        ],
      },
      {
        title: "Part 2 — basins",
        prompt: md`
          A **basin** is the set of cells that drain to the same sink. Implement
          \`basin_sizes(grid) -> list[int]\`: the size of every basin, **largest first**.
        `,
        hints: [
          "Reuse Part 1 and count how many cells map to each sink.",
          "`collections.Counter` over the flattened sink grid gives you the sizes directly.",
        ],
        tests: [
          { call: "basin_sizes([[5,4,3],[6,1,2],[7,8,0]])", expect: "[5, 4]" },
          { call: "basin_sizes([[1]])", expect: "[1]" },
          { call: "basin_sizes([[3,3,3]])", expect: "[1, 1, 1]" },
          { call: "basin_sizes([[0,5,0],[5,5,5],[0,5,0]])", expect: "[3, 2, 2, 1, 1]" },
        ],
      },
      {
        title: "Part 3 — how much water stays? (trapping rain water II)",
        prompt: md`
          Different question: after a heavy rain, water pools wherever it's surrounded by higher
          terrain; anything that can reach the border escapes. Implement
          \`trapped_water(grid) -> int\`: the total volume of water held.

          \`\`\`
          [[1,4,3,1,3,2],
           [3,2,1,3,2,4],
           [2,3,3,2,3,1]]   -> 4
          \`\`\`
        `,
        hints: [
          "The water level at a cell is decided by the lowest point of the 'wall' you'd cross to escape to the border.",
          "Start from all border cells in a min-heap. Repeatedly pop the lowest boundary cell and visit its unvisited neighbors.",
          "A neighbor lower than the current boundary height traps `boundary - height` water; push it with height `max(boundary, its height)`.",
        ],
        tests: [
          { call: "trapped_water([[1,4,3,1,3,2],[3,2,1,3,2,4],[2,3,3,2,3,1]])", expect: "4" },
          { call: "trapped_water([[3,3,3,3,3],[3,2,2,2,3],[3,2,1,2,3],[3,2,2,2,3],[3,3,3,3,3]])", expect: "10" },
          { call: "trapped_water([[1,2],[3,4]])", expect: "0" },
          { call: "trapped_water([[5]])", expect: "0" },
          { call: "trapped_water([[5,5,5],[5,1,5],[5,5,5]])", expect: "4" },
          { call: "trapped_water([[5,5,5],[5,1,3],[5,5,5]])", expect: "2" },
        ],
      },
    ],
    starter: py`
      def flow_sinks(grid: list[list[int]]) -> list[list[tuple[int, int]]]:
          pass


      def basin_sizes(grid: list[list[int]]) -> list[int]:
          pass


      def trapped_water(grid: list[list[int]]) -> int:
          pass
    `,
    solution: py`
      import heapq
      from collections import Counter

      DIRS = [(-1, 0), (0, -1), (0, 1), (1, 0)]  # up, left, right, down


      def flow_sinks(grid: list[list[int]]) -> list[list[tuple[int, int]]]:
          rows, cols = len(grid), len(grid[0])

          def step(r, c):
              best = None
              for dr, dc in DIRS:
                  nr, nc = r + dr, c + dc
                  if 0 <= nr < rows and 0 <= nc < cols and grid[nr][nc] < grid[r][c]:
                      if best is None or grid[nr][nc] < grid[best[0]][best[1]]:
                          best = (nr, nc)
              return best

          sink = [[None] * cols for _ in range(rows)]
          for r in range(rows):
              for c in range(cols):
                  path, cur = [], (r, c)
                  while sink[cur[0]][cur[1]] is None:
                      path.append(cur)
                      nxt = step(*cur)
                      if nxt is None:
                          sink[cur[0]][cur[1]] = cur
                          break
                      cur = nxt
                  end = sink[cur[0]][cur[1]]
                  for pr, pc in path:
                      sink[pr][pc] = end
          return sink


      def basin_sizes(grid: list[list[int]]) -> list[int]:
          counts = Counter(s for row in flow_sinks(grid) for s in row)
          return sorted(counts.values(), reverse=True)


      def trapped_water(grid: list[list[int]]) -> int:
          rows, cols = len(grid), len(grid[0])
          seen = [[False] * cols for _ in range(rows)]
          heap = []
          for r in range(rows):
              for c in range(cols):
                  if r in (0, rows - 1) or c in (0, cols - 1):
                      heapq.heappush(heap, (grid[r][c], r, c))
                      seen[r][c] = True
          total = 0
          while heap:
              level, r, c = heapq.heappop(heap)
              for dr, dc in DIRS:
                  nr, nc = r + dr, c + dc
                  if 0 <= nr < rows and 0 <= nc < cols and not seen[nr][nc]:
                      seen[nr][nc] = True
                      total += max(0, level - grid[nr][nc])
                      heapq.heappush(heap, (max(level, grid[nr][nc]), nr, nc))
          return total
    `,
    complexity: "Parts 1–2: O(R·C) with memoized paths. Part 3: O(R·C·log(R·C)) with a min-heap.",
    explanation: md`
      Flow gives each cell one outgoing edge, so the grid is a forest rooted at sinks; walking
      each path once and writing the answer back for every cell on it keeps the total work
      linear (and iterative, so no recursion limit). Trapped water is the classic
      "priority-flood": grow inward from the border, always from the lowest wall, so every
      cell's water level is the lowest wall height separating it from the outside.
    `,
  },

  // ------------------------------------------------------------------ 4
  {
    id: "chalk-point-in-time",
    title: "Point-in-Time Feature Store",
    difficulty: "Medium",
    topic: "Chalk-style (multi-part)",
    tags: ["design", "binary search", "bisect", "prefix sums"],
    timeLimitMin: 45,
    intro: md`
      Feature stores must answer "what was this value **as of** time t?". Using a later value
      when you build training data is *data leakage*. Build a small in-memory store. Timestamps
      are integers (seconds), and **writes can arrive out of order**.
    `,
    parts: [
      {
        title: "Part 1 — write and as-of reads",
        prompt: md`
          Implement \`FeatureStore\` with:
          - \`write(entity: str, feature: str, value, ts: int)\`
          - \`get(entity, feature, as_of: int | None = None)\`: the value with the greatest
            \`ts <= as_of\` (latest if \`as_of\` is None). \`None\` if there's no such value. If two
            writes share a timestamp, the later write wins.
        `,
        hints: [
          "Store a list of (ts, value) per (entity, feature) and keep it sorted by ts.",
          "`bisect.bisect_right` on the timestamps finds the first ts > as_of; the element before it is the answer.",
          "Keep timestamps and values in parallel lists so bisect works on plain ints; `bisect.insort`/`insert` handles out-of-order writes.",
        ],
        tests: [
          { name: "latest value", code: py`
              fs = FeatureStore()
              fs.write("u1", "balance", 100, ts=10)
              fs.write("u1", "balance", 150, ts=20)
              assert fs.get("u1", "balance") == 150, fs.get("u1", "balance")
            ` },
          { name: "as-of reads", code: py`
              fs = FeatureStore()
              fs.write("u1", "balance", 100, ts=10)
              fs.write("u1", "balance", 150, ts=20)
              cases = {5: None, 10: 100, 15: 100, 20: 150, 99: 150}
              for t, want in cases.items():
                  got = fs.get("u1", "balance", as_of=t)
                  assert got == want, f"as_of={t}: got {got}, expected {want}"
            ` },
          { name: "out-of-order writes", code: py`
              fs = FeatureStore()
              fs.write("u1", "x", "c", ts=30)
              fs.write("u1", "x", "a", ts=10)
              fs.write("u1", "x", "b", ts=20)
              got = [fs.get("u1", "x", as_of=t) for t in (10, 25, 35)]
              assert got == ["a", "b", "c"], got
            ` },
          { name: "entities and features are separate", code: py`
              fs = FeatureStore()
              fs.write("u1", "x", 1, ts=1)
              fs.write("u2", "x", 2, ts=1)
              fs.write("u1", "y", 3, ts=1)
              assert (fs.get("u1", "x"), fs.get("u2", "x"), fs.get("u1", "y")) == (1, 2, 3)
              assert fs.get("u3", "x") is None and fs.get("u1", "z") is None
            ` },
          { name: "same timestamp: later write wins", code: py`
              fs = FeatureStore()
              fs.write("u1", "x", "first", ts=5)
              fs.write("u1", "x", "second", ts=5)
              assert fs.get("u1", "x", as_of=5) == "second", fs.get("u1", "x", as_of=5)
            ` },
        ],
      },
      {
        title: "Part 2 — windowed aggregates",
        prompt: md`
          Numeric features often feed aggregates such as "sum of transaction amounts in the last hour".
          Implement:
          - \`window_sum(entity, feature, end: int, window: int)\`: sum of values with
            \`end - window < ts <= end\`
          - \`window_count(entity, feature, end, window)\`: number of such values

          They must be fast: the performance test does 20,000 writes then 20,000 queries.
        `,
        hints: [
          "With sorted timestamps, the window is a contiguous slice: two bisects find its ends.",
          "Summing the slice is O(k). Prefix sums make it O(1), but they must be rebuilt after out-of-order writes.",
          "Mark a series 'dirty' on write and rebuild its prefix sums lazily on the next query. Bursts of writes then cost one rebuild.",
        ],
        tests: [
          { name: "basic window", code: py`
              fs = FeatureStore()
              for ts, amt in [(1, 10), (5, 20), (10, 30), (11, 40)]:
                  fs.write("u1", "txn", amt, ts=ts)
              assert fs.window_sum("u1", "txn", end=10, window=10) == 60, fs.window_sum("u1", "txn", end=10, window=10)
              assert fs.window_sum("u1", "txn", end=10, window=5) == 30, "window is (end-window, end]: ts=5 excluded"
              assert fs.window_count("u1", "txn", end=11, window=100) == 4
              assert fs.window_sum("u1", "txn", end=0, window=5) == 0
            ` },
          { name: "unknown series is empty", code: py`
              fs = FeatureStore()
              assert fs.window_sum("nobody", "txn", end=10, window=10) == 0
              assert fs.window_count("nobody", "txn", end=10, window=10) == 0
            ` },
          { name: "writes interleaved with queries", code: py`
              fs = FeatureStore()
              fs.write("u", "t", 5, ts=100)
              assert fs.window_sum("u", "t", 100, 50) == 5
              fs.write("u", "t", 7, ts=60)
              assert fs.window_sum("u", "t", 100, 50) == 12, fs.window_sum("u", "t", 100, 50)
              fs.write("u", "t", 1, ts=40)
              assert fs.window_sum("u", "t", 100, 50) == 12
              assert fs.window_count("u", "t", 100, 61) == 3
            ` },
          { name: "performance: 20k writes, 20k queries", code: py`
              import random
              rnd = random.Random(7)
              fs = FeatureStore()
              stamps = list(range(20_000))
              rnd.shuffle(stamps)
              for t in stamps:
                  fs.write("u", "amt", t % 7, ts=t)
              total = 0
              for q in range(20_000):
                  total += fs.window_sum("u", "amt", end=q, window=1000)
              expect = 0
              pref = [0]
              for t in range(20_000):
                  pref.append(pref[-1] + t % 7)
              for q in range(20_000):
                  lo = max(0, q - 1000 + 1)
                  expect += pref[q + 1] - pref[lo]
              assert total == expect, f"got {total}, expected {expect}"
            ` },
        ],
      },
      {
        title: "Part 3 — point-in-time training rows",
        prompt: md`
          To build training data you have **label events** \`(entity, ts)\`. Implement
          \`training_rows(events, features) -> list[dict]\`. For each event in order, return
          \`{"entity": e, "ts": t, <feature>: value as of t, ...}\` (None when unknown).
        `,
        hints: [
          "This is just Part 1's `get` with `as_of=ts`, for each event × feature.",
          "For big inputs you could sort events by time and sweep, but the bisect version is O(E·F·log n), which is usually fine. Say so out loud in an interview.",
        ],
        tests: [
          { name: "no leakage from the future", code: py`
              fs = FeatureStore()
              fs.write("u1", "balance", 100, ts=10)
              fs.write("u1", "balance", 900, ts=50)
              fs.write("u1", "country", "US", ts=1)
              fs.write("u2", "balance", 5, ts=30)
              rows = fs.training_rows([("u1", 20), ("u2", 20), ("u1", 60)], ["balance", "country"])
              assert rows == [
                  {"entity": "u1", "ts": 20, "balance": 100, "country": "US"},
                  {"entity": "u2", "ts": 20, "balance": None, "country": None},
                  {"entity": "u1", "ts": 60, "balance": 900, "country": "US"},
              ], rows
            ` },
          { name: "empty events", code: py`
              fs = FeatureStore()
              assert fs.training_rows([], ["x"]) == []
            ` },
          { name: "event exactly at write time sees the write", code: py`
              fs = FeatureStore()
              fs.write("u", "x", 1, ts=10)
              assert fs.training_rows([("u", 10)], ["x"]) == [{"entity": "u", "ts": 10, "x": 1}]
            ` },
        ],
      },
      {
        title: "Part 4 — staleness",
        prompt: md`
          Old values can be worse than no value. Add an optional \`max_age\` to \`get\`:
          \`get(entity, feature, as_of=None, max_age=None)\`. If the found value's timestamp is
          older than \`as_of - max_age\` (i.e. \`as_of - ts > max_age\`), return \`None\`. When
          \`as_of\` is None, measure age from the **latest timestamp written to any feature** in the store.
        `,
        hints: [
          "You already find the matching timestamp in `get`. Compare it to `as_of` before returning.",
          "Track a store-wide `self.now = max(self.now, ts)` on each write for the `as_of=None` case.",
        ],
        tests: [
          { name: "fresh vs stale", code: py`
              fs = FeatureStore()
              fs.write("u", "x", 1, ts=100)
              assert fs.get("u", "x", as_of=110, max_age=10) == 1
              assert fs.get("u", "x", as_of=111, max_age=10) is None
              assert fs.get("u", "x", as_of=111) == 1, "no max_age means no staleness check"
            ` },
          { name: "as_of=None uses the store's latest timestamp", code: py`
              fs = FeatureStore()
              fs.write("u", "x", 1, ts=100)
              fs.write("v", "y", 2, ts=500)
              assert fs.get("u", "x", max_age=1000) == 1
              assert fs.get("u", "x", max_age=399) is None
            ` },
        ],
      },
    ],
    starter: py`
      class FeatureStore:
          def __init__(self):
              pass

          def write(self, entity: str, feature: str, value, ts: int) -> None:
              pass

          def get(self, entity: str, feature: str, as_of: int | None = None, max_age: int | None = None):
              pass

          def window_sum(self, entity: str, feature: str, end: int, window: int):
              pass

          def window_count(self, entity: str, feature: str, end: int, window: int) -> int:
              pass

          def training_rows(self, events: list[tuple[str, int]], features: list[str]) -> list[dict]:
              pass
    `,
    solution: py`
      import bisect
      from collections import defaultdict


      class _Series:
          __slots__ = ("ts", "vals", "prefix", "dirty")

          def __init__(self):
              self.ts, self.vals, self.prefix, self.dirty = [], [], [0], False


      class FeatureStore:
          def __init__(self):
              self.series = defaultdict(_Series)
              self.now = None

          def write(self, entity, feature, value, ts):
              s = self.series[(entity, feature)]
              i = bisect.bisect_right(s.ts, ts)  # after equal stamps: later write wins
              s.ts.insert(i, ts)
              s.vals.insert(i, value)
              s.dirty = True
              self.now = ts if self.now is None else max(self.now, ts)

          def get(self, entity, feature, as_of=None, max_age=None):
              s = self.series.get((entity, feature))
              if not s or not s.ts:
                  return None
              if as_of is None:
                  i = len(s.ts) - 1
                  ref = self.now
              else:
                  i = bisect.bisect_right(s.ts, as_of) - 1
                  ref = as_of
              if i < 0:
                  return None
              if max_age is not None and ref - s.ts[i] > max_age:
                  return None
              return s.vals[i]

          def _bounds(self, entity, feature, end, window):
              s = self.series.get((entity, feature))
              if not s:
                  return None, 0, 0
              if s.dirty:
                  p = [0]
                  for v in s.vals:
                      p.append(p[-1] + v)
                  s.prefix, s.dirty = p, False
              lo = bisect.bisect_right(s.ts, end - window)
              hi = bisect.bisect_right(s.ts, end)
              return s, lo, hi

          def window_sum(self, entity, feature, end, window):
              s, lo, hi = self._bounds(entity, feature, end, window)
              return s.prefix[hi] - s.prefix[lo] if s else 0

          def window_count(self, entity, feature, end, window):
              s, lo, hi = self._bounds(entity, feature, end, window)
              return max(0, hi - lo)

          def training_rows(self, events, features):
              rows = []
              for entity, ts in events:
                  row = {"entity": entity, "ts": ts}
                  for f in features:
                      row[f] = self.get(entity, f, as_of=ts)
                  rows.append(row)
              return rows
    `,
    complexity: "write: O(n) worst case (list insert; amortized fast for in-order writes). get / window queries: O(log n), plus O(n) prefix rebuild after writes.",
    explanation: md`
      Every question here is "find a position in a time-sorted list", which is \`bisect\`. Using
      \`bisect_right\` both for writes (equal stamps go after, so the later write wins) and for
      reads (index − 1 is the last \`ts <= as_of\`) keeps the semantics consistent. Windowed sums
      become O(1) with prefix sums rebuilt lazily. Mention the alternative designs: a sorted
      container or a balanced tree for heavy out-of-order writes, and a time-sorted sweep for
      big training-set joins.
    `,
  },

  // ------------------------------------------------------------------ 5
  {
    id: "chalk-expression-eval",
    title: "Feature Expression Evaluator",
    difficulty: "Hard",
    topic: "Chalk-style (multi-part)",
    tags: ["parsing", "recursion", "stack", "strings"],
    timeLimitMin: 45,
    intro: md`
      Feature platforms let users define derived features with small expressions, such as
      \`amount * fx_rate - fee\`. Build an evaluator **without** using \`eval\`/\`ast\`.
      Numbers are non-negative integers or decimals; variable names are \`[A-Za-z_][A-Za-z0-9_]*\`.
      Whitespace may appear anywhere between tokens.
    `,
    parts: [
      {
        title: "Part 1 — tokenize",
        prompt: md`
          Implement \`tokenize(expr) -> list[str]\` splitting the expression into numbers, names,
          and the single-character operators \`+ - * / ( ) ,\`. Raise \`ValueError\` on any other character.

          \`\`\`python
          tokenize("price*qty + 2.5")   # ['price', '*', 'qty', '+', '2.5']
          \`\`\`
        `,
        hints: [
          "Walk the string with an index. Skip spaces; for a digit, consume while digit-or-dot; for a letter/underscore, consume while alphanumeric-or-underscore.",
          "A regex with alternation, e.g. `\\d+(?:\\.\\d+)?|[A-Za-z_]\\w*|[-+*/(),]|\\S`, can also do it. Then reject any leftover `\\S` matches.",
        ],
        tests: [
          { call: "tokenize('price*qty + 2.5')", expect: "['price', '*', 'qty', '+', '2.5']" },
          { call: "tokenize('  max(a_1,  b) ')", expect: "['max', '(', 'a_1', ',', 'b', ')']" },
          { call: "tokenize('')", expect: "[]" },
          { call: "tokenize('-(x)/10')", expect: "['-', '(', 'x', ')', '/', '10']" },
          { name: "bad character raises ValueError", code: py`
              try:
                  tokenize("a $ b")
              except ValueError:
                  pass
              else:
                  raise AssertionError("expected ValueError")
            ` },
        ],
      },
      {
        title: "Part 2 — evaluate with precedence",
        prompt: md`
          Implement \`evaluate(expr, env: dict[str, float]) -> float\` supporting \`+ - * /\`,
          parentheses, unary minus, and the usual precedence (\`*\` and \`/\` bind tighter;
          operators are left-associative). Unknown variables raise \`KeyError\`; malformed
          expressions raise \`ValueError\`.
        `,
        hints: [
          "Recursive descent with one function per precedence level: expr := term (('+'|'-') term)*, term := factor (('*'|'/') factor)*, factor := NUMBER | NAME | '(' expr ')' | '-' factor.",
          "Keep a position index into the token list. A helper `peek()` / `take(expected=None)` keeps the code tidy.",
          "After parsing the top-level expr, if tokens remain, the input was malformed (e.g. `1 2`).",
        ],
        tests: [
          { call: "evaluate('1 + 2 * 3', {})", expect: "7", cmp: "float" },
          { call: "evaluate('(1 + 2) * 3', {})", expect: "9", cmp: "float" },
          { call: "evaluate('10 - 4 - 3', {})", expect: "3", cmp: "float" },
          { call: "evaluate('8 / 4 / 2', {})", expect: "1", cmp: "float" },
          { call: "evaluate('amount * fx_rate - fee', {'amount': 100, 'fx_rate': 1.1, 'fee': 2.5})", expect: "107.5", cmp: "float" },
          { call: "evaluate('-x + -(2 * -3)', {'x': 4})", expect: "2", cmp: "float" },
          { name: "errors", code: py`
              for bad in ["1 +", "(1 + 2", "1 2", "* 3", ""]:
                  try:
                      evaluate(bad, {})
                  except ValueError:
                      continue
                  raise AssertionError(f"evaluate({bad!r}) should raise ValueError")
              try:
                  evaluate("a + 1", {})
              except KeyError:
                  pass
              else:
                  raise AssertionError("unknown variable should raise KeyError")
            ` },
        ],
      },
      {
        title: "Part 3 — dependencies",
        prompt: md`
          To schedule computation we need to know what an expression reads. Implement
          \`dependencies(expr) -> set[str]\`: the variable names referenced (not function names; see Part 4).
        `,
        hints: [
          "Parse once into a tree (tuples like `('+', left, right)`, `('var', name)`, `('num', 1.0)`), then both evaluate and dependencies are small recursive walks.",
          "If you'd rather not build a tree, collect NAME tokens that aren't immediately followed by `(`.",
        ],
        tests: [
          { call: "dependencies('amount * fx_rate - fee')", expect: "{'amount', 'fx_rate', 'fee'}" },
          { call: "dependencies('1 + 2')", expect: "set()" },
          { call: "dependencies('x * x + y')", expect: "{'x', 'y'}" },
          { call: "dependencies('max(a, min(b, 3))')", expect: "{'a', 'b'}" },
        ],
      },
      {
        title: "Part 4 — functions",
        prompt: md`
          Support calls to built-in functions with any number of comma-separated arguments:
          \`max\`, \`min\`, \`abs\`, and \`coalesce\` (first argument that isn't \`None\`). Environment
          values may be \`None\`; only \`coalesce\` needs to handle them. Unknown functions raise \`ValueError\`.

          \`\`\`python
          evaluate("max(a, b * 2, 3)", {"a": 1, "b": 4})            # 8
          evaluate("coalesce(discount, 0) + 1", {"discount": None})  # 1
          \`\`\`
        `,
        hints: [
          "In `factor`, a NAME followed by `(` is a call: parse comma-separated `expr`s until `)`.",
          "Map names to Python callables: `{'max': max, 'min': min, 'abs': abs, 'coalesce': lambda *a: next((x for x in a if x is not None), None)}`.",
        ],
        tests: [
          { call: "evaluate('max(a, b * 2, 3)', {'a': 1, 'b': 4})", expect: "8", cmp: "float" },
          { call: "evaluate('min(5, max(1, 2)) + abs(-3)', {})", expect: "5", cmp: "float" },
          { call: "evaluate('coalesce(discount, 0) + 1', {'discount': None})", expect: "1", cmp: "float" },
          { call: "evaluate('coalesce(a, b, 9)', {'a': None, 'b': 2})", expect: "2", cmp: "float" },
          { name: "unknown function raises ValueError", code: py`
              try:
                  evaluate("sqrt(4)", {})
              except ValueError:
                  pass
              else:
                  raise AssertionError("expected ValueError")
            ` },
        ],
      },
    ],
    starter: py`
      def tokenize(expr: str) -> list[str]:
          pass


      def evaluate(expr: str, env: dict[str, float]) -> float:
          pass


      def dependencies(expr: str) -> set[str]:
          pass
    `,
    solution: py`
      import operator
      import re

      OPS = {"+": operator.add, "-": operator.sub, "*": operator.mul, "/": operator.truediv}
      TOKEN = re.compile(r"\s*(?:(\d+(?:\.\d*)?|\.\d+)|([A-Za-z_]\w*)|([-+*/(),]))")
      FUNCS = {
          "max": max,
          "min": min,
          "abs": abs,
          "coalesce": lambda *a: next((x for x in a if x is not None), None),
      }


      def tokenize(expr: str) -> list[str]:
          tokens, i = [], 0
          while i < len(expr):
              if expr[i].isspace():
                  i += 1
                  continue
              m = TOKEN.match(expr, i)
              if not m:
                  raise ValueError(f"unexpected character {expr[i]!r} at {i}")
              tokens.append(m.group(m.lastindex))
              i = m.end()
          return tokens


      def parse(expr: str):
          toks = tokenize(expr)
          pos = 0

          def peek():
              return toks[pos] if pos < len(toks) else None

          def take(expected=None):
              nonlocal pos
              tok = peek()
              if tok is None or (expected is not None and tok != expected):
                  raise ValueError(f"expected {expected or 'a token'}, got {tok!r}")
              pos += 1
              return tok

          def expression():
              node = term()
              while peek() in ("+", "-"):
                  node = (take(), node, term())
              return node

          def term():
              node = factor()
              while peek() in ("*", "/"):
                  node = (take(), node, factor())
              return node

          def factor():
              tok = take()
              if tok == "-":
                  return ("neg", factor())
              if tok == "(":
                  node = expression()
                  take(")")
                  return node
              if tok[0].isdigit() or tok[0] == ".":
                  return ("num", float(tok))
              if tok[0].isalpha() or tok[0] == "_":
                  if peek() == "(":
                      take("(")
                      args = []
                      if peek() != ")":
                          args.append(expression())
                          while peek() == ",":
                              take(",")
                              args.append(expression())
                      take(")")
                      if tok not in FUNCS:
                          raise ValueError(f"unknown function {tok}")
                      return ("call", tok, args)
                  return ("var", tok)
              raise ValueError(f"unexpected token {tok!r}")

          tree = expression()
          if peek() is not None:
              raise ValueError(f"unexpected trailing token {peek()!r}")
          return tree


      def _eval(node, env):
          kind = node[0]
          if kind == "num":
              return node[1]
          if kind == "var":
              return env[node[1]]
          if kind == "neg":
              return -_eval(node[1], env)
          if kind == "call":
              return FUNCS[node[1]](*[_eval(a, env) for a in node[2]])
          return OPS[kind](_eval(node[1], env), _eval(node[2], env))


      def evaluate(expr: str, env: dict[str, float]) -> float:
          pass


      def dependencies(expr: str) -> set[str]:
          pass
    `,
    solution: py`
      import operator
      import re

      OPS = {"+": operator.add, "-": operator.sub, "*": operator.mul, "/": operator.truediv}
      TOKEN = re.compile(r"\s*(?:(\d+(?:\.\d*)?|\.\d+)|([A-Za-z_]\w*)|([-+*/(),]))")
      FUNCS = {
          "max": max,
          "min": min,
          "abs": abs,
          "coalesce": lambda *a: next((x for x in a if x is not None), None),
      }


      def tokenize(expr: str) -> list[str]:
          tokens, i = [], 0
          while i < len(expr):
              if expr[i].isspace():
                  i += 1
                  continue
              m = TOKEN.match(expr, i)
              if not m:
                  raise ValueError(f"unexpected character {expr[i]!r} at {i}")
              tokens.append(m.group(m.lastindex))
              i = m.end()
          return tokens


      def parse(expr: str):
          toks = tokenize(expr)
          pos = 0

          def peek():
              return toks[pos] if pos < len(toks) else None

          def take(expected=None):
              nonlocal pos
              tok = peek()
              if tok is None or (expected is not None and tok != expected):
                  raise ValueError(f"expected {expected or 'a token'}, got {tok!r}")
              pos += 1
              return tok

          def expression():
              node = term()
              while peek() in ("+", "-"):
                  node = (take(), node, term())
              return node

          def term():
              node = factor()
              while peek() in ("*", "/"):
                  node = (take(), node, factor())
              return node

          def factor():
              tok = take()
              if tok == "-":
                  return ("neg", factor())
              if tok == "(":
                  node = expression()
                  take(")")
                  return node
              if tok[0].isdigit() or tok[0] == ".":
                  return ("num", float(tok))
              if tok[0].isalpha() or tok[0] == "_":
                  if peek() == "(":
                      take("(")
                      args = []
                      if peek() != ")":
                          args.append(expression())
                          while peek() == ",":
                              take(",")
                              args.append(expression())
                      take(")")
                      if tok not in FUNCS:
                          raise ValueError(f"unknown function {tok}")
                      return ("call", tok, args)
                  return ("var", tok)
              raise ValueError(f"unexpected token {tok!r}")

          tree = expression()
          if peek() is not None:
              raise ValueError(f"unexpected trailing token {peek()!r}")
          return tree


      def _eval(node, env):
          kind = node[0]
          if kind == "num":
              return node[1]
          if kind == "var":
              return env[node[1]]
          if kind == "neg":
              return -_eval(node[1], env)
          if kind == "call":
              return FUNCS[node[1]](*[_eval(a, env) for a in node[2]])
          a, b = _eval(node[1], env), _eval(node[2], env)
          return {"+": a + b if True else 0, "-": None, "*": None, "/": None}[kind] if kind == "+" else \
              a - b if kind == "-" else a * b if kind == "*" else a / b


      def evaluate(expr: str, env: dict[str, float]) -> float:
          return _eval(parse(expr), env)


      def _deps(node, out):
          if node[0] == "var":
              out.add(node[1])
          elif node[0] == "call":
              for a in node[2]:
                  _deps(a, out)
          elif node[0] in ("+", "-", "*", "/"):
              _deps(node[1], out)
              _deps(node[2], out)
          elif node[0] == "neg":
              _deps(node[1], out)
          return out


      def dependencies(expr: str) -> set[str]:
          return _deps(parse(expr), set())
    `,
    complexity: "O(n) in the length of the expression: one pass to tokenize, one recursive-descent pass to parse, one walk to evaluate.",
    explanation: md`
      **Recursive descent**: each precedence level gets a function that calls the next-tighter
      level, so precedence and left-associativity fall out of the call structure. Parsing into a
      small tree (tuples) instead of evaluating on the fly pays off in Part 3: dependency
      extraction is just a different walk of the same tree, and so are type checking or
      constant folding if your interviewer asks.
    `,
  },

  // ------------------------------------------------------------------ 6
  {
    id: "chalk-kv-transactions",
    title: "In-Memory Database with Transactions",
    difficulty: "Medium",
    topic: "Chalk-style (multi-part)",
    tags: ["design", "hash map", "stack"],
    timeLimitMin: 45,
    intro: md`
      A classic practical round: build an in-memory key-value database, then keep extending it.
      Keys and values are strings.
    `,
    parts: [
      {
        title: "Part 1 — set / get / delete / count",
        prompt: md`
          Implement \`Database\` with:
          - \`set(key, value)\`, \`get(key) -> str | None\`, \`delete(key)\` (no-op if missing)
          - \`count(value) -> int\`: how many keys currently hold \`value\`, in **O(1)**.
        `,
        hints: [
          "Keep a second dict: value → number of keys holding it. Update it on every set/delete.",
          "On `set`, if the key already had a value, decrement the old value's count first.",
        ],
        tests: [
          { name: "basic ops", code: py`
              db = Database()
              db.set("a", "10")
              assert db.get("a") == "10"
              assert db.get("b") is None
              db.delete("a")
              assert db.get("a") is None
              db.delete("missing")  # no error
            ` },
          { name: "count", code: py`
              db = Database()
              db.set("a", "x"); db.set("b", "x"); db.set("c", "y")
              assert db.count("x") == 2, db.count("x")
              db.set("a", "y")
              assert (db.count("x"), db.count("y")) == (1, 2), (db.count("x"), db.count("y"))
              db.delete("b")
              assert db.count("x") == 0
              assert db.count("never") == 0
            ` },
          { name: "overwrite same value keeps count", code: py`
              db = Database()
              db.set("a", "x"); db.set("a", "x")
              assert db.count("x") == 1, db.count("x")
            ` },
        ],
      },
      {
        title: "Part 2 — nested transactions",
        prompt: md`
          Add \`begin()\`, \`rollback() -> bool\`, \`commit() -> bool\`:
          - \`begin\` opens a (possibly nested) transaction.
          - \`rollback\` undoes all changes in the **innermost** open transaction. Returns False if none is open.
          - \`commit\` makes **all** open transactions permanent and closes them. Returns False if none is open.
          - \`get\` and \`count\` always reflect the current in-transaction state.
        `,
        hints: [
          "Undo log: a stack of transactions, each a list (or dict) of `key -> previous value` recorded the first time the key is touched in that transaction.",
          "Rollback replays the innermost undo entries through your normal set/delete so `count` stays right.",
          "Commit just throws away the whole stack. The changes were already applied.",
        ],
        tests: [
          { name: "rollback", code: py`
              db = Database()
              db.set("a", "1")
              db.begin()
              db.set("a", "2"); db.set("b", "9"); db.delete("a")
              assert db.get("a") is None
              assert db.rollback() is True
              assert db.get("a") == "1" and db.get("b") is None, (db.get("a"), db.get("b"))
              assert db.count("1") == 1 and db.count("9") == 0
            ` },
          { name: "nested rollback only undoes innermost", code: py`
              db = Database()
              db.begin(); db.set("a", "1")
              db.begin(); db.set("a", "2")
              assert db.get("a") == "2"
              db.rollback()
              assert db.get("a") == "1", db.get("a")
              db.rollback()
              assert db.get("a") is None
              assert db.rollback() is False
            ` },
          { name: "commit closes everything", code: py`
              db = Database()
              db.begin(); db.set("a", "1")
              db.begin(); db.set("b", "2")
              assert db.commit() is True
              assert db.rollback() is False, "no transaction should be open after commit"
              assert (db.get("a"), db.get("b")) == ("1", "2")
              assert db.commit() is False
            ` },
          { name: "count inside transactions", code: py`
              db = Database()
              db.set("a", "x")
              db.begin(); db.set("b", "x")
              assert db.count("x") == 2
              db.begin(); db.set("a", "y")
              assert db.count("x") == 1
              db.rollback()
              assert db.count("x") == 2
              db.rollback()
              assert db.count("x") == 1 and db.count("y") == 0
            ` },
        ],
      },
      {
        title: "Part 3 — key history (time travel)",
        prompt: md`
          Every committed write gets a version number (1, 2, 3, ...). A write outside a
          transaction commits immediately. At \`commit\`, each key changed inside the (surviving)
          transactions gets one new version holding its final value, in the order the keys were
          first written. Add:
          - \`version() -> int\`: the latest committed version (0 initially)
          - \`get_at(key, version) -> str | None\`: the committed value of \`key\` as of that version (deletes count as None).
        `,
        hints: [
          "Keep, per key, a list of (version, value) appended at commit time. `get_at` is then a bisect.",
          "Your undo logs already list the keys each open transaction touched, in first-touch order. At commit, stamp each of those keys with the next version and its current value.",
        ],
        tests: [
          { name: "versions outside transactions", code: py`
              db = Database()
              assert db.version() == 0
              db.set("a", "1"); db.set("a", "2"); db.delete("a")
              assert db.version() == 3, db.version()
              assert [db.get_at("a", v) for v in range(4)] == [None, "1", "2", None]
            ` },
          { name: "transactions stamp at commit", code: py`
              db = Database()
              db.set("a", "1")             # v1
              db.begin()
              db.set("a", "2"); db.set("b", "x"); db.set("a", "3")
              assert db.version() == 1, "nothing committed yet"
              db.commit()                  # a -> v2, b -> v3
              assert db.version() == 3, db.version()
              assert db.get_at("a", 1) == "1" and db.get_at("a", 2) == "3"
              assert db.get_at("b", 2) is None and db.get_at("b", 3) == "x"
            ` },
          { name: "rolled-back writes leave no history", code: py`
              db = Database()
              db.begin(); db.set("a", "1"); db.rollback()
              assert db.version() == 0
              assert db.get_at("a", 5) is None
            ` },
        ],
      },
    ],
    starter: py`
      class Database:
          def __init__(self):
              pass

          def set(self, key: str, value: str) -> None:
              pass

          def get(self, key: str) -> str | None:
              pass

          def delete(self, key: str) -> None:
              pass

          def count(self, value: str) -> int:
              pass

          def begin(self) -> None:
              pass

          def rollback(self) -> bool:
              pass

          def commit(self) -> bool:
              pass

          def version(self) -> int:
              pass

          def get_at(self, key: str, version: int) -> str | None:
              pass
    `,
    solution: py`
      import bisect
      from collections import defaultdict

      _ABSENT = object()


      class Database:
          def __init__(self):
              self.data = {}
              self.counts = defaultdict(int)
              self.txns = []                  # stack of {key: previous value}, first-touch order
              self.ver = 0
              self.history = defaultdict(lambda: ([0], [None]))  # key -> (versions, values)

          def _write(self, key, value):
              old = self.data.get(key, _ABSENT)
              if old is not _ABSENT:
                  self.counts[old] -= 1
              if value is _ABSENT:
                  self.data.pop(key, None)
              else:
                  self.data[key] = value
                  self.counts[value] += 1

          def _change(self, key, value):
              if self.txns:
                  self.txns[-1].setdefault(key, self.data.get(key, _ABSENT))
                  self._write(key, value)
              else:
                  self._write(key, value)
                  self._stamp([key])

          def _stamp(self, keys):
              for key in keys:
                  self.ver += 1
                  versions, values = self.history[key]
                  versions.append(self.ver)
                  values.append(self.data.get(key))

          def set(self, key, value):
              self._change(key, value)

          def get(self, key):
              return self.data.get(key)

          def delete(self, key):
              self._change(key, _ABSENT)

          def count(self, value):
              return self.counts.get(value, 0)

          def begin(self):
              self.txns.append({})

          def rollback(self):
              if not self.txns:
                  return False
              for key, prev in self.txns.pop().items():
                  self._write(key, prev)
              return True

          def commit(self):
              if not self.txns:
                  return False
              keys = list(dict.fromkeys(k for txn in self.txns for k in txn))
              self.txns = []
              self._stamp(keys)
              return True

          def version(self):
              return self.ver

          def get_at(self, key, version):
              if key not in self.history:
                  return None
              versions, values = self.history[key]
              return values[bisect.bisect_right(versions, version) - 1]
    `,
    complexity: "All operations O(1) amortized except rollback O(keys touched) and get_at O(log versions).",
    explanation: md`
      A reverse-index dict makes \`count\` O(1). Transactions use an **undo log** per nesting
      level: record a key's previous value the first time it changes in that level, and on
      rollback write those values back through the same path that maintains counts. Commit only
      drops the logs. History is append-only per key, so \`get_at\` is a bisect over version numbers.
    `,
  },
];
