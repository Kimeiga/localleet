import { py, md } from "./_util.js";

// Builds an assert-style test for "Lowest Common Ancestor of a BST".
function lcaTest(tree, p, q, expected) {
  return {
    name: `tree=${JSON.stringify(tree).replace(/null/g, "None")}, p=${p}, q=${q}`,
    code: [
      "def find(node, v):",
      "    while node is not None and node.val != v:",
      "        node = node.left if v < node.val else node.right",
      "    return node",
      `root = build_tree(${JSON.stringify(tree).replace(/null/g, "None")})`,
      `p, q = find(root, ${p}), find(root, ${q})`,
      "got = lowest_common_ancestor(root, p, q)",
      `want = find(root, ${expected})`,
      `assert got is want, f"expected the node with value ${expected}, got {got.val if isinstance(got, TreeNode) else got!r}"`,
    ].join("\n"),
  };
}

export default [
  // ------------------------------------------------------------ Arrays & Hashing
  {
    id: "two-sum",
    title: "Two Sum",
    difficulty: "Easy",
    topic: "Arrays & Hashing",
    tags: ["hash map", "array"],
    prompt: md`
      Given a list of integers \`nums\` and an integer \`target\`, return the **indices** of the two numbers that add up to \`target\`.

      Each input has exactly one solution, and you may not use the same element twice. You can return the two indices in any order.

      **Example 1**
      \`\`\`
      Input: nums = [2,7,11,15], target = 9
      Output: [0, 1]
      Explanation: nums[0] + nums[1] == 9
      \`\`\`

      **Example 2**
      \`\`\`
      Input: nums = [3,2,4], target = 6
      Output: [1, 2]
      \`\`\`

      **Constraints:**
      - \`2 <= len(nums) <= 10^5\`
      - \`-10^9 <= nums[i], target <= 10^9\`
      - Exactly one valid answer exists.

      **Follow-up:** can you do better than O(n²)?
    `,
    starter: py`
      def two_sum(nums: list[int], target: int) -> list[int]:
          pass
    `,
    tests: [
      { call: "two_sum([2, 7, 11, 15], 9)", expect: "[0, 1]", cmp: "sorted" },
      { call: "two_sum([3, 2, 4], 6)", expect: "[1, 2]", cmp: "sorted" },
      { call: "two_sum([3, 3], 6)", expect: "[0, 1]", cmp: "sorted" },
      { call: "two_sum([-3, 4, 3, 90], 0)", expect: "[0, 2]", cmp: "sorted" },
      { call: "two_sum([0, 4, 3, 0], 0)", expect: "[0, 3]", cmp: "sorted" },
      { call: "two_sum([-1, -2, -3, -4, -5], -8)", expect: "[2, 4]", cmp: "sorted" },
      { call: "two_sum(list(range(1, 30001)), 59999)", expect: "[29998, 29999]", cmp: "sorted" },
    ],
    hints: [
      "For each number, you know exactly which other value would complete the pair.",
      "Instead of searching the rest of the list for that complement, remember what you've already seen in a hash map.",
      "Walk the list once. For each value x at index i, check whether target - x is already in a dict of value -> index; if so return both indices, otherwise store x -> i.",
    ],
    solution: py`
      def two_sum(nums: list[int], target: int) -> list[int]:
          seen: dict[int, int] = {}
          for i, x in enumerate(nums):
              if target - x in seen:
                  return [seen[target - x], i]
              seen[x] = i
          return []
    `,
    complexity: "O(n) time, O(n) space",
    explanation: md`
      For every element the needed partner is fully determined: \`target - x\`. A dictionary mapping values to indices lets us check in O(1) whether that partner appeared earlier. Because we only look backwards, we never pair an element with itself, and the first time the second element of the pair is reached we return immediately.
    `,
  },
  {
    id: "contains-duplicate",
    title: "Contains Duplicate",
    difficulty: "Easy",
    topic: "Arrays & Hashing",
    tags: ["hash set", "array"],
    prompt: md`
      Given a list of integers \`nums\`, return \`True\` if any value appears **at least twice**, and \`False\` if every element is distinct.

      **Example 1**
      \`\`\`
      Input: nums = [1,2,3,1]
      Output: True
      \`\`\`

      **Example 2**
      \`\`\`
      Input: nums = [1,2,3,4]
      Output: False
      \`\`\`

      **Constraints:**
      - \`0 <= len(nums) <= 10^5\`
      - \`-10^9 <= nums[i] <= 10^9\`
    `,
    starter: py`
      def contains_duplicate(nums: list[int]) -> bool:
          pass
    `,
    tests: [
      { call: "contains_duplicate([1, 2, 3, 1])", expect: "True" },
      { call: "contains_duplicate([1, 2, 3, 4])", expect: "False" },
      { call: "contains_duplicate([])", expect: "False" },
      { call: "contains_duplicate([7])", expect: "False" },
      { call: "contains_duplicate([1, 1, 1, 3, 3, 4, 3, 2, 4, 2])", expect: "True" },
      { call: "contains_duplicate([-1, -2, -3, -1])", expect: "True" },
      { call: "contains_duplicate(list(range(100000)))", expect: "False" },
      { call: "contains_duplicate(list(range(50000)) + [49999])", expect: "True" },
    ],
    hints: [
      "Comparing every pair works but is quadratic. What data structure answers 'have I seen this before?' quickly?",
      "A hash set gives O(1) average membership checks.",
      "Iterate through the numbers, returning True as soon as one is already in the set; otherwise add it. If the loop finishes, return False. (Comparing the length of the list with the length of its set also works.)",
    ],
    solution: py`
      def contains_duplicate(nums: list[int]) -> bool:
          seen: set[int] = set()
          for x in nums:
              if x in seen:
                  return True
              seen.add(x)
          return False
    `,
    complexity: "O(n) time, O(n) space",
    explanation: md`
      A set stores each value we've passed. If the current value is already in the set, it must have appeared earlier, so there is a duplicate. Set membership is O(1) on average, so one pass suffices and we can stop early on the first repeat.
    `,
  },
  {
    id: "valid-anagram",
    title: "Valid Anagram",
    difficulty: "Easy",
    topic: "Arrays & Hashing",
    tags: ["hash map", "string", "counting"],
    prompt: md`
      Given two strings \`s\` and \`t\`, return \`True\` if \`t\` is an anagram of \`s\`, and \`False\` otherwise.

      An **anagram** uses exactly the same letters with exactly the same counts, possibly in a different order.

      **Example 1**
      \`\`\`
      Input: s = "anagram", t = "nagaram"
      Output: True
      \`\`\`

      **Example 2**
      \`\`\`
      Input: s = "rat", t = "car"
      Output: False
      \`\`\`

      **Constraints:**
      - \`0 <= len(s), len(t) <= 5 * 10^4\`
      - \`s\` and \`t\` consist of lowercase English letters.
    `,
    starter: py`
      def is_anagram(s: str, t: str) -> bool:
          pass
    `,
    tests: [
      { call: 'is_anagram("anagram", "nagaram")', expect: "True" },
      { call: 'is_anagram("rat", "car")', expect: "False" },
      { call: 'is_anagram("", "")', expect: "True" },
      { call: 'is_anagram("a", "ab")', expect: "False" },
      { call: 'is_anagram("aacc", "ccac")', expect: "False" },
      { call: 'is_anagram("listen", "silent")', expect: "True" },
      { call: 'is_anagram("ab" * 20000, "ba" * 20000)', expect: "True" },
    ],
    hints: [
      "Two strings are anagrams exactly when every letter occurs the same number of times in both.",
      "Count letter frequencies with a dictionary (or a fixed array of 26 counters).",
      "If the lengths differ, return False. Otherwise increment counts for s and decrement for t; the strings are anagrams iff every count ends at zero. Sorting both strings and comparing also works in O(n log n).",
    ],
    solution: py`
      def is_anagram(s: str, t: str) -> bool:
          if len(s) != len(t):
              return False
          counts: dict[str, int] = {}
          for a, b in zip(s, t):
              counts[a] = counts.get(a, 0) + 1
              counts[b] = counts.get(b, 0) - 1
          return all(c == 0 for c in counts.values())
    `,
    complexity: "O(n) time, O(1) space (at most 26 distinct keys)",
    explanation: md`
      Anagrams are exactly the strings with identical letter multisets. We add one for each letter of \`s\` and subtract one for each letter of \`t\`; if every counter returns to zero, each letter appeared equally often in both. Checking lengths first lets us walk both strings in lockstep.
    `,
  },
  {
    id: "group-anagrams",
    title: "Group Anagrams",
    difficulty: "Medium",
    topic: "Arrays & Hashing",
    tags: ["hash map", "string", "sorting"],
    prompt: md`
      Given a list of strings \`strs\`, group the anagrams together. Return a list of groups; the groups and the strings inside each group may be in **any order**.

      **Example 1**
      \`\`\`
      Input: strs = ["eat","tea","tan","ate","nat","bat"]
      Output: [["bat"],["nat","tan"],["ate","eat","tea"]]
      \`\`\`

      **Example 2**
      \`\`\`
      Input: strs = [""]
      Output: [[""]]
      \`\`\`

      **Constraints:**
      - \`0 <= len(strs) <= 10^4\`
      - \`0 <= len(strs[i]) <= 100\`
      - Strings consist of lowercase English letters.
    `,
    starter: py`
      def group_anagrams(strs: list[str]) -> list[list[str]]:
          pass
    `,
    tests: [
      {
        call: 'group_anagrams(["eat", "tea", "tan", "ate", "nat", "bat"])',
        expect: '[["bat"], ["nat", "tan"], ["ate", "eat", "tea"]]',
        cmp: "nested",
      },
      { call: 'group_anagrams([""])', expect: '[[""]]', cmp: "nested" },
      { call: 'group_anagrams(["a"])', expect: '[["a"]]', cmp: "nested" },
      { call: "group_anagrams([])", expect: "[]", cmp: "nested" },
      { call: 'group_anagrams(["", ""])', expect: '[["", ""]]', cmp: "nested" },
      {
        call: 'group_anagrams(["ab", "ba", "abc", "cab", "bca", "xyz", "aab", "aba"])',
        expect: '[["ab", "ba"], ["abc", "cab", "bca"], ["xyz"], ["aab", "aba"]]',
        cmp: "nested",
      },
      {
        call: 'sorted(len(g) for g in group_anagrams(["".join(sorted(str(i))) for i in range(10000)]))[-3:]',
        expect: "[24, 24, 24]",
      },
    ],
    hints: [
      "Anagrams share some canonical form. What could you compute from a word that is identical for all its anagrams?",
      "Use that canonical form as a dictionary key, mapping to the list of words that produce it.",
      "For each word, compute a key such as the sorted string (or a tuple of 26 letter counts) and append the word to groups[key]. Return the dictionary's values as a list.",
    ],
    solution: py`
      from collections import defaultdict

      def group_anagrams(strs: list[str]) -> list[list[str]]:
          groups: dict[str, list[str]] = defaultdict(list)
          for s in strs:
              groups["".join(sorted(s))].append(s)
          return list(groups.values())
    `,
    complexity: "O(n · k log k) time for n strings of length up to k, O(n · k) space",
    explanation: md`
      Sorting the letters of a word produces the same string for every anagram of it, so it works as a group key. A dictionary from key to list collects the words in a single pass, and its values are exactly the groups. Using a 26-count tuple as the key instead of sorting brings the per-word cost down to O(k).
    `,
  },
  {
    id: "top-k-frequent-elements",
    title: "Top K Frequent Elements",
    difficulty: "Medium",
    topic: "Arrays & Hashing",
    tags: ["hash map", "bucket sort", "heap"],
    prompt: md`
      Given a list of integers \`nums\` and an integer \`k\`, return the \`k\` most frequent elements, in **any order**.

      The answer is guaranteed to be unique (there are no ties at the cut-off).

      **Example 1**
      \`\`\`
      Input: nums = [1,1,1,2,2,3], k = 2
      Output: [1, 2]
      \`\`\`

      **Example 2**
      \`\`\`
      Input: nums = [1], k = 1
      Output: [1]
      \`\`\`

      **Constraints:**
      - \`1 <= len(nums) <= 10^5\`
      - \`1 <= k <=\` number of distinct elements

      **Follow-up:** can you beat O(n log n)?
    `,
    starter: py`
      def top_k_frequent(nums: list[int], k: int) -> list[int]:
          pass
    `,
    tests: [
      { call: "top_k_frequent([1, 1, 1, 2, 2, 3], 2)", expect: "[1, 2]", cmp: "sorted" },
      { call: "top_k_frequent([1], 1)", expect: "[1]", cmp: "sorted" },
      { call: "top_k_frequent([4, 4, -1, -1, -1, 2], 2)", expect: "[-1, 4]", cmp: "sorted" },
      { call: "top_k_frequent([5, 5, 6, 6, 6, 7, 7, 7, 7], 3)", expect: "[5, 6, 7]", cmp: "sorted" },
      { call: "top_k_frequent([3, 0, 1, 0], 1)", expect: "[0]", cmp: "sorted" },
      {
        call: "top_k_frequent(list(range(100000)) + [42] * 5 + [7] * 3, 2)",
        expect: "[42, 7]",
        cmp: "sorted",
      },
    ],
    hints: [
      "Start by counting how often each value occurs.",
      "Once you have counts, you need the k largest. A heap works, but counts are bounded by len(nums) — think bucket sort.",
      "Create buckets indexed by frequency (0..n), put each value into the bucket for its count, then walk the buckets from the highest frequency down, collecting values until you have k.",
    ],
    solution: py`
      def top_k_frequent(nums: list[int], k: int) -> list[int]:
          counts: dict[int, int] = {}
          for x in nums:
              counts[x] = counts.get(x, 0) + 1
          buckets: list[list[int]] = [[] for _ in range(len(nums) + 1)]
          for x, c in counts.items():
              buckets[c].append(x)
          out: list[int] = []
          for c in range(len(buckets) - 1, 0, -1):
              for x in buckets[c]:
                  out.append(x)
                  if len(out) == k:
                      return out
          return out
    `,
    complexity: "O(n) time, O(n) space",
    explanation: md`
      After counting, every frequency is between 1 and n, so we can place values into n + 1 buckets keyed by frequency instead of sorting. Scanning the buckets from the highest frequency downward yields values in decreasing order of frequency, and we stop once we have k of them. This avoids the log factor of sorting or a heap.
    `,
  },
  {
    id: "product-of-array-except-self",
    title: "Product of Array Except Self",
    difficulty: "Medium",
    topic: "Arrays & Hashing",
    tags: ["prefix product", "array"],
    prompt: md`
      Given a list of integers \`nums\`, return a list \`answer\` where \`answer[i]\` is the product of every element of \`nums\` **except** \`nums[i]\`.

      Solve it in O(n) time **without using division**.

      **Example 1**
      \`\`\`
      Input: nums = [1,2,3,4]
      Output: [24, 12, 8, 6]
      \`\`\`

      **Example 2**
      \`\`\`
      Input: nums = [-1,1,0,-3,3]
      Output: [0, 0, 9, 0, 0]
      \`\`\`

      **Constraints:**
      - \`2 <= len(nums) <= 10^5\`
      - \`-30 <= nums[i] <= 30\`

      **Follow-up:** can you use O(1) extra space (the output list doesn't count)?
    `,
    starter: py`
      def product_except_self(nums: list[int]) -> list[int]:
          pass
    `,
    tests: [
      { call: "product_except_self([1, 2, 3, 4])", expect: "[24, 12, 8, 6]" },
      { call: "product_except_self([-1, 1, 0, -3, 3])", expect: "[0, 0, 9, 0, 0]" },
      { call: "product_except_self([2, 3])", expect: "[3, 2]" },
      { call: "product_except_self([0, 0])", expect: "[0, 0]" },
      { call: "product_except_self([5, 0, 2])", expect: "[0, 10, 0]" },
      { call: "product_except_self([-2, -3, 4])", expect: "[-12, -8, 6]" },
      { call: "product_except_self([1] * 30000)", expect: "[1] * 30000" },
    ],
    hints: [
      "The product of everything except nums[i] splits into two parts: everything to its left and everything to its right.",
      "Precompute prefix products (left of i) and suffix products (right of i).",
      "Fill the answer left-to-right with the running product of earlier elements, then sweep right-to-left multiplying each slot by a running product of later elements. Both passes are O(n) and no division is needed.",
    ],
    solution: py`
      def product_except_self(nums: list[int]) -> list[int]:
          n = len(nums)
          answer = [1] * n
          left = 1
          for i in range(n):
              answer[i] = left
              left *= nums[i]
          right = 1
          for i in range(n - 1, -1, -1):
              answer[i] *= right
              right *= nums[i]
          return answer
    `,
    complexity: "O(n) time, O(1) extra space besides the output",
    explanation: md`
      The desired value at index i equals (product of nums[0..i-1]) × (product of nums[i+1..n-1]). The first pass stores the left products directly in the output; the second pass walks backwards carrying the right product and multiplies it in. Zeros are handled naturally because nothing is ever divided.
    `,
  },
  {
    id: "longest-consecutive-sequence",
    title: "Longest Consecutive Sequence",
    difficulty: "Medium",
    topic: "Arrays & Hashing",
    tags: ["hash set", "array"],
    prompt: md`
      Given an **unsorted** list of integers \`nums\`, return the length of the longest run of consecutive integers (e.g. 4, 5, 6, 7) that can be formed from its elements.

      Aim for O(n) time.

      **Example 1**
      \`\`\`
      Input: nums = [100,4,200,1,3,2]
      Output: 4
      Explanation: the longest run is [1, 2, 3, 4].
      \`\`\`

      **Example 2**
      \`\`\`
      Input: nums = [0,3,7,2,5,8,4,6,0,1]
      Output: 9
      \`\`\`

      **Constraints:**
      - \`0 <= len(nums) <= 10^5\`
      - \`-10^9 <= nums[i] <= 10^9\`
    `,
    starter: py`
      def longest_consecutive(nums: list[int]) -> int:
          pass
    `,
    tests: [
      { call: "longest_consecutive([100, 4, 200, 1, 3, 2])", expect: "4" },
      { call: "longest_consecutive([0, 3, 7, 2, 5, 8, 4, 6, 0, 1])", expect: "9" },
      { call: "longest_consecutive([])", expect: "0" },
      { call: "longest_consecutive([1])", expect: "1" },
      { call: "longest_consecutive([1, 2, 0, 1])", expect: "3" },
      { call: "longest_consecutive([-3, -2, -1, 10, 11])", expect: "3" },
      { call: "longest_consecutive(list(range(100000, 0, -1)))", expect: "100000" },
    ],
    hints: [
      "Sorting gives O(n log n). To do better, you need fast 'is x in the input?' checks.",
      "Put all numbers in a set. Only some numbers are worth starting a count from.",
      "A number x starts a run only if x - 1 is not in the set. For each such start, count upward while x + 1, x + 2, ... are present. Each number is visited a constant number of times overall.",
    ],
    solution: py`
      def longest_consecutive(nums: list[int]) -> int:
          values = set(nums)
          best = 0
          for x in values:
              if x - 1 not in values:
                  y = x
                  while y + 1 in values:
                      y += 1
                  best = max(best, y - x + 1)
          return best
    `,
    complexity: "O(n) time, O(n) space",
    explanation: md`
      With all values in a set, we only begin counting at numbers that have no predecessor, i.e. the start of a run. From each start we extend upward through the set. Because every number belongs to exactly one run and each run is walked once from its start, the total work is linear.
    `,
  },

  // -------------------------------------------------- Two Pointers & Sliding Window
  {
    id: "valid-palindrome",
    title: "Valid Palindrome",
    difficulty: "Easy",
    topic: "Two Pointers & Sliding Window",
    tags: ["two pointers", "string"],
    prompt: md`
      A phrase is a **palindrome** if, after converting all uppercase letters to lowercase and removing every non-alphanumeric character, it reads the same forwards and backwards.

      Given a string \`s\`, return \`True\` if it is a palindrome and \`False\` otherwise.

      **Example 1**
      \`\`\`
      Input: s = "A man, a plan, a canal: Panama"
      Output: True
      Explanation: "amanaplanacanalpanama" is a palindrome.
      \`\`\`

      **Example 2**
      \`\`\`
      Input: s = "race a car"
      Output: False
      \`\`\`

      **Constraints:**
      - \`1 <= len(s) <= 2 * 10^5\`
      - \`s\` consists of printable ASCII characters.

      **Follow-up:** can you do it with O(1) extra space?
    `,
    starter: py`
      def is_palindrome(s: str) -> bool:
          pass
    `,
    tests: [
      { call: 'is_palindrome("A man, a plan, a canal: Panama")', expect: "True" },
      { call: 'is_palindrome("race a car")', expect: "False" },
      { call: 'is_palindrome(" ")', expect: "True" },
      { call: 'is_palindrome("0P")', expect: "False" },
      { call: 'is_palindrome("ab_a")', expect: "True" },
      { call: 'is_palindrome("Was it a car or a cat I saw?")', expect: "True" },
      { call: 'is_palindrome("ab" * 50000 + "c")', expect: "False" },
    ],
    hints: [
      "Compare characters from both ends moving inwards.",
      "Use two indices, skipping characters that aren't letters or digits (str.isalnum helps).",
      "Start left at 0 and right at the end. Advance each past non-alphanumeric characters, then compare the lowercased characters; on a mismatch return False, otherwise step both inward. If they meet, return True.",
    ],
    solution: py`
      def is_palindrome(s: str) -> bool:
          i, j = 0, len(s) - 1
          while i < j:
              while i < j and not s[i].isalnum():
                  i += 1
              while i < j and not s[j].isalnum():
                  j -= 1
              if s[i].lower() != s[j].lower():
                  return False
              i += 1
              j -= 1
          return True
    `,
    complexity: "O(n) time, O(1) space",
    explanation: md`
      Two pointers start at opposite ends and skip anything that isn't alphanumeric. At each step the characters they point to must match case-insensitively, otherwise the cleaned string can't be a palindrome. If the pointers meet without a mismatch, every mirrored pair matched.
    `,
  },
  {
    id: "3sum",
    title: "3Sum",
    difficulty: "Medium",
    topic: "Two Pointers & Sliding Window",
    tags: ["two pointers", "sorting"],
    prompt: md`
      Given a list of integers \`nums\`, return all **unique** triplets \`[a, b, c]\` of values taken from three different positions such that \`a + b + c == 0\`.

      The result must not contain duplicate triplets. Order of the triplets, and order within each triplet, does not matter.

      **Example 1**
      \`\`\`
      Input: nums = [-1,0,1,2,-1,-4]
      Output: [[-1,-1,2],[-1,0,1]]
      \`\`\`

      **Example 2**
      \`\`\`
      Input: nums = [0,1,1]
      Output: []
      \`\`\`

      **Constraints:**
      - \`0 <= len(nums) <= 3000\`
      - \`-10^5 <= nums[i] <= 10^5\`
    `,
    starter: py`
      def three_sum(nums: list[int]) -> list[list[int]]:
          pass
    `,
    tests: [
      { call: "three_sum([-1, 0, 1, 2, -1, -4])", expect: "[[-1, -1, 2], [-1, 0, 1]]", cmp: "nested" },
      { call: "three_sum([0, 1, 1])", expect: "[]", cmp: "nested" },
      { call: "three_sum([0, 0, 0])", expect: "[[0, 0, 0]]", cmp: "nested" },
      { call: "three_sum([])", expect: "[]", cmp: "nested" },
      { call: "three_sum([0, 0, 0, 0])", expect: "[[0, 0, 0]]", cmp: "nested" },
      { call: "three_sum([-2, 0, 1, 1, 2])", expect: "[[-2, 0, 2], [-2, 1, 1]]", cmp: "nested" },
      {
        call: "three_sum([-4, -2, -2, -2, 0, 1, 2, 2, 2, 3, 3, 4, 4, 6, 6])",
        expect:
          "[[-4, -2, 6], [-4, 0, 4], [-4, 1, 3], [-4, 2, 2], [-2, -2, 4], [-2, 0, 2]]",
        cmp: "nested",
      },
      { call: "three_sum([1] * 1500 + [-2] * 1500)", expect: "[[-2, 1, 1]]", cmp: "nested" },
    ],
    hints: [
      "Checking every triple is O(n³). Fixing one element reduces the problem to finding two numbers with a given sum.",
      "Sort the list first; then for a fixed first element, a pair with a target sum can be found with two pointers in linear time.",
      "Sort. For each index i (skipping values equal to the previous one), set lo = i + 1 and hi = end. Move lo up if the sum is too small, hi down if too large; on a hit, record it and move both pointers past duplicate values.",
    ],
    solution: py`
      def three_sum(nums: list[int]) -> list[list[int]]:
          nums = sorted(nums)
          n = len(nums)
          out: list[list[int]] = []
          for i in range(n - 2):
              if nums[i] > 0:
                  break
              if i > 0 and nums[i] == nums[i - 1]:
                  continue
              lo, hi = i + 1, n - 1
              while lo < hi:
                  total = nums[i] + nums[lo] + nums[hi]
                  if total < 0:
                      lo += 1
                  elif total > 0:
                      hi -= 1
                  else:
                      out.append([nums[i], nums[lo], nums[hi]])
                      lo += 1
                      hi -= 1
                      while lo < hi and nums[lo] == nums[lo - 1]:
                          lo += 1
                      while lo < hi and nums[hi] == nums[hi + 1]:
                          hi -= 1
          return out
    `,
    complexity: "O(n²) time, O(n) space for the sorted copy",
    explanation: md`
      After sorting, fixing the smallest element turns the task into a two-sum on the remaining suffix, which two pointers solve in linear time: a sum that's too small means the left pointer must grow, too large means the right must shrink. Skipping repeated values for the fixed element and after each match guarantees each triplet is emitted once. Once the fixed element is positive no triplet can sum to zero, so we stop early.
    `,
  },
  {
    id: "container-with-most-water",
    title: "Container With Most Water",
    difficulty: "Medium",
    topic: "Two Pointers & Sliding Window",
    tags: ["two pointers", "greedy"],
    prompt: md`
      You are given a list \`height\` of length \`n\`. There are \`n\` vertical lines; line \`i\` goes from \`(i, 0)\` to \`(i, height[i])\`.

      Choose two lines that, together with the x-axis, form a container holding the most water. Return that maximum amount (width × the shorter of the two heights).

      **Example 1**
      \`\`\`
      Input: height = [1,8,6,2,5,4,8,3,7]
      Output: 49
      Explanation: lines at index 1 (height 8) and index 8 (height 7): 7 * 7 = 49
      \`\`\`

      **Example 2**
      \`\`\`
      Input: height = [1,1]
      Output: 1
      \`\`\`

      **Constraints:**
      - \`2 <= n <= 10^5\`
      - \`0 <= height[i] <= 10^4\`
    `,
    starter: py`
      def max_area(height: list[int]) -> int:
          pass
    `,
    tests: [
      { call: "max_area([1, 8, 6, 2, 5, 4, 8, 3, 7])", expect: "49" },
      { call: "max_area([1, 1])", expect: "1" },
      { call: "max_area([4, 3, 2, 1, 4])", expect: "16" },
      { call: "max_area([1, 2, 1])", expect: "2" },
      { call: "max_area([2, 3, 4, 5, 18, 17, 6])", expect: "17" },
      { call: "max_area([0, 0, 0])", expect: "0" },
      { call: "max_area(list(range(1, 20001)))", expect: "100000000" },
    ],
    hints: [
      "Start with the widest possible container. How can you narrow it while still possibly improving?",
      "The area is limited by the shorter line. Moving the taller line inward can never help — the width shrinks and the height can't exceed the shorter line.",
      "Use two pointers at both ends. Record the area, then move whichever pointer has the shorter line inward. Repeat until they meet, tracking the maximum.",
    ],
    solution: py`
      def max_area(height: list[int]) -> int:
          i, j = 0, len(height) - 1
          best = 0
          while i < j:
              best = max(best, (j - i) * min(height[i], height[j]))
              if height[i] < height[j]:
                  i += 1
              else:
                  j -= 1
          return best
    `,
    complexity: "O(n) time, O(1) space",
    explanation: md`
      Begin with the widest pair. Any container that keeps the shorter line and moves the other one inward is narrower and no taller, so it can't be better; that means the shorter line can be discarded safely. Repeating this discards one line per step, so we examine every pair that could possibly be optimal in linear time.
    `,
  },
  {
    id: "best-time-to-buy-and-sell-stock",
    title: "Best Time to Buy and Sell Stock",
    difficulty: "Easy",
    topic: "Two Pointers & Sliding Window",
    tags: ["array", "greedy"],
    prompt: md`
      You are given a list \`prices\` where \`prices[i]\` is a stock's price on day \`i\`.

      Pick one day to buy and a **later** day to sell to maximize profit. Return the maximum profit, or \`0\` if no profit is possible.

      **Example 1**
      \`\`\`
      Input: prices = [7,1,5,3,6,4]
      Output: 5
      Explanation: buy on day 1 (price 1), sell on day 4 (price 6).
      \`\`\`

      **Example 2**
      \`\`\`
      Input: prices = [7,6,4,3,1]
      Output: 0
      \`\`\`

      **Constraints:**
      - \`1 <= len(prices) <= 10^5\`
      - \`0 <= prices[i] <= 10^4\`
    `,
    starter: py`
      def max_profit(prices: list[int]) -> int:
          pass
    `,
    tests: [
      { call: "max_profit([7, 1, 5, 3, 6, 4])", expect: "5" },
      { call: "max_profit([7, 6, 4, 3, 1])", expect: "0" },
      { call: "max_profit([1])", expect: "0" },
      { call: "max_profit([2, 4, 1])", expect: "2" },
      { call: "max_profit([3, 3, 3])", expect: "0" },
      { call: "max_profit([2, 1, 2, 1, 0, 1, 2])", expect: "2" },
      { call: "max_profit(list(range(100000)))", expect: "99999" },
    ],
    hints: [
      "For each possible selling day, which buying day would be best?",
      "The best buying day for a sale on day i is the cheapest day before i.",
      "Scan once, keeping the minimum price seen so far. At each day, compute price - minimum and update the best profit; then update the minimum.",
    ],
    solution: py`
      def max_profit(prices: list[int]) -> int:
          lowest = float("inf")
          best = 0
          for p in prices:
              if p < lowest:
                  lowest = p
              elif p - lowest > best:
                  best = p - lowest
          return best
    `,
    complexity: "O(n) time, O(1) space",
    explanation: md`
      If we sell on a given day, the best possible purchase is the minimum price on any earlier day. Keeping a running minimum lets us evaluate every selling day in O(1), and the answer is the largest difference found. Starting the best profit at 0 handles prices that only fall.
    `,
  },
  {
    id: "longest-substring-without-repeating-characters",
    title: "Longest Substring Without Repeating Characters",
    difficulty: "Medium",
    topic: "Two Pointers & Sliding Window",
    tags: ["sliding window", "hash map", "string"],
    prompt: md`
      Given a string \`s\`, return the length of the longest **substring** (contiguous) that contains no repeated characters.

      **Example 1**
      \`\`\`
      Input: s = "abcabcbb"
      Output: 3
      Explanation: "abc"
      \`\`\`

      **Example 2**
      \`\`\`
      Input: s = "pwwkew"
      Output: 3
      Explanation: "wke". Note that "pwke" is a subsequence, not a substring.
      \`\`\`

      **Constraints:**
      - \`0 <= len(s) <= 10^5\`
      - \`s\` consists of letters, digits, symbols and spaces.
    `,
    starter: py`
      def length_of_longest_substring(s: str) -> int:
          pass
    `,
    tests: [
      { call: 'length_of_longest_substring("abcabcbb")', expect: "3" },
      { call: 'length_of_longest_substring("bbbbb")', expect: "1" },
      { call: 'length_of_longest_substring("pwwkew")', expect: "3" },
      { call: 'length_of_longest_substring("")', expect: "0" },
      { call: 'length_of_longest_substring(" ")', expect: "1" },
      { call: 'length_of_longest_substring("dvdf")', expect: "3" },
      { call: 'length_of_longest_substring("abba")', expect: "2" },
      { call: 'length_of_longest_substring("abcdefghijklmnopqrstuvwxyz" * 4000)', expect: "26" },
    ],
    hints: [
      "Think of a window [left, right] that always contains distinct characters. Grow it on the right.",
      "When the new character already appears in the window, the left edge must jump past its previous occurrence.",
      "Keep a dict of each character's last index. For each right index, if the character's last index is >= left, set left to that index + 1. Update the last index and the best length right - left + 1.",
    ],
    solution: py`
      def length_of_longest_substring(s: str) -> int:
          last: dict[str, int] = {}
          left = 0
          best = 0
          for right, ch in enumerate(s):
              if ch in last and last[ch] >= left:
                  left = last[ch] + 1
              last[ch] = right
              best = max(best, right - left + 1)
          return best
    `,
    complexity: "O(n) time, O(min(n, alphabet)) space",
    explanation: md`
      We maintain a sliding window with no repeated characters. When the incoming character was last seen inside the window, the window's left edge jumps just past that occurrence, which is the smallest move that restores the invariant. Both edges only move forward, so the scan is linear, and the best window length seen is the answer.
    `,
  },
  {
    id: "minimum-window-substring",
    title: "Minimum Window Substring",
    difficulty: "Hard",
    topic: "Two Pointers & Sliding Window",
    tags: ["sliding window", "hash map", "string"],
    prompt: md`
      Given strings \`s\` and \`t\`, return the **shortest substring** of \`s\` that contains every character of \`t\`, **including duplicates**. If there is no such substring, return \`""\`.

      The answer is guaranteed to be unique when it exists.

      **Example 1**
      \`\`\`
      Input: s = "ADOBECODEBANC", t = "ABC"
      Output: "BANC"
      \`\`\`

      **Example 2**
      \`\`\`
      Input: s = "a", t = "aa"
      Output: ""
      Explanation: both 'a's of t must be in the window, but s has only one.
      \`\`\`

      **Constraints:**
      - \`1 <= len(s), len(t) <= 10^5\`
      - \`s\` and \`t\` consist of uppercase and lowercase English letters.

      **Follow-up:** can you do it in O(len(s) + len(t))?
    `,
    starter: py`
      def min_window(s: str, t: str) -> str:
          pass
    `,
    tests: [
      { call: 'min_window("ADOBECODEBANC", "ABC")', expect: '"BANC"' },
      { call: 'min_window("a", "a")', expect: '"a"' },
      { call: 'min_window("a", "aa")', expect: '""' },
      { call: 'min_window("ab", "b")', expect: '"b"' },
      { call: 'min_window("aa", "aa")', expect: '"aa"' },
      { call: 'min_window("bba", "ab")', expect: '"ba"' },
      { call: 'min_window("abc", "d")', expect: '""' },
      { call: 'min_window("a" * 20000 + "b" + "a" * 20000 + "c", "bc")', expect: '"b" + "a" * 20000 + "c"' },
    ],
    hints: [
      "Use a sliding window: expand the right edge until the window covers t, then shrink from the left as long as it still does.",
      "Track how many of each character t needs, and how many distinct characters are currently fully satisfied, so checking 'does the window cover t?' is O(1).",
      "Count t's characters into need. Keep a counter 'missing' = len(t). When adding s[right] whose need is positive, decrement missing; decrement need either way. While missing == 0, record the window if it's shortest, then remove s[left]: increment its need, and if that need becomes positive, missing goes up. Advance left.",
    ],
    solution: py`
      from collections import Counter

      def min_window(s: str, t: str) -> str:
          need = Counter(t)
          missing = len(t)
          best_start, best_len = 0, float("inf")
          left = 0
          for right, ch in enumerate(s):
              if need[ch] > 0:
                  missing -= 1
              need[ch] -= 1
              while missing == 0:
                  if right - left + 1 < best_len:
                      best_start, best_len = left, right - left + 1
                  need[s[left]] += 1
                  if need[s[left]] > 0:
                      missing += 1
                  left += 1
          return "" if best_len == float("inf") else s[best_start:best_start + best_len]
    `,
    complexity: "O(len(s) + len(t)) time, O(alphabet) space",
    explanation: md`
      \`need\` holds how many more of each character the window requires (negative means surplus), and \`missing\` counts required characters not yet covered. The right edge grows until \`missing\` hits 0; then the left edge shrinks while the window stays valid, recording the shortest window. Each index enters and leaves the window at most once, so the whole thing is linear.
    `,
  },

  // ---------------------------------------------------------------------- Stack
  {
    id: "valid-parentheses",
    title: "Valid Parentheses",
    difficulty: "Easy",
    topic: "Stack",
    tags: ["stack", "string"],
    prompt: md`
      Given a string \`s\` containing only the characters \`()[]{}\`, determine whether it is valid:

      1. Every open bracket is closed by the same type of bracket.
      2. Brackets are closed in the correct order.
      3. Every close bracket has a matching open bracket.

      An empty string is valid.

      **Example 1**
      \`\`\`
      Input: s = "()[]{}"
      Output: True
      \`\`\`

      **Example 2**
      \`\`\`
      Input: s = "([)]"
      Output: False
      \`\`\`

      **Constraints:**
      - \`0 <= len(s) <= 10^5\`
    `,
    starter: py`
      def is_valid(s: str) -> bool:
          pass
    `,
    tests: [
      { call: 'is_valid("()")', expect: "True" },
      { call: 'is_valid("()[]{}")', expect: "True" },
      { call: 'is_valid("(]")', expect: "False" },
      { call: 'is_valid("([)]")', expect: "False" },
      { call: 'is_valid("{[]}")', expect: "True" },
      { call: 'is_valid("")', expect: "True" },
      { call: 'is_valid("((")', expect: "False" },
      { call: 'is_valid("]")', expect: "False" },
      { call: 'is_valid("(" * 50000 + ")" * 50000)', expect: "True" },
    ],
    hints: [
      "The most recently opened bracket must be the first one closed.",
      "That 'last in, first out' behaviour is exactly what a stack provides.",
      "Push each opening bracket. On a closing bracket, the stack must be non-empty and its top must be the matching opener; pop it. At the end the stack must be empty.",
    ],
    solution: py`
      def is_valid(s: str) -> bool:
          pairs = {")": "(", "]": "[", "}": "{"}
          stack: list[str] = []
          for ch in s:
              if ch in pairs:
                  if not stack or stack.pop() != pairs[ch]:
                      return False
              else:
                  stack.append(ch)
          return not stack
    `,
    complexity: "O(n) time, O(n) space",
    explanation: md`
      A stack holds the brackets that are still open, with the most recent on top. Each closing bracket must match that top element, otherwise the nesting is wrong. Any brackets left on the stack at the end were never closed.
    `,
  },
  {
    id: "min-stack",
    title: "Min Stack",
    difficulty: "Medium",
    topic: "Stack",
    tags: ["stack", "design"],
    prompt: md`
      Design a stack that supports push, pop, top, and retrieving the minimum element, **all in O(1) time**.

      Implement the \`MinStack\` class:
      - \`MinStack()\` initializes the stack.
      - \`push(val)\` pushes \`val\` onto the stack.
      - \`pop()\` removes the top element.
      - \`top()\` returns the top element.
      - \`get_min()\` returns the minimum element in the stack.

      **Example**
      \`\`\`
      s = MinStack()
      s.push(-2); s.push(0); s.push(-3)
      s.get_min()  # -3
      s.pop()
      s.top()      # 0
      s.get_min()  # -2
      \`\`\`

      **Constraints:**
      - \`pop\`, \`top\` and \`get_min\` are only called on a non-empty stack.
      - Up to \`10^5\` calls in total.
    `,
    starter: py`
      class MinStack:
          def __init__(self):
              pass

          def push(self, val: int) -> None:
              pass

          def pop(self) -> None:
              pass

          def top(self) -> int:
              pass

          def get_min(self) -> int:
              pass
    `,
    tests: [
      {
        name: "example sequence",
        code: py`
          s = MinStack()
          s.push(-2); s.push(0); s.push(-3)
          assert s.get_min() == -3, f"get_min() returned {s.get_min()}, expected -3"
          s.pop()
          assert s.top() == 0, f"top() returned {s.top()}, expected 0"
          assert s.get_min() == -2, f"get_min() returned {s.get_min()}, expected -2"
        `,
      },
      {
        name: "single element",
        code: py`
          s = MinStack()
          s.push(5)
          assert s.top() == 5, f"top() returned {s.top()}, expected 5"
          assert s.get_min() == 5, f"get_min() returned {s.get_min()}, expected 5"
        `,
      },
      {
        name: "duplicate minimums survive a pop",
        code: py`
          s = MinStack()
          s.push(0); s.push(1); s.push(0)
          assert s.get_min() == 0, f"get_min() returned {s.get_min()}, expected 0"
          s.pop()
          assert s.get_min() == 0, f"after one pop, get_min() returned {s.get_min()}, expected 0"
          s.pop()
          assert s.get_min() == 0, f"after two pops, get_min() returned {s.get_min()}, expected 0"
        `,
      },
      {
        name: "minimum restored after popping it",
        code: py`
          s = MinStack()
          for v in [5, 3, 7, 1, 8]:
              s.push(v)
          expected = [1, 1, 3, 3, 5]
          for want in expected:
              got = s.get_min()
              assert got == want, f"get_min() returned {got}, expected {want}"
              s.pop()
        `,
      },
      {
        name: "push after emptying",
        code: py`
          s = MinStack()
          s.push(-1); s.pop()
          s.push(10); s.push(20)
          assert s.get_min() == 10, f"get_min() returned {s.get_min()}, expected 10"
          assert s.top() == 20, f"top() returned {s.top()}, expected 20"
        `,
      },
      {
        name: "30000 pushes with get_min each time (must be O(1))",
        code: py`
          s = MinStack()
          n = 30000
          for i in range(n):
              s.push(n - i)
              got = s.get_min()
              assert got == n - i, f"after pushing {n - i}, get_min() returned {got}"
          for i in range(n - 1):
              s.pop()
              got = s.get_min()
              assert got == i + 2, f"after {i + 1} pops, get_min() returned {got}, expected {i + 2}"
        `,
      },
    ],
    hints: [
      "Scanning the whole stack for the minimum is O(n). What extra information could you store at push time?",
      "When an element is pushed, the minimum of the stack 'from here down' never changes until that element is popped.",
      "Store pairs (value, minimum so far) on the stack — or keep a second stack of running minimums. push records min(val, current min); pop removes the pair; get_min reads the top pair's minimum.",
    ],
    solution: py`
      class MinStack:
          def __init__(self):
              self._items: list[tuple[int, int]] = []

          def push(self, val: int) -> None:
              current = min(val, self._items[-1][1]) if self._items else val
              self._items.append((val, current))

          def pop(self) -> None:
              self._items.pop()

          def top(self) -> int:
              return self._items[-1][0]

          def get_min(self) -> int:
              return self._items[-1][1]
    `,
    complexity: "O(1) time per operation, O(n) space",
    explanation: md`
      Each stack entry remembers the minimum of itself and everything beneath it. Since elements below an entry can't change while it's on the stack, that stored minimum stays correct until the entry is popped, at which point the next entry's stored minimum is again correct. Every operation just reads or writes the top.
    `,
  },
  {
    id: "daily-temperatures",
    title: "Daily Temperatures",
    difficulty: "Medium",
    topic: "Stack",
    tags: ["monotonic stack", "array"],
    prompt: md`
      Given a list \`temperatures\` of daily temperatures, return a list \`answer\` where \`answer[i]\` is the number of days you must wait after day \`i\` to get a **warmer** temperature. If no future day is warmer, \`answer[i]\` is \`0\`.

      **Example 1**
      \`\`\`
      Input: temperatures = [73,74,75,71,69,72,76,73]
      Output: [1, 1, 4, 2, 1, 1, 0, 0]
      \`\`\`

      **Example 2**
      \`\`\`
      Input: temperatures = [30,60,90]
      Output: [1, 1, 0]
      \`\`\`

      **Constraints:**
      - \`1 <= len(temperatures) <= 10^5\`
      - \`30 <= temperatures[i] <= 100\`
    `,
    starter: py`
      def daily_temperatures(temperatures: list[int]) -> list[int]:
          pass
    `,
    tests: [
      { call: "daily_temperatures([73, 74, 75, 71, 69, 72, 76, 73])", expect: "[1, 1, 4, 2, 1, 1, 0, 0]" },
      { call: "daily_temperatures([30, 40, 50, 60])", expect: "[1, 1, 1, 0]" },
      { call: "daily_temperatures([30, 60, 90])", expect: "[1, 1, 0]" },
      { call: "daily_temperatures([50])", expect: "[0]" },
      { call: "daily_temperatures([70, 70, 70])", expect: "[0, 0, 0]" },
      { call: "daily_temperatures([90, 80, 70, 100])", expect: "[3, 2, 1, 0]" },
      { call: "daily_temperatures([99] * 30000 + [100])", expect: "list(range(30000, 0, -1)) + [0]" },
    ],
    hints: [
      "For each day, scanning forward for a warmer day is O(n²) in the worst case. Think about which days are still 'waiting' for an answer.",
      "Days still waiting always have non-increasing temperatures from oldest to newest — a monotonic stack.",
      "Keep a stack of indices. For each day i, while the stack's top index has a lower temperature than today, pop it and set its answer to i minus that index. Then push i. Indices left on the stack get 0.",
    ],
    solution: py`
      def daily_temperatures(temperatures: list[int]) -> list[int]:
          answer = [0] * len(temperatures)
          stack: list[int] = []
          for i, t in enumerate(temperatures):
              while stack and temperatures[stack[-1]] < t:
                  j = stack.pop()
                  answer[j] = i - j
              stack.append(i)
          return answer
    `,
    complexity: "O(n) time, O(n) space",
    explanation: md`
      The stack holds indices of days that haven't yet seen a warmer day, and their temperatures are non-increasing from bottom to top. When a warmer day arrives, it resolves every waiting day on top that is colder, which we pop and answer. Each index is pushed and popped at most once, giving linear time.
    `,
  },
  {
    id: "evaluate-reverse-polish-notation",
    title: "Evaluate Reverse Polish Notation",
    difficulty: "Medium",
    topic: "Stack",
    tags: ["stack", "math"],
    prompt: md`
      You are given a list of string \`tokens\` representing an arithmetic expression in [Reverse Polish Notation](https://en.wikipedia.org/wiki/Reverse_Polish_notation). Evaluate it and return the integer result.

      - Valid operators are \`+\`, \`-\`, \`*\` and \`/\`.
      - Each operand is an integer or the result of another expression.
      - Division between two integers **truncates toward zero** (so \`-7 / 2\` is \`-3\`, not \`-4\` as Python's \`//\` would give).
      - The input is always a valid expression and never divides by zero.

      **Example 1**
      \`\`\`
      Input: tokens = ["2","1","+","3","*"]
      Output: 9
      Explanation: ((2 + 1) * 3) = 9
      \`\`\`

      **Example 2**
      \`\`\`
      Input: tokens = ["4","13","5","/","+"]
      Output: 6
      Explanation: (4 + (13 / 5)) = 6
      \`\`\`

      **Constraints:**
      - \`1 <= len(tokens) <= 10^4\`
      - Intermediate results fit in a 32-bit integer.
    `,
    starter: py`
      def eval_rpn(tokens: list[str]) -> int:
          pass
    `,
    tests: [
      { call: 'eval_rpn(["2", "1", "+", "3", "*"])', expect: "9" },
      { call: 'eval_rpn(["4", "13", "5", "/", "+"])', expect: "6" },
      {
        call: 'eval_rpn(["10", "6", "9", "3", "+", "-11", "*", "/", "*", "17", "+", "5", "+"])',
        expect: "22",
      },
      { call: 'eval_rpn(["42"])', expect: "42" },
      { call: 'eval_rpn(["-7", "2", "/"])', expect: "-3" },
      { call: 'eval_rpn(["3", "-4", "-"])', expect: "7" },
      { call: 'eval_rpn(["7", "-2", "*"])', expect: "-14" },
      { call: 'eval_rpn(["1"] + ["1", "+"] * 4999)', expect: "5000" },
    ],
    hints: [
      "In RPN, an operator always applies to the two most recent values that haven't been consumed yet.",
      "Use a stack of numbers: operands get pushed, operators pop their arguments and push the result.",
      "For an operator, pop b (the right operand) then a (the left), compute a op b, and push it. For '/', use int(a / b) to truncate toward zero. The single value left on the stack is the answer.",
    ],
    solution: py`
      def eval_rpn(tokens: list[str]) -> int:
          stack: list[int] = []
          for tok in tokens:
              if tok in ("+", "-", "*", "/"):
                  b = stack.pop()
                  a = stack.pop()
                  if tok == "+":
                      stack.append(a + b)
                  elif tok == "-":
                      stack.append(a - b)
                  elif tok == "*":
                      stack.append(a * b)
                  else:
                      stack.append(int(a / b))
              else:
                  stack.append(int(tok))
          return stack[0]
    `,
    complexity: "O(n) time, O(n) space",
    explanation: md`
      RPN is designed for stack evaluation: numbers are pushed, and each operator pops its two operands (right operand first), applies itself, and pushes the result. Because the expression is valid, exactly one value remains at the end. Using \`int(a / b)\` gives truncation toward zero, unlike Python's floor division.
    `,
  },

  // ------------------------------------------------------------- Binary Search
  {
    id: "binary-search",
    title: "Binary Search",
    difficulty: "Easy",
    topic: "Binary Search",
    tags: ["binary search", "array"],
    prompt: md`
      Given a list of distinct integers \`nums\` sorted in ascending order and an integer \`target\`, return the index of \`target\` in \`nums\`, or \`-1\` if it is not present.

      Your algorithm must run in O(log n) time.

      **Example 1**
      \`\`\`
      Input: nums = [-1,0,3,5,9,12], target = 9
      Output: 4
      \`\`\`

      **Example 2**
      \`\`\`
      Input: nums = [-1,0,3,5,9,12], target = 2
      Output: -1
      \`\`\`

      **Constraints:**
      - \`0 <= len(nums) <= 10^6\`
      - All values are distinct and sorted ascending.
    `,
    starter: py`
      def search(nums: list[int], target: int) -> int:
          pass
    `,
    tests: [
      { call: "search([-1, 0, 3, 5, 9, 12], 9)", expect: "4" },
      { call: "search([-1, 0, 3, 5, 9, 12], 2)", expect: "-1" },
      { call: "search([5], 5)", expect: "0" },
      { call: "search([5], -5)", expect: "-1" },
      { call: "search([], 3)", expect: "-1" },
      { call: "search([1, 3], 3)", expect: "1" },
      { call: "search([1, 3], 0)", expect: "-1" },
      { call: "search(list(range(0, 2000000, 2)), 1999998)", expect: "999999" },
    ],
    hints: [
      "Because the list is sorted, comparing the target to the middle element tells you which half it must be in.",
      "Keep a search range [lo, hi] and halve it each step.",
      "While lo <= hi: mid = (lo + hi) // 2. Return mid if it matches; if nums[mid] < target set lo = mid + 1, else hi = mid - 1. If the loop ends, return -1.",
    ],
    solution: py`
      def search(nums: list[int], target: int) -> int:
          lo, hi = 0, len(nums) - 1
          while lo <= hi:
              mid = (lo + hi) // 2
              if nums[mid] == target:
                  return mid
              if nums[mid] < target:
                  lo = mid + 1
              else:
                  hi = mid - 1
          return -1
    `,
    complexity: "O(log n) time, O(1) space",
    explanation: md`
      The invariant is that if the target exists, its index lies within [lo, hi]. Comparing with the middle element lets us discard the half that cannot contain it, so the range halves each iteration. When the range becomes empty, the target is absent.
    `,
  },
  {
    id: "search-in-rotated-sorted-array",
    title: "Search in Rotated Sorted Array",
    difficulty: "Medium",
    topic: "Binary Search",
    tags: ["binary search", "array"],
    prompt: md`
      A list of distinct integers sorted ascending has been **rotated** at some unknown pivot, e.g. \`[0,1,2,4,5,6,7]\` might become \`[4,5,6,7,0,1,2]\`.

      Given the rotated list \`nums\` and an integer \`target\`, return the index of \`target\`, or \`-1\` if it is not present. Your algorithm must run in O(log n) time.

      **Example 1**
      \`\`\`
      Input: nums = [4,5,6,7,0,1,2], target = 0
      Output: 4
      \`\`\`

      **Example 2**
      \`\`\`
      Input: nums = [4,5,6,7,0,1,2], target = 3
      Output: -1
      \`\`\`

      **Constraints:**
      - \`1 <= len(nums) <= 10^6\`
      - All values are distinct.
    `,
    starter: py`
      def search_rotated(nums: list[int], target: int) -> int:
          pass
    `,
    tests: [
      { call: "search_rotated([4, 5, 6, 7, 0, 1, 2], 0)", expect: "4" },
      { call: "search_rotated([4, 5, 6, 7, 0, 1, 2], 3)", expect: "-1" },
      { call: "search_rotated([1], 0)", expect: "-1" },
      { call: "search_rotated([1], 1)", expect: "0" },
      { call: "search_rotated([3, 1], 1)", expect: "1" },
      { call: "search_rotated([5, 1, 3], 5)", expect: "0" },
      { call: "search_rotated([6, 7, 1, 2, 3, 4, 5], 6)", expect: "0" },
      { call: "search_rotated([1, 2, 3, 4, 5], 4)", expect: "3" },
      { call: "search_rotated(list(range(500000, 1000000)) + list(range(500000)), 499999)", expect: "999999" },
    ],
    hints: [
      "Split the list at any midpoint: at least one of the two halves is still fully sorted.",
      "You can tell which half is sorted by comparing nums[lo] with nums[mid]. In a sorted half, it's easy to check whether the target lies inside it.",
      "Binary search with lo/hi. If nums[lo] <= nums[mid], the left half is sorted: go left if nums[lo] <= target < nums[mid], else go right. Otherwise the right half is sorted: go right if nums[mid] < target <= nums[hi], else go left.",
    ],
    solution: py`
      def search_rotated(nums: list[int], target: int) -> int:
          lo, hi = 0, len(nums) - 1
          while lo <= hi:
              mid = (lo + hi) // 2
              if nums[mid] == target:
                  return mid
              if nums[lo] <= nums[mid]:
                  if nums[lo] <= target < nums[mid]:
                      hi = mid - 1
                  else:
                      lo = mid + 1
              else:
                  if nums[mid] < target <= nums[hi]:
                      lo = mid + 1
                  else:
                      hi = mid - 1
          return -1
    `,
    complexity: "O(log n) time, O(1) space",
    explanation: md`
      In a rotated sorted list, the rotation point falls in at most one half of any range, so the other half is ordinary sorted data. Comparing the endpoints identifies the sorted half, and a range check tells us whether the target can be there; if not, it must be in the other half. Each step discards half the range, just like normal binary search.
    `,
  },
  {
    id: "koko-eating-bananas",
    title: "Koko Eating Bananas",
    difficulty: "Medium",
    topic: "Binary Search",
    tags: ["binary search on answer"],
    prompt: md`
      Koko has \`n\` piles of bananas; pile \`i\` has \`piles[i]\` bananas. The guards return in \`h\` hours.

      Koko picks an eating speed \`k\` (bananas per hour). Each hour she chooses one pile and eats \`k\` bananas from it; if the pile has fewer than \`k\`, she eats all of it and does nothing else that hour.

      Return the **minimum integer** \`k\` such that she can eat every banana within \`h\` hours.

      **Example 1**
      \`\`\`
      Input: piles = [3,6,7,11], h = 8
      Output: 4
      \`\`\`

      **Example 2**
      \`\`\`
      Input: piles = [30,11,23,4,20], h = 5
      Output: 30
      \`\`\`

      **Constraints:**
      - \`1 <= len(piles) <= 10^4\`
      - \`len(piles) <= h <= 10^9\`
      - \`1 <= piles[i] <= 10^9\`
    `,
    starter: py`
      def min_eating_speed(piles: list[int], h: int) -> int:
          pass
    `,
    tests: [
      { call: "min_eating_speed([3, 6, 7, 11], 8)", expect: "4" },
      { call: "min_eating_speed([30, 11, 23, 4, 20], 5)", expect: "30" },
      { call: "min_eating_speed([30, 11, 23, 4, 20], 6)", expect: "23" },
      { call: "min_eating_speed([1], 1)", expect: "1" },
      { call: "min_eating_speed([1000000000], 2)", expect: "500000000" },
      { call: "min_eating_speed([312884470], 968709470)", expect: "1" },
      { call: "min_eating_speed([1000000000] * 1000, 1000000)", expect: "1000000" },
    ],
    hints: [
      "If Koko can finish at speed k, she can also finish at any speed faster than k.",
      "That monotonic yes/no property means you can binary search over the speed itself, from 1 to max(piles).",
      "For a candidate k, the hours needed are the sum of ceil(pile / k) over all piles. Binary search for the smallest k whose hours are <= h: if it fits, try slower (hi = mid), otherwise go faster (lo = mid + 1).",
    ],
    solution: py`
      def min_eating_speed(piles: list[int], h: int) -> int:
          lo, hi = 1, max(piles)
          while lo < hi:
              mid = (lo + hi) // 2
              hours = sum((p + mid - 1) // mid for p in piles)
              if hours <= h:
                  hi = mid
              else:
                  lo = mid + 1
          return lo
    `,
    complexity: "O(n log m) time where m = max(piles), O(1) space",
    explanation: md`
      The predicate "speed k finishes within h hours" is false for small k and true from some point on, so we binary search for the first true value in [1, max(piles)]. Checking a speed costs O(n): each pile takes ceil(pile / k) hours. Speed max(piles) always works since every pile then takes one hour and h >= n.
    `,
  },
  {
    id: "time-based-key-value-store",
    title: "Time Based Key-Value Store",
    difficulty: "Medium",
    topic: "Binary Search",
    tags: ["binary search", "design", "hash map"],
    prompt: md`
      Design a time-based key-value store that can hold multiple values for the same key at different timestamps, and retrieve the value at a given time.

      Implement the \`TimeMap\` class:
      - \`TimeMap()\` initializes the store.
      - \`set(key, value, timestamp)\` stores \`value\` for \`key\` at time \`timestamp\`.
      - \`get(key, timestamp)\` returns the value set for \`key\` with the **largest** timestamp \`<= timestamp\`. If there is none, return \`""\`.

      **Example**
      \`\`\`
      tm = TimeMap()
      tm.set("foo", "bar", 1)
      tm.get("foo", 1)   # "bar"
      tm.get("foo", 3)   # "bar"
      tm.set("foo", "bar2", 4)
      tm.get("foo", 4)   # "bar2"
      tm.get("foo", 5)   # "bar2"
      \`\`\`

      **Constraints:**
      - For a given key, timestamps passed to \`set\` are **strictly increasing**.
      - \`1 <= timestamp <= 10^7\`
      - Up to \`2 * 10^5\` calls in total.
    `,
    starter: py`
      class TimeMap:
          def __init__(self):
              pass

          def set(self, key: str, value: str, timestamp: int) -> None:
              pass

          def get(self, key: str, timestamp: int) -> str:
              pass
    `,
    tests: [
      {
        name: "example sequence",
        code: py`
          tm = TimeMap()
          tm.set("foo", "bar", 1)
          checks = [("foo", 1, "bar"), ("foo", 3, "bar")]
          for k, t, want in checks:
              got = tm.get(k, t)
              assert got == want, f"get({k!r}, {t}) returned {got!r}, expected {want!r}"
          tm.set("foo", "bar2", 4)
          for k, t, want in [("foo", 4, "bar2"), ("foo", 5, "bar2"), ("foo", 3, "bar")]:
              got = tm.get(k, t)
              assert got == want, f"get({k!r}, {t}) returned {got!r}, expected {want!r}"
        `,
      },
      {
        name: "before first timestamp returns empty string",
        code: py`
          tm = TimeMap()
          tm.set("a", "x", 10)
          got = tm.get("a", 9)
          assert got == "", f"get('a', 9) returned {got!r}, expected ''"
        `,
      },
      {
        name: "unknown key returns empty string",
        code: py`
          tm = TimeMap()
          tm.set("a", "x", 1)
          got = tm.get("b", 100)
          assert got == "", f"get('b', 100) returned {got!r}, expected ''"
        `,
      },
      {
        name: "keys are independent",
        code: py`
          tm = TimeMap()
          tm.set("love", "high", 10)
          tm.set("love", "low", 20)
          tm.set("hate", "meh", 15)
          checks = [("love", 5, ""), ("love", 10, "high"), ("love", 15, "high"),
                    ("love", 20, "low"), ("love", 25, "low"), ("hate", 14, ""), ("hate", 99, "meh")]
          for k, t, want in checks:
              got = tm.get(k, t)
              assert got == want, f"get({k!r}, {t}) returned {got!r}, expected {want!r}"
        `,
      },
      {
        name: "exact timestamp match among many",
        code: py`
          tm = TimeMap()
          for t in [1, 2, 4, 8, 16, 32]:
              tm.set("k", f"v{t}", t)
          checks = [(1, "v1"), (3, "v2"), (7, "v4"), (8, "v8"), (31, "v16"), (1000, "v32")]
          for t, want in checks:
              got = tm.get("k", t)
              assert got == want, f"get('k', {t}) returned {got!r}, expected {want!r}"
        `,
      },
      {
        name: "40000 sets then 40000 gets (get must be O(log n))",
        code: py`
          tm = TimeMap()
          n = 40000
          for i in range(n):
              tm.set("key", str(i), 2 * i + 1)
          for i in range(n):
              got = tm.get("key", 2 * i + 2)
              assert got == str(i), f"get('key', {2 * i + 2}) returned {got!r}, expected {str(i)!r}"
          got = tm.get("key", 0)
          assert got == "", f"get('key', 0) returned {got!r}, expected ''"
        `,
      },
    ],
    hints: [
      "Store, for each key, all of its (timestamp, value) pairs. Since timestamps arrive in increasing order, what property does that list have?",
      "Each key's list is already sorted by timestamp, so a lookup is a binary search for the last timestamp <= the query.",
      "Use a dict from key to two parallel lists (timestamps and values); set appends to both. For get, binary search (or bisect_right) the timestamps list; if the insertion point is 0 return \"\", otherwise return the value just before it.",
    ],
    solution: py`
      from bisect import bisect_right

      class TimeMap:
          def __init__(self):
              self._times: dict[str, list[int]] = {}
              self._values: dict[str, list[str]] = {}

          def set(self, key: str, value: str, timestamp: int) -> None:
              self._times.setdefault(key, []).append(timestamp)
              self._values.setdefault(key, []).append(value)

          def get(self, key: str, timestamp: int) -> str:
              times = self._times.get(key)
              if not times:
                  return ""
              i = bisect_right(times, timestamp)
              return self._values[key][i - 1] if i else ""
    `,
    complexity: "O(1) set, O(log n) get, O(n) space",
    explanation: md`
      Because timestamps for a key arrive strictly increasing, appending keeps each key's timestamp list sorted for free. A query wants the rightmost timestamp not exceeding the given time, which \`bisect_right\` finds in O(log n): the element just before the insertion point. If the insertion point is 0, every stored timestamp is later than the query, so the answer is \`""\`.
    `,
  },

  // --------------------------------------------------------------- Linked List
  {
    id: "reverse-linked-list",
    title: "Reverse Linked List",
    difficulty: "Easy",
    topic: "Linked List",
    tags: ["linked list"],
    prompt: md`
      Given the \`head\` of a singly linked list, reverse the list and return the new head.

      The list uses the provided \`ListNode\` class (fields \`val\` and \`next\`). An empty list is \`None\`.

      **Example**
      \`\`\`
      Input: head = [1,2,3,4,5]
      Output: [5,4,3,2,1]
      \`\`\`

      **Constraints:**
      - \`0 <= number of nodes <= 5000\`
      - \`-5000 <= Node.val <= 5000\`

      **Follow-up:** can you do it both iteratively and recursively?
    `,
    starter: py`
      def reverse_list(head: ListNode | None) -> ListNode | None:
          pass
    `,
    tests: [
      { call: "list_vals(reverse_list(build_list([1, 2, 3, 4, 5])))", expect: "[5, 4, 3, 2, 1]" },
      { call: "list_vals(reverse_list(build_list([1, 2])))", expect: "[2, 1]" },
      { call: "list_vals(reverse_list(build_list([])))", expect: "[]" },
      { call: "list_vals(reverse_list(build_list([7])))", expect: "[7]" },
      { call: "list_vals(reverse_list(build_list([3, 3, -1])))", expect: "[-1, 3, 3]" },
      { call: "list_vals(reverse_list(build_list(list(range(1500)))))", expect: "list(range(1499, -1, -1))" },
    ],
    hints: [
      "Each node's next pointer needs to point to the node that was before it.",
      "Walk the list once while remembering the previous node; be careful not to lose the rest of the list when you overwrite next.",
      "Keep prev = None and cur = head. Repeatedly save cur.next, point cur.next at prev, then advance prev to cur and cur to the saved node. When cur is None, prev is the new head.",
    ],
    solution: py`
      def reverse_list(head: ListNode | None) -> ListNode | None:
          prev = None
          cur = head
          while cur is not None:
              nxt = cur.next
              cur.next = prev
              prev, cur = cur, nxt
          return prev
    `,
    complexity: "O(n) time, O(1) space",
    explanation: md`
      We walk the list once and flip each node's pointer to its predecessor. Saving \`cur.next\` before overwriting it keeps access to the unreversed remainder. When the walk ends, \`prev\` is the old tail, which is the head of the reversed list. (A recursive version is elegant but uses O(n) stack space, which can hit Python's recursion limit on long lists.)
    `,
  },
  {
    id: "merge-two-sorted-lists",
    title: "Merge Two Sorted Lists",
    difficulty: "Easy",
    topic: "Linked List",
    tags: ["linked list", "two pointers"],
    prompt: md`
      You are given the heads of two sorted linked lists \`list1\` and \`list2\`. Merge them into one **sorted** list by splicing together their nodes, and return its head.

      **Example 1**
      \`\`\`
      Input: list1 = [1,2,4], list2 = [1,3,4]
      Output: [1,1,2,3,4,4]
      \`\`\`

      **Example 2**
      \`\`\`
      Input: list1 = [], list2 = [0]
      Output: [0]
      \`\`\`

      **Constraints:**
      - \`0 <=\` nodes in each list \`<= 5000\`
      - Both lists are sorted in non-decreasing order.
    `,
    starter: py`
      def merge_two_lists(list1: ListNode | None, list2: ListNode | None) -> ListNode | None:
          pass
    `,
    tests: [
      { call: "list_vals(merge_two_lists(build_list([1, 2, 4]), build_list([1, 3, 4])))", expect: "[1, 1, 2, 3, 4, 4]" },
      { call: "list_vals(merge_two_lists(build_list([]), build_list([])))", expect: "[]" },
      { call: "list_vals(merge_two_lists(build_list([]), build_list([0])))", expect: "[0]" },
      { call: "list_vals(merge_two_lists(build_list([5]), build_list([1, 2, 3])))", expect: "[1, 2, 3, 5]" },
      { call: "list_vals(merge_two_lists(build_list([-3, -1]), build_list([-2, 0, 10])))", expect: "[-3, -2, -1, 0, 10]" },
      { call: "list_vals(merge_two_lists(build_list([1, 1]), build_list([1])))", expect: "[1, 1, 1]" },
      {
        call: "list_vals(merge_two_lists(build_list(list(range(0, 3000, 2))), build_list(list(range(1, 3000, 2)))))",
        expect: "list(range(3000))",
      },
    ],
    hints: [
      "The smallest remaining node is always at the front of one of the two lists.",
      "A dummy head node makes it easy to append without special-casing the first element.",
      "Create a dummy node and a tail pointer. While both lists are non-empty, attach the smaller front node to tail and advance that list. Finally attach whichever list is left over.",
    ],
    solution: py`
      def merge_two_lists(list1: ListNode | None, list2: ListNode | None) -> ListNode | None:
          dummy = ListNode()
          tail = dummy
          while list1 is not None and list2 is not None:
              if list1.val <= list2.val:
                  tail.next, list1 = list1, list1.next
              else:
                  tail.next, list2 = list2, list2.next
              tail = tail.next
          tail.next = list1 if list1 is not None else list2
          return dummy.next
    `,
    complexity: "O(n + m) time, O(1) space",
    explanation: md`
      Like the merge step of merge sort, we repeatedly take the smaller of the two front nodes and append it to the result. The dummy node avoids special handling for the head. When one list runs out, the other is already sorted, so it is attached in one step.
    `,
  },
  {
    id: "linked-list-cycle",
    title: "Linked List Cycle",
    difficulty: "Easy",
    topic: "Linked List",
    tags: ["linked list", "fast and slow pointers"],
    prompt: md`
      Given \`head\`, the head of a linked list, return \`True\` if the list contains a **cycle** — some node can be reached again by repeatedly following \`next\` — and \`False\` otherwise.

      **Example 1**
      \`\`\`
      Input: head = [3,2,0,-4], tail connects to index 1
      Output: True
      \`\`\`

      **Example 2**
      \`\`\`
      Input: head = [1], no cycle
      Output: False
      \`\`\`

      **Constraints:**
      - \`0 <= number of nodes <= 10^4\`

      **Follow-up:** can you solve it with O(1) extra memory?
    `,
    starter: py`
      def has_cycle(head: ListNode | None) -> bool:
          pass
    `,
    tests: [
      {
        name: "[3,2,0,-4], tail -> index 1",
        code: py`
          nodes = [ListNode(v) for v in [3, 2, 0, -4]]
          for a, b in zip(nodes, nodes[1:]):
              a.next = b
          nodes[-1].next = nodes[1]
          got = has_cycle(nodes[0])
          assert got is True, f"has_cycle returned {got!r}, expected True"
        `,
      },
      {
        name: "[1,2], tail -> index 0",
        code: py`
          a, b = ListNode(1), ListNode(2)
          a.next, b.next = b, a
          got = has_cycle(a)
          assert got is True, f"has_cycle returned {got!r}, expected True"
        `,
      },
      {
        name: "single node pointing to itself",
        code: py`
          a = ListNode(1)
          a.next = a
          got = has_cycle(a)
          assert got is True, f"has_cycle returned {got!r}, expected True"
        `,
      },
      { call: "has_cycle(build_list([1]))", expect: "False" },
      { call: "has_cycle(None)", expect: "False" },
      { call: "has_cycle(build_list([1, 2, 3, 4, 5]))", expect: "False" },
      {
        name: "2000 nodes, tail -> index 1000",
        code: py`
          nodes = [ListNode(i) for i in range(2000)]
          for a, b in zip(nodes, nodes[1:]):
              a.next = b
          nodes[-1].next = nodes[1000]
          got = has_cycle(nodes[0])
          assert got is True, f"has_cycle returned {got!r}, expected True"
        `,
      },
    ],
    hints: [
      "Following next forever never terminates if there is a cycle. You need a way to notice you're going around in circles.",
      "You could remember visited nodes in a set — but there's an O(1)-memory trick using two pointers moving at different speeds.",
      "Advance a slow pointer one step and a fast pointer two steps at a time. If fast reaches None, there's no cycle; if slow and fast ever point to the same node, there is one.",
    ],
    solution: py`
      def has_cycle(head: ListNode | None) -> bool:
          slow = fast = head
          while fast is not None and fast.next is not None:
              slow = slow.next
              fast = fast.next.next
              if slow is fast:
                  return True
          return False
    `,
    complexity: "O(n) time, O(1) space",
    explanation: md`
      Floyd's tortoise-and-hare: the fast pointer moves two steps for every one step of the slow pointer. Without a cycle the fast pointer reaches the end. With a cycle, once both are inside it the gap between them shrinks by one node each step, so they must meet within one lap.
    `,
  },

  // --------------------------------------------------------------------- Trees
  {
    id: "maximum-depth-of-binary-tree",
    title: "Maximum Depth of Binary Tree",
    difficulty: "Easy",
    topic: "Trees",
    tags: ["tree", "dfs", "recursion"],
    prompt: md`
      Given the \`root\` of a binary tree, return its **maximum depth**: the number of nodes along the longest path from the root down to a leaf. An empty tree has depth 0.

      Trees use the provided \`TreeNode\` class (fields \`val\`, \`left\`, \`right\`). In the examples, trees are written in level order with \`None\` for missing children.

      **Example 1**
      \`\`\`
      Input: root = [3,9,20,None,None,15,7]
      Output: 3
      \`\`\`

      **Example 2**
      \`\`\`
      Input: root = [1,None,2]
      Output: 2
      \`\`\`

      **Constraints:**
      - \`0 <= number of nodes <= 10^4\`
    `,
    starter: py`
      def max_depth(root: TreeNode | None) -> int:
          pass
    `,
    tests: [
      { call: "max_depth(build_tree([3, 9, 20, None, None, 15, 7]))", expect: "3" },
      { call: "max_depth(build_tree([1, None, 2]))", expect: "2" },
      { call: "max_depth(build_tree([]))", expect: "0" },
      { call: "max_depth(build_tree([0]))", expect: "1" },
      { call: "max_depth(build_tree([1, 2, None, 3, None, 4]))", expect: "4" },
      { call: "max_depth(build_tree([1, 2, 3, 4, 5, 6, 7, 8]))", expect: "4" },
      { call: "max_depth(build_tree(list(range(1, 4096))))", expect: "12" },
    ],
    hints: [
      "The depth of a tree relates simply to the depths of its two subtrees.",
      "Recursion: depth(node) = 1 + the larger of depth(left) and depth(right), and an empty tree has depth 0.",
      "Either recurse as above, or do a breadth-first traversal level by level and count how many levels there are.",
    ],
    solution: py`
      def max_depth(root: TreeNode | None) -> int:
          if root is None:
              return 0
          depth = 0
          level = [root]
          while level:
              depth += 1
              level = [c for n in level for c in (n.left, n.right) if c is not None]
          return depth
    `,
    complexity: "O(n) time, O(w) space where w is the maximum width",
    explanation: md`
      We traverse the tree one level at a time, building the next level from the children of the current one, and count the levels. The number of levels is exactly the number of nodes on the longest root-to-leaf path. The recursive formulation 1 + max(depth(left), depth(right)) is equally valid.
    `,
  },
  {
    id: "invert-binary-tree",
    title: "Invert Binary Tree",
    difficulty: "Easy",
    topic: "Trees",
    tags: ["tree", "dfs", "recursion"],
    prompt: md`
      Given the \`root\` of a binary tree, invert it (mirror it left-to-right, swapping every node's left and right children) and return its root.

      **Example 1**
      \`\`\`
      Input: root = [4,2,7,1,3,6,9]
      Output: [4,7,2,9,6,3,1]
      \`\`\`

      **Example 2**
      \`\`\`
      Input: root = [2,1,3]
      Output: [2,3,1]
      \`\`\`

      **Constraints:**
      - \`0 <= number of nodes <= 100\`
    `,
    starter: py`
      def invert_tree(root: TreeNode | None) -> TreeNode | None:
          pass
    `,
    tests: [
      { call: "tree_vals(invert_tree(build_tree([4, 2, 7, 1, 3, 6, 9])))", expect: "[4, 7, 2, 9, 6, 3, 1]" },
      { call: "tree_vals(invert_tree(build_tree([2, 1, 3])))", expect: "[2, 3, 1]" },
      { call: "tree_vals(invert_tree(build_tree([])))", expect: "[]" },
      { call: "tree_vals(invert_tree(build_tree([1])))", expect: "[1]" },
      { call: "tree_vals(invert_tree(build_tree([1, 2])))", expect: "[1, None, 2]" },
      {
        call: "tree_vals(invert_tree(build_tree([1, 2, 3, 4, None, None, 5])))",
        expect: "[1, 3, 2, 5, None, None, 4]",
      },
    ],
    hints: [
      "Mirroring a tree means mirroring both subtrees and then swapping them.",
      "This is naturally recursive; the base case is an empty tree.",
      "For each node: swap node.left and node.right, then invert both children (recursively or with a stack/queue of nodes to process). Return the root.",
    ],
    solution: py`
      def invert_tree(root: TreeNode | None) -> TreeNode | None:
          if root is None:
              return None
          root.left, root.right = invert_tree(root.right), invert_tree(root.left)
          return root
    `,
    complexity: "O(n) time, O(h) space for the recursion",
    explanation: md`
      The mirror image of a tree is its root with the mirrored right subtree on the left and the mirrored left subtree on the right. Recursing on both children and assigning them swapped implements exactly that definition. Every node is visited once.
    `,
  },
  {
    id: "binary-tree-level-order-traversal",
    title: "Binary Tree Level Order Traversal",
    difficulty: "Medium",
    topic: "Trees",
    tags: ["tree", "bfs", "queue"],
    prompt: md`
      Given the \`root\` of a binary tree, return the level order traversal of its values: a list of levels, each level listing its values from left to right.

      **Example 1**
      \`\`\`
      Input: root = [3,9,20,None,None,15,7]
      Output: [[3],[9,20],[15,7]]
      \`\`\`

      **Example 2**
      \`\`\`
      Input: root = []
      Output: []
      \`\`\`

      **Constraints:**
      - \`0 <= number of nodes <= 2000\`
    `,
    starter: py`
      def level_order(root: TreeNode | None) -> list[list[int]]:
          pass
    `,
    tests: [
      { call: "level_order(build_tree([3, 9, 20, None, None, 15, 7]))", expect: "[[3], [9, 20], [15, 7]]" },
      { call: "level_order(build_tree([1]))", expect: "[[1]]" },
      { call: "level_order(build_tree([]))", expect: "[]" },
      { call: "level_order(build_tree([1, 2, 3, 4, 5, 6, 7]))", expect: "[[1], [2, 3], [4, 5, 6, 7]]" },
      { call: "level_order(build_tree([1, 2, None, 3, None, 4]))", expect: "[[1], [2], [3], [4]]" },
      { call: "level_order(build_tree([1, None, 2, None, 3]))", expect: "[[1], [2], [3]]" },
      { call: "level_order(build_tree([1, 2, 3, None, 4, 5]))", expect: "[[1], [2, 3], [4, 5]]" },
    ],
    hints: [
      "Visiting nodes level by level is breadth-first search.",
      "Use a queue, and process it one whole level at a time so you know where each level ends.",
      "Start with a queue holding the root (if any). While it's non-empty, take its current length L, pop L nodes collecting their values into one list and pushing their non-None children, then append that list to the result.",
    ],
    solution: py`
      from collections import deque

      def level_order(root: TreeNode | None) -> list[list[int]]:
          if root is None:
              return []
          out: list[list[int]] = []
          queue = deque([root])
          while queue:
              level = []
              for _ in range(len(queue)):
                  node = queue.popleft()
                  level.append(node.val)
                  if node.left is not None:
                      queue.append(node.left)
                  if node.right is not None:
                      queue.append(node.right)
              out.append(level)
          return out
    `,
    complexity: "O(n) time, O(w) space where w is the maximum width",
    explanation: md`
      BFS visits nodes in order of distance from the root, left to right. Recording the queue's length at the start of each round tells us exactly how many nodes belong to the current level, so we can group them. Children enqueued during the round form the next level.
    `,
  },
  {
    id: "validate-binary-search-tree",
    title: "Validate Binary Search Tree",
    difficulty: "Medium",
    topic: "Trees",
    tags: ["tree", "dfs", "bst"],
    prompt: md`
      Given the \`root\` of a binary tree, determine whether it is a valid **binary search tree** (BST):

      - The left subtree of a node contains only values **strictly less** than the node's value.
      - The right subtree of a node contains only values **strictly greater** than the node's value.
      - Both subtrees are themselves valid BSTs.

      An empty tree is a valid BST.

      **Example 1**
      \`\`\`
      Input: root = [2,1,3]
      Output: True
      \`\`\`

      **Example 2**
      \`\`\`
      Input: root = [5,1,4,None,None,3,6]
      Output: False
      Explanation: the root is 5 but its right child is 4.
      \`\`\`

      **Constraints:**
      - \`0 <= number of nodes <= 10^4\`
      - \`-2^31 <= Node.val <= 2^31 - 1\`
    `,
    starter: py`
      def is_valid_bst(root: TreeNode | None) -> bool:
          pass
    `,
    tests: [
      { call: "is_valid_bst(build_tree([2, 1, 3]))", expect: "True" },
      { call: "is_valid_bst(build_tree([5, 1, 4, None, None, 3, 6]))", expect: "False" },
      { call: "is_valid_bst(build_tree([5, 4, 6, None, None, 3, 7]))", expect: "False" },
      { call: "is_valid_bst(build_tree([1, 1]))", expect: "False" },
      { call: "is_valid_bst(build_tree([]))", expect: "True" },
      { call: "is_valid_bst(build_tree([2147483647]))", expect: "True" },
      { call: "is_valid_bst(build_tree([-5, -10, 0]))", expect: "True" },
      { call: "is_valid_bst(build_tree([8, 4, 12, 2, 6, 10, 14, 1, 3, 5, 9]))", expect: "False" },
    ],
    hints: [
      "Checking only each node against its direct children isn't enough — a node deep in the right subtree must still be greater than the root.",
      "Every node must lie within an allowed (low, high) range inherited from its ancestors.",
      "Recurse with bounds: the root may be anything; going left, the upper bound becomes the parent's value; going right, the lower bound becomes the parent's value. Fail if any node is not strictly inside its bounds. (Alternatively, an in-order traversal must be strictly increasing.)",
    ],
    solution: py`
      def is_valid_bst(root: TreeNode | None) -> bool:
          stack: list[tuple[TreeNode | None, float, float]] = [(root, float("-inf"), float("inf"))]
          while stack:
              node, low, high = stack.pop()
              if node is None:
                  continue
              if not (low < node.val < high):
                  return False
              stack.append((node.left, low, node.val))
              stack.append((node.right, node.val, high))
          return True
    `,
    complexity: "O(n) time, O(h) space",
    explanation: md`
      The BST property is global: each node must be greater than every ancestor it sits to the right of and less than every ancestor it sits to the left of. Carrying an open interval (low, high) down the tree captures exactly that, tightening the upper bound when we go left and the lower bound when we go right. A single node outside its interval makes the tree invalid.
    `,
  },
  {
    id: "lowest-common-ancestor-of-a-bst",
    title: "Lowest Common Ancestor of a BST",
    difficulty: "Medium",
    topic: "Trees",
    tags: ["tree", "bst"],
    prompt: md`
      Given the \`root\` of a binary search tree and two nodes \`p\` and \`q\` in it, return their **lowest common ancestor** (LCA): the deepest node that has both \`p\` and \`q\` as descendants. A node counts as a descendant of itself.

      Return the node object itself (not its value). All values are unique, and \`p\` and \`q\` are guaranteed to be in the tree.

      **Example 1**
      \`\`\`
      Input: root = [6,2,8,0,4,7,9,None,None,3,5], p = 2, q = 8
      Output: 6
      \`\`\`

      **Example 2**
      \`\`\`
      Input: root = [6,2,8,0,4,7,9,None,None,3,5], p = 2, q = 4
      Output: 2
      Explanation: a node can be its own ancestor.
      \`\`\`

      **Constraints:**
      - \`2 <= number of nodes <= 10^5\`
      - \`p != q\`
    `,
    starter: py`
      def lowest_common_ancestor(root: TreeNode, p: TreeNode, q: TreeNode) -> TreeNode:
          pass
    `,
    tests: [
      lcaTest([6, 2, 8, 0, 4, 7, 9, null, null, 3, 5], 2, 8, 6),
      lcaTest([6, 2, 8, 0, 4, 7, 9, null, null, 3, 5], 2, 4, 2),
      lcaTest([6, 2, 8, 0, 4, 7, 9, null, null, 3, 5], 3, 5, 4),
      lcaTest([6, 2, 8, 0, 4, 7, 9, null, null, 3, 5], 9, 7, 8),
      lcaTest([6, 2, 8, 0, 4, 7, 9, null, null, 3, 5], 0, 5, 2),
      lcaTest([2, 1], 2, 1, 2),
      lcaTest([5, 3, 8, 1, 4, 7, 9, 0, 2], 0, 9, 5),
    ],
    hints: [
      "In a BST, comparing a value with a node tells you which side of that node it lives on.",
      "If p and q are on different sides of a node (or one of them is the node), that node is where their paths to the root diverge.",
      "Start at the root. If both p and q are smaller than the current value, move left; if both are larger, move right; otherwise the current node is the LCA.",
    ],
    solution: py`
      def lowest_common_ancestor(root: TreeNode, p: TreeNode, q: TreeNode) -> TreeNode:
          node = root
          while node is not None:
              if p.val < node.val and q.val < node.val:
                  node = node.left
              elif p.val > node.val and q.val > node.val:
                  node = node.right
              else:
                  return node
          return node
    `,
    complexity: "O(h) time, O(1) space",
    explanation: md`
      The BST ordering tells us where p and q are relative to any node. While both are on the same side, the LCA must also be on that side, so we descend. The first node where they split (or that equals one of them) is an ancestor of both, and no deeper node can be, since going either way would lose one of them.
    `,
  },
];
