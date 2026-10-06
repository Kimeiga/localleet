import { py, md } from "./_util.js";

export default [
  // ------------------------------------------------------------------ Heap / Priority Queue
  {
    id: "kth-largest-element-in-an-array",
    title: "Kth Largest Element in an Array",
    difficulty: "Medium",
    topic: "Heap / Priority Queue",
    tags: ["heap", "quickselect", "sorting"],
    prompt: md`
      Given an integer array \`nums\` and an integer \`k\`, return the \`k\`-th largest element in the array.

      Note that it is the \`k\`-th largest element in sorted order, not the \`k\`-th distinct element.

      Can you solve it without fully sorting the array?

      **Example 1**
      \`\`\`
      Input: nums = [3,2,1,5,6,4], k = 2
      Output: 5
      \`\`\`

      **Example 2**
      \`\`\`
      Input: nums = [3,2,3,1,2,4,5,5,6], k = 4
      Output: 4
      \`\`\`

      **Constraints:**
      - \`1 <= k <= len(nums) <= 10^5\`
      - \`-10^4 <= nums[i] <= 10^4\` (larger values appear in tests too)
    `,
    starter: py`
      def find_kth_largest(nums: list[int], k: int) -> int:
          pass
    `,
    tests: [
      { call: "find_kth_largest([3, 2, 1, 5, 6, 4], 2)", expect: "5" },
      { call: "find_kth_largest([3, 2, 3, 1, 2, 4, 5, 5, 6], 4)", expect: "4" },
      { call: "find_kth_largest([1], 1)", expect: "1" },
      { call: "find_kth_largest([-1, -1], 2)", expect: "-1" },
      { call: "find_kth_largest([7, 10, 4, 3, 20, 15], 6)", expect: "3" },
      { call: "find_kth_largest([2, 2, 2, 2, 2], 3)", expect: "2" },
      { call: "find_kth_largest([(i * 7919) % 100003 for i in range(100000)], 50000)", expect: "50000" },
    ],
    hints: [
      "You only care about the k biggest values seen so far; everything smaller can be forgotten.",
      "Keep a min-heap of size k. Its smallest element is a candidate for the answer.",
      "Push each number onto a min-heap; whenever the heap grows past k, pop the smallest. After processing all numbers the heap top is the k-th largest. (Quickselect is an average O(n) alternative.)",
    ],
    solution: py`
      import heapq

      def find_kth_largest(nums: list[int], k: int) -> int:
          heap: list[int] = []
          for x in nums:
              if len(heap) < k:
                  heapq.heappush(heap, x)
              elif x > heap[0]:
                  heapq.heapreplace(heap, x)
          return heap[0]
    `,
    complexity: "O(n log k) time, O(k) space",
    explanation: md`
      A min-heap of size \`k\` always holds the \`k\` largest values seen so far, and its root is the smallest of them.
      Each new value either beats the root (replace it) or is irrelevant. After the scan the root is exactly the \`k\`-th largest.
      This avoids an O(n log n) full sort; quickselect can bring the average down to O(n).
    `,
  },
  {
    id: "k-closest-points-to-origin",
    title: "K Closest Points to Origin",
    difficulty: "Medium",
    topic: "Heap / Priority Queue",
    tags: ["heap", "geometry", "sorting"],
    prompt: md`
      Given an array of \`points\` where \`points[i] = [x_i, y_i]\` is a point on the X-Y plane and an integer \`k\`,
      return the \`k\` closest points to the origin \`(0, 0)\`.

      Distance is the Euclidean distance \`sqrt(x^2 + y^2)\`. You may return the answer in **any order**.
      The answer is guaranteed to be unique (apart from order).

      **Example 1**
      \`\`\`
      Input: points = [[1,3],[-2,2]], k = 1
      Output: [[-2,2]]
      \`\`\`

      **Example 2**
      \`\`\`
      Input: points = [[3,3],[5,-1],[-2,4]], k = 2
      Output: [[3,3],[-2,4]]
      \`\`\`

      **Constraints:**
      - \`1 <= k <= len(points) <= 10^4\`
      - \`-10^4 <= x_i, y_i <= 10^4\`
    `,
    starter: py`
      def k_closest(points: list[list[int]], k: int) -> list[list[int]]:
          pass
    `,
    tests: [
      { call: "k_closest([[1, 3], [-2, 2]], 1)", expect: "[[-2, 2]]", cmp: "sorted" },
      { call: "k_closest([[3, 3], [5, -1], [-2, 4]], 2)", expect: "[[3, 3], [-2, 4]]", cmp: "sorted" },
      { call: "k_closest([[0, 0]], 1)", expect: "[[0, 0]]", cmp: "sorted" },
      { call: "k_closest([[1, 1], [2, 2], [3, 3]], 3)", expect: "[[1, 1], [2, 2], [3, 3]]", cmp: "sorted" },
      { call: "k_closest([[-5, 0], [0, 4], [3, 0], [10, 10]], 2)", expect: "[[3, 0], [0, 4]]", cmp: "sorted" },
      { call: "k_closest([[i, -i] for i in range(9999, -1, -1)], 3)", expect: "[[0, 0], [1, -1], [2, -2]]", cmp: "sorted" },
    ],
    hints: [
      "You never need the actual square root: comparing x^2 + y^2 gives the same ordering.",
      "This is a 'top k smallest' problem, which a heap handles well.",
      "Either use heapq.nsmallest with the squared distance as key, or keep a max-heap of size k (store negated distances) and pop whenever it exceeds k.",
    ],
    solution: py`
      import heapq

      def k_closest(points: list[list[int]], k: int) -> list[list[int]]:
          heap: list[tuple[int, int, int]] = []  # (-dist, x, y): max-heap of size k
          for x, y in points:
              d = x * x + y * y
              if len(heap) < k:
                  heapq.heappush(heap, (-d, x, y))
              elif -d > heap[0][0]:
                  heapq.heapreplace(heap, (-d, x, y))
          return [[x, y] for _, x, y in heap]
    `,
    complexity: "O(n log k) time, O(k) space",
    explanation: md`
      Squared distance preserves ordering, so we compare \`x*x + y*y\` directly.
      A max-heap of size \`k\` (simulated with negated keys in Python's min-heap) keeps the \`k\` closest points so far;
      a new point only enters if it is closer than the farthest point currently kept.
    `,
  },
  {
    id: "merge-k-sorted-lists",
    title: "Merge K Sorted Lists",
    difficulty: "Hard",
    topic: "Heap / Priority Queue",
    tags: ["heap", "linked-list", "divide-and-conquer"],
    prompt: md`
      You are given a list of \`k\` linked lists \`lists\`, each sorted in ascending order.
      Merge all of them into one sorted linked list and return its head.

      A \`ListNode\` class (\`val\`, \`next\`) is provided. In tests, \`build_list\` / \`list_vals\` convert between Python lists and linked lists.

      **Example 1**
      \`\`\`
      Input: lists = [[1,4,5],[1,3,4],[2,6]]
      Output: [1,1,2,3,4,4,5,6]
      \`\`\`

      **Example 2**
      \`\`\`
      Input: lists = []
      Output: []
      \`\`\`

      **Constraints:**
      - \`0 <= k <= 10^4\`
      - Each list is sorted ascending; total number of nodes \`<= 10^4\`
    `,
    starter: py`
      def merge_k_lists(lists: list[ListNode | None]) -> ListNode | None:
          pass
    `,
    tests: [
      { call: "list_vals(merge_k_lists([build_list([1, 4, 5]), build_list([1, 3, 4]), build_list([2, 6])]))", expect: "[1, 1, 2, 3, 4, 4, 5, 6]" },
      { call: "list_vals(merge_k_lists([]))", expect: "[]" },
      { call: "list_vals(merge_k_lists([None]))", expect: "[]" },
      { call: "list_vals(merge_k_lists([build_list([5])]))", expect: "[5]" },
      { call: "list_vals(merge_k_lists([None, build_list([-2, 0, 7]), None, build_list([-3, 7])]))", expect: "[-3, -2, 0, 7, 7]" },
      { call: "list_vals(merge_k_lists([build_list([2, 2]), build_list([2]), build_list([1, 2, 3])]))", expect: "[1, 2, 2, 2, 2, 3]" },
      { call: "list_vals(merge_k_lists([build_list(list(range(i, 3000, 100))) for i in range(100)]))", expect: "list(range(3000))" },
    ],
    hints: [
      "At every step the next node of the result is the smallest among the current heads of all lists.",
      "A min-heap of the k current heads lets you find that smallest head in O(log k).",
      "Push (value, list index, node) for each non-empty head into a heap (the index breaks ties, since ListNodes are not comparable). Repeatedly pop the smallest, append it to the result, and push its next node if any.",
    ],
    solution: py`
      import heapq

      def merge_k_lists(lists: list[ListNode | None]) -> ListNode | None:
          heap = [(node.val, i, node) for i, node in enumerate(lists) if node]
          heapq.heapify(heap)
          dummy = tail = ListNode()
          while heap:
              _, i, node = heapq.heappop(heap)
              tail.next = node
              tail = node
              if node.next:
                  heapq.heappush(heap, (node.next.val, i, node.next))
          tail.next = None
          return dummy.next
    `,
    complexity: "O(N log k) time for N total nodes, O(k) extra space",
    explanation: md`
      The heap always contains at most one node per list: that list's current head.
      Popping the minimum gives the next node of the merged list, and pushing its successor keeps the invariant.
      The list index is included in each heap entry as a tie-breaker so Python never has to compare two \`ListNode\` objects.
    `,
  },
  {
    id: "task-scheduler",
    title: "Task Scheduler",
    difficulty: "Medium",
    topic: "Heap / Priority Queue",
    tags: ["greedy", "heap", "counting"],
    prompt: md`
      You are given a list of CPU \`tasks\`, each labeled with an uppercase letter, and a cooldown \`n\`.
      Each interval the CPU can either complete one task or stay idle. Two tasks with the **same** label must be
      separated by at least \`n\` intervals.

      Return the minimum number of intervals needed to complete all tasks.

      **Example 1**
      \`\`\`
      Input: tasks = ["A","A","A","B","B","B"], n = 2
      Output: 8
      Explanation: A -> B -> idle -> A -> B -> idle -> A -> B
      \`\`\`

      **Example 2**
      \`\`\`
      Input: tasks = ["A","A","A","B","B","B"], n = 0
      Output: 6
      \`\`\`

      **Constraints:**
      - \`1 <= len(tasks) <= 10^4\`
      - \`0 <= n <= 100\`
    `,
    starter: py`
      def least_interval(tasks: list[str], n: int) -> int:
          pass
    `,
    tests: [
      { call: "least_interval(['A', 'A', 'A', 'B', 'B', 'B'], 2)", expect: "8" },
      { call: "least_interval(['A', 'A', 'A', 'B', 'B', 'B'], 0)", expect: "6" },
      { call: "least_interval(['A', 'A', 'A', 'A', 'A', 'A', 'B', 'C', 'D', 'E', 'F', 'G'], 2)", expect: "16" },
      { call: "least_interval(['A', 'C', 'A', 'B', 'D', 'B'], 1)", expect: "6" },
      { call: "least_interval(['A', 'A', 'A', 'B', 'B', 'B'], 3)", expect: "10" },
      { call: "least_interval(['A'], 5)", expect: "1" },
      { call: "least_interval(list('ABCDEFGHIJ') * 1000, 50)", expect: "50959" },
    ],
    hints: [
      "The most frequent task dictates the shape of the schedule.",
      "Picture the most frequent task laid out with n gaps between each occurrence; other tasks fill those gaps.",
      "If the max frequency is f and m tasks share it, the frame needs (f - 1) * (n + 1) + m slots. If there are more tasks than that, no idling is needed and the answer is just len(tasks). Take the max of the two.",
    ],
    solution: py`
      from collections import Counter

      def least_interval(tasks: list[str], n: int) -> int:
          counts = Counter(tasks).values()
          f = max(counts)
          m = sum(1 for c in counts if c == f)
          return max(len(tasks), (f - 1) * (n + 1) + m)
    `,
    complexity: "O(t) time, O(1) space (at most 26 labels)",
    explanation: md`
      Arrange the most frequent task into \`f\` rows of width \`n + 1\`; the last row only holds the \`m\` tasks tied for max frequency,
      giving \`(f - 1) * (n + 1) + m\` slots. Every other task fits into the idle slots of the earlier rows.
      If there are more tasks than slots, the rows simply widen and no idle time is needed, so the answer is \`len(tasks)\`.
      A max-heap simulation of each \`n + 1\` window gives the same result less directly.
    `,
  },
  {
    id: "find-median-from-data-stream",
    title: "Find Median from Data Stream",
    difficulty: "Hard",
    topic: "Heap / Priority Queue",
    tags: ["heap", "design", "two-heaps"],
    prompt: md`
      The **median** is the middle value of an ordered list. If the list has an even size, it is the mean of the two middle values.

      Implement the \`MedianFinder\` class:
      - \`MedianFinder()\` initializes the object.
      - \`add_num(num: int) -> None\` adds an integer from the stream.
      - \`find_median() -> float\` returns the median of all elements so far.

      **Example**
      \`\`\`
      mf = MedianFinder()
      mf.add_num(1)
      mf.add_num(2)
      mf.find_median()  # 1.5
      mf.add_num(3)
      mf.find_median()  # 2.0
      \`\`\`

      **Constraints:**
      - \`-10^5 <= num <= 10^5\`
      - \`find_median\` is only called after at least one \`add_num\`
      - Up to \`5 * 10^4\` calls in total; aim for \`O(log n)\` per \`add_num\`
    `,
    starter: py`
      class MedianFinder:
          def __init__(self):
              pass

          def add_num(self, num: int) -> None:
              pass

          def find_median(self) -> float:
              pass
    `,
    tests: [
      { name: "example", code: py`
          mf = MedianFinder()
          mf.add_num(1); mf.add_num(2)
          m = mf.find_median()
          assert m == 1.5, f"after [1, 2]: find_median() returned {m!r}, expected 1.5"
          mf.add_num(3)
          m = mf.find_median()
          assert m == 2.0, f"after [1, 2, 3]: find_median() returned {m!r}, expected 2.0"
        ` },
      { name: "single element", code: py`
          mf = MedianFinder()
          mf.add_num(-7)
          m = mf.find_median()
          assert m == -7, f"after [-7]: find_median() returned {m!r}, expected -7.0"
        ` },
      { name: "descending inserts", code: py`
          mf = MedianFinder()
          seen = []
          for x in [10, 8, 6, 4, 2]:
              mf.add_num(x); seen.append(x)
              s = sorted(seen); n = len(s)
              exp = s[n // 2] if n % 2 else (s[n // 2 - 1] + s[n // 2]) / 2
              m = mf.find_median()
              assert m == exp, f"after {seen}: find_median() returned {m!r}, expected {exp}"
        ` },
      { name: "duplicates and negatives", code: py`
          mf = MedianFinder()
          seen = []
          for x in [-1, -1, 5, -1, 3, 3, 0, -100000, 100000]:
              mf.add_num(x); seen.append(x)
              s = sorted(seen); n = len(s)
              exp = s[n // 2] if n % 2 else (s[n // 2 - 1] + s[n // 2]) / 2
              m = mf.find_median()
              assert m == exp, f"after {seen}: find_median() returned {m!r}, expected {exp}"
        ` },
      { name: "median is a float average", code: py`
          mf = MedianFinder()
          mf.add_num(2); mf.add_num(3)
          m = mf.find_median()
          assert m == 2.5, f"after [2, 3]: find_median() returned {m!r}, expected 2.5"
        ` },
      { name: "large stream (50,000 ops)", code: py`
          mf = MedianFinder()
          vals = [((i * 7919) % 20011) - 10000 for i in range(25000)]
          for i, x in enumerate(vals):
              mf.add_num(x)
              mf.find_median()
          s = sorted(vals)
          exp = (s[12499] + s[12500]) / 2
          m = mf.find_median()
          assert m == exp, f"final find_median() returned {m!r}, expected {exp}"
        ` },
    ],
    hints: [
      "Sorting after every insert is too slow. You only ever need the one or two middle elements.",
      "Split the numbers into a lower half and an upper half, each kept in a heap.",
      "Keep a max-heap for the lower half (store negatives in heapq) and a min-heap for the upper half. On insert, push to the lower heap, move its max to the upper heap, then if the upper heap is larger, move its min back. The median is the lower heap's top, or the average of both tops when sizes are equal.",
    ],
    solution: py`
      import heapq

      class MedianFinder:
          def __init__(self):
              self.lo: list[int] = []  # max-heap via negation (lower half)
              self.hi: list[int] = []  # min-heap (upper half)

          def add_num(self, num: int) -> None:
              heapq.heappush(self.lo, -num)
              heapq.heappush(self.hi, -heapq.heappop(self.lo))
              if len(self.hi) > len(self.lo):
                  heapq.heappush(self.lo, -heapq.heappop(self.hi))

          def find_median(self) -> float:
              if len(self.lo) > len(self.hi):
                  return float(-self.lo[0])
              return (-self.lo[0] + self.hi[0]) / 2
    `,
    complexity: "O(log n) per add_num, O(1) per find_median, O(n) space",
    explanation: md`
      Two heaps hold the lower and upper halves, with every element of \`lo\` at most every element of \`hi\`, and \`lo\` holding the same number of elements or one more.
      Routing each new number through \`lo\` and then \`hi\` keeps the ordering invariant; the final rebalance keeps the sizes right.
      The median is then always sitting at the heap tops.
    `,
  },

  // ------------------------------------------------------------------ Graphs
  {
    id: "number-of-islands",
    title: "Number of Islands",
    difficulty: "Medium",
    topic: "Graphs",
    tags: ["bfs", "dfs", "grid", "union-find"],
    prompt: md`
      Given an \`m x n\` grid of \`"1"\` (land) and \`"0"\` (water), return the number of islands.

      An island is surrounded by water and formed by connecting adjacent land cells **horizontally or vertically**.
      You may assume all four edges of the grid are surrounded by water.

      **Example 1**
      \`\`\`
      Input: grid = [
        ["1","1","1","1","0"],
        ["1","1","0","1","0"],
        ["1","1","0","0","0"],
        ["0","0","0","0","0"]
      ]
      Output: 1
      \`\`\`

      **Example 2**
      \`\`\`
      Input: grid = [
        ["1","1","0","0","0"],
        ["1","1","0","0","0"],
        ["0","0","1","0","0"],
        ["0","0","0","1","1"]
      ]
      Output: 3
      \`\`\`

      **Constraints:**
      - \`1 <= m, n <= 300\`
      - \`grid[i][j]\` is \`"0"\` or \`"1"\`
    `,
    starter: py`
      def num_islands(grid: list[list[str]]) -> int:
          pass
    `,
    tests: [
      { call: "num_islands([['1','1','1','1','0'],['1','1','0','1','0'],['1','1','0','0','0'],['0','0','0','0','0']])", expect: "1" },
      { call: "num_islands([['1','1','0','0','0'],['1','1','0','0','0'],['0','0','1','0','0'],['0','0','0','1','1']])", expect: "3" },
      { call: "num_islands([['0','0'],['0','0']])", expect: "0" },
      { call: "num_islands([['1']])", expect: "1" },
      { call: "num_islands([['1','0','1'],['0','1','0'],['1','0','1']])", expect: "5" },
      { call: "num_islands([['1','1','1'],['0','1','0'],['1','1','1']])", expect: "1" },
      { call: "num_islands([['1' if r % 2 == 0 else '0' for c in range(300)] for r in range(300)])", expect: "150" },
      { call: "num_islands([['1'] * 200 for _ in range(200)])", expect: "1" },
    ],
    hints: [
      "Every time you find a land cell you haven't seen, you've found a new island.",
      "When you find a new island, flood-fill it (BFS or DFS) so none of its cells are counted again.",
      "Scan every cell; on an unvisited '1', increment the count and run a BFS/DFS that marks all connected '1's as visited (or sets them to '0'). For large grids prefer an explicit stack/queue over recursion to avoid Python's recursion limit.",
    ],
    solution: py`
      def num_islands(grid: list[list[str]]) -> int:
          if not grid:
              return 0
          rows, cols = len(grid), len(grid[0])
          seen = [[False] * cols for _ in range(rows)]
          count = 0
          for r in range(rows):
              for c in range(cols):
                  if grid[r][c] != "1" or seen[r][c]:
                      continue
                  count += 1
                  seen[r][c] = True
                  stack = [(r, c)]
                  while stack:
                      i, j = stack.pop()
                      for ni, nj in ((i + 1, j), (i - 1, j), (i, j + 1), (i, j - 1)):
                          if 0 <= ni < rows and 0 <= nj < cols and grid[ni][nj] == "1" and not seen[ni][nj]:
                              seen[ni][nj] = True
                              stack.append((ni, nj))
          return count
    `,
    complexity: "O(m·n) time, O(m·n) space",
    explanation: md`
      Each island is a connected component of land cells. Scanning the grid, the first unvisited land cell of an island triggers a flood fill
      that marks the entire component, so each island is counted exactly once. Each cell is pushed at most once, giving linear time.
      An explicit stack avoids Python's recursion limit on large islands.
    `,
  },
  {
    id: "rotting-oranges",
    title: "Rotting Oranges",
    difficulty: "Medium",
    topic: "Graphs",
    tags: ["bfs", "grid", "multi-source-bfs"],
    prompt: md`
      You are given an \`m x n\` grid where each cell is:
      - \`0\`: empty
      - \`1\`: a fresh orange
      - \`2\`: a rotten orange

      Every minute, any fresh orange 4-directionally adjacent to a rotten orange becomes rotten.

      Return the minimum number of minutes until no fresh orange remains. If that is impossible, return \`-1\`.

      **Example 1**
      \`\`\`
      Input: grid = [[2,1,1],[1,1,0],[0,1,1]]
      Output: 4
      \`\`\`

      **Example 2**
      \`\`\`
      Input: grid = [[2,1,1],[0,1,1],[1,0,1]]
      Output: -1
      Explanation: The orange in the bottom-left corner is never reached.
      \`\`\`

      **Example 3**
      \`\`\`
      Input: grid = [[0,2]]
      Output: 0
      \`\`\`

      **Constraints:**
      - \`1 <= m, n <= 100\`
      - \`grid[i][j]\` is \`0\`, \`1\`, or \`2\`
    `,
    starter: py`
      def oranges_rotting(grid: list[list[int]]) -> int:
          pass
    `,
    tests: [
      { call: "oranges_rotting([[2, 1, 1], [1, 1, 0], [0, 1, 1]])", expect: "4" },
      { call: "oranges_rotting([[2, 1, 1], [0, 1, 1], [1, 0, 1]])", expect: "-1" },
      { call: "oranges_rotting([[0, 2]])", expect: "0" },
      { call: "oranges_rotting([[0]])", expect: "0" },
      { call: "oranges_rotting([[1]])", expect: "-1" },
      { call: "oranges_rotting([[2, 1, 1, 1, 2]])", expect: "2" },
      { call: "oranges_rotting([[2, 2], [1, 1], [0, 0], [2, 0]])", expect: "1" },
      { call: "oranges_rotting([[2] + [1] * 99] + [[1] * 100 for _ in range(99)])", expect: "198" },
    ],
    hints: [
      "All rotten oranges spread at the same time, so think in 'waves' rather than one orange at a time.",
      "Breadth-first search starting from every rotten orange simultaneously (multi-source BFS) processes the grid minute by minute.",
      "Put every rotten cell in a queue and count fresh cells. Process the queue level by level; each level rots its fresh neighbours and costs one minute. When the queue empties, return the minutes if no fresh oranges remain, else -1.",
    ],
    solution: py`
      from collections import deque

      def oranges_rotting(grid: list[list[int]]) -> int:
          rows, cols = len(grid), len(grid[0])
          grid = [row[:] for row in grid]
          queue = deque()
          fresh = 0
          for r in range(rows):
              for c in range(cols):
                  if grid[r][c] == 2:
                      queue.append((r, c))
                  elif grid[r][c] == 1:
                      fresh += 1
          minutes = 0
          while queue and fresh:
              minutes += 1
              for _ in range(len(queue)):
                  r, c = queue.popleft()
                  for nr, nc in ((r + 1, c), (r - 1, c), (r, c + 1), (r, c - 1)):
                      if 0 <= nr < rows and 0 <= nc < cols and grid[nr][nc] == 1:
                          grid[nr][nc] = 2
                          fresh -= 1
                          queue.append((nr, nc))
          return minutes if fresh == 0 else -1
    `,
    complexity: "O(m·n) time, O(m·n) space",
    explanation: md`
      Starting BFS from all rotten oranges at once means each BFS level corresponds to exactly one minute of spreading,
      and each fresh orange is reached at the earliest possible minute. Tracking the fresh count lets us stop early and detect
      unreachable oranges (count still positive when the queue runs dry).
    `,
  },
  {
    id: "pacific-atlantic-water-flow",
    title: "Pacific Atlantic Water Flow",
    difficulty: "Medium",
    topic: "Graphs",
    tags: ["bfs", "dfs", "grid"],
    prompt: md`
      An \`m x n\` island borders the **Pacific Ocean** on its top and left edges and the **Atlantic Ocean** on its bottom and right edges.
      \`heights[r][c]\` is the height of each cell.

      Rain water flows from a cell to a 4-directionally adjacent cell if the neighbour's height is **less than or equal to** the current height.
      Water flows from any edge cell directly into the adjacent ocean.

      Return a list of all coordinates \`[r, c]\` from which water can flow to **both** oceans, in any order.

      **Example**
      \`\`\`
      Input: heights = [[1,2,2,3,5],
                        [3,2,3,4,4],
                        [2,4,5,3,1],
                        [6,7,1,4,5],
                        [5,1,1,2,4]]
      Output: [[0,4],[1,3],[1,4],[2,2],[3,0],[3,1],[4,0]]
      \`\`\`

      **Constraints:**
      - \`1 <= m, n <= 200\`
      - \`0 <= heights[r][c] <= 10^5\`
    `,
    starter: py`
      def pacific_atlantic(heights: list[list[int]]) -> list[list[int]]:
          pass
    `,
    tests: [
      { call: "pacific_atlantic([[1,2,2,3,5],[3,2,3,4,4],[2,4,5,3,1],[6,7,1,4,5],[5,1,1,2,4]])", expect: "[[0,4],[1,3],[1,4],[2,2],[3,0],[3,1],[4,0]]", cmp: "sorted" },
      { call: "pacific_atlantic([[1]])", expect: "[[0, 0]]", cmp: "sorted" },
      { call: "pacific_atlantic([[1, 1], [1, 1]])", expect: "[[0, 0], [0, 1], [1, 0], [1, 1]]", cmp: "sorted" },
      { call: "pacific_atlantic([[1, 2], [4, 3]])", expect: "[[0, 1], [1, 0], [1, 1]]", cmp: "sorted" },
      { call: "pacific_atlantic([[5, 4, 3], [4, 9, 2], [3, 2, 1]])", expect: "[[0, 0], [0, 1], [0, 2], [1, 0], [1, 1], [2, 0]]", cmp: "sorted" },
      { call: "pacific_atlantic([[r + c for c in range(100)] for r in range(100)])", expect: "[[99, c] for c in range(100)] + [[r, 99] for r in range(99)]", cmp: "sorted" },
    ],
    hints: [
      "Checking every cell by simulating where its water goes is slow. Try reversing the direction of flow.",
      "Start from the ocean edges and walk 'uphill' (to neighbours with height >= current). Every cell you reach can drain into that ocean.",
      "Run one BFS/DFS from all Pacific edge cells and another from all Atlantic edge cells, each moving only to neighbours at least as high. Return the cells present in both reachable sets.",
    ],
    solution: py`
      def pacific_atlantic(heights: list[list[int]]) -> list[list[int]]:
          rows, cols = len(heights), len(heights[0])

          def reach(starts: list[tuple[int, int]]) -> set[tuple[int, int]]:
              seen = set(starts)
              stack = list(starts)
              while stack:
                  r, c = stack.pop()
                  for nr, nc in ((r + 1, c), (r - 1, c), (r, c + 1), (r, c - 1)):
                      if (0 <= nr < rows and 0 <= nc < cols and (nr, nc) not in seen
                              and heights[nr][nc] >= heights[r][c]):
                          seen.add((nr, nc))
                          stack.append((nr, nc))
              return seen

          pacific = reach([(0, c) for c in range(cols)] + [(r, 0) for r in range(rows)])
          atlantic = reach([(rows - 1, c) for c in range(cols)] + [(r, cols - 1) for r in range(rows)])
          return [[r, c] for r, c in sorted(pacific & atlantic)]
    `,
    complexity: "O(m·n) time, O(m·n) space",
    explanation: md`
      Water flows downhill from a cell to the ocean exactly when the ocean can "climb" uphill back to that cell.
      So two graph searches seeded from each ocean's border (moving only to neighbours of equal or greater height) find every cell that drains to that ocean.
      The answer is the intersection, and each search visits each cell at most once.
    `,
  },
  {
    id: "course-schedule",
    title: "Course Schedule",
    difficulty: "Medium",
    topic: "Graphs",
    tags: ["topological-sort", "cycle-detection", "bfs"],
    prompt: md`
      There are \`num_courses\` courses labeled \`0\` to \`num_courses - 1\`. You are given \`prerequisites\` where
      \`prerequisites[i] = [a, b]\` means you must take course \`b\` before course \`a\`.

      Return \`True\` if you can finish all courses, otherwise \`False\`.

      **Example 1**
      \`\`\`
      Input: num_courses = 2, prerequisites = [[1,0]]
      Output: True
      \`\`\`

      **Example 2**
      \`\`\`
      Input: num_courses = 2, prerequisites = [[1,0],[0,1]]
      Output: False
      Explanation: Each course requires the other, which is impossible.
      \`\`\`

      **Constraints:**
      - \`1 <= num_courses <= 10^4\`
      - \`0 <= len(prerequisites) <= 5000\` (larger in tests)
      - All pairs are distinct
    `,
    starter: py`
      def can_finish(num_courses: int, prerequisites: list[list[int]]) -> bool:
          pass
    `,
    tests: [
      { call: "can_finish(2, [[1, 0]])", expect: "True" },
      { call: "can_finish(2, [[1, 0], [0, 1]])", expect: "False" },
      { call: "can_finish(1, [])", expect: "True" },
      { call: "can_finish(3, [[1, 0], [2, 1], [0, 2]])", expect: "False" },
      { call: "can_finish(5, [[1, 0], [2, 0], [3, 1], [3, 2], [4, 3]])", expect: "True" },
      { call: "can_finish(4, [[1, 0], [2, 3], [3, 2]])", expect: "False" },
      { call: "can_finish(10000, [[i + 1, i] for i in range(9999)])", expect: "True" },
      { call: "can_finish(10000, [[i + 1, i] for i in range(9999)] + [[0, 9999]])", expect: "False" },
    ],
    hints: [
      "Model courses as nodes and prerequisites as directed edges. When is finishing impossible?",
      "You can finish everything exactly when the graph has no directed cycle, i.e. a topological ordering exists.",
      "Use Kahn's algorithm: compute in-degrees, start a queue with all zero in-degree courses, and repeatedly 'take' a course, decrementing its dependents' in-degrees. If you took all courses, return True.",
    ],
    solution: py`
      from collections import deque

      def can_finish(num_courses: int, prerequisites: list[list[int]]) -> bool:
          graph: list[list[int]] = [[] for _ in range(num_courses)]
          indeg = [0] * num_courses
          for a, b in prerequisites:
              graph[b].append(a)
              indeg[a] += 1
          queue = deque(i for i in range(num_courses) if indeg[i] == 0)
          taken = 0
          while queue:
              c = queue.popleft()
              taken += 1
              for nxt in graph[c]:
                  indeg[nxt] -= 1
                  if indeg[nxt] == 0:
                      queue.append(nxt)
          return taken == num_courses
    `,
    complexity: "O(V + E) time, O(V + E) space",
    explanation: md`
      Kahn's algorithm repeatedly removes courses with no remaining prerequisites. In a DAG this eventually removes every node;
      if a cycle exists, the nodes on it never reach in-degree 0, so fewer than \`num_courses\` are taken.
      An iterative BFS also avoids recursion-depth issues on long prerequisite chains.
    `,
  },
  {
    id: "course-schedule-ii",
    title: "Course Schedule II",
    difficulty: "Medium",
    topic: "Graphs",
    tags: ["topological-sort", "bfs", "dfs"],
    prompt: md`
      There are \`num_courses\` courses labeled \`0\` to \`num_courses - 1\`. \`prerequisites[i] = [a, b]\` means course \`b\` must be taken before course \`a\`.

      Return **an** ordering of courses that lets you finish all of them. If there are several valid orderings, return any of them.
      If it is impossible, return an empty list.

      **Example 1**
      \`\`\`
      Input: num_courses = 2, prerequisites = [[1,0]]
      Output: [0,1]
      \`\`\`

      **Example 2**
      \`\`\`
      Input: num_courses = 4, prerequisites = [[1,0],[2,0],[3,1],[3,2]]
      Output: [0,2,1,3]   (or [0,1,2,3])
      \`\`\`

      **Example 3**
      \`\`\`
      Input: num_courses = 1, prerequisites = []
      Output: [0]
      \`\`\`

      **Constraints:**
      - \`1 <= num_courses <= 5000\`
      - All pairs are distinct
    `,
    starter: py`
      def find_order(num_courses: int, prerequisites: list[list[int]]) -> list[int]:
          pass
    `,
    tests: [
      { name: "two courses", code: py`
          def check(n, pre):
              order = find_order(n, pre)
              assert isinstance(order, list), f"find_order({n}, {pre}) returned {order!r}, expected a list"
              assert sorted(order) == list(range(n)), f"find_order({n}, {pre}) returned {order}, which is not a permutation of 0..{n - 1}"
              pos = {c: i for i, c in enumerate(order)}
              for a, b in pre:
                  assert pos[b] < pos[a], f"find_order({n}, {pre}) returned {order}, but course {b} must come before course {a}"
          check(2, [[1, 0]])
        ` },
      { name: "diamond", code: py`
          def check(n, pre):
              order = find_order(n, pre)
              assert isinstance(order, list), f"find_order({n}, {pre}) returned {order!r}, expected a list"
              assert sorted(order) == list(range(n)), f"find_order({n}, {pre}) returned {order}, which is not a permutation of 0..{n - 1}"
              pos = {c: i for i, c in enumerate(order)}
              for a, b in pre:
                  assert pos[b] < pos[a], f"find_order({n}, {pre}) returned {order}, but course {b} must come before course {a}"
          check(4, [[1, 0], [2, 0], [3, 1], [3, 2]])
        ` },
      { name: "single course, no prerequisites", code: py`
          order = find_order(1, [])
          assert order == [0], f"find_order(1, []) returned {order!r}, expected [0]"
        ` },
      { name: "no prerequisites at all", code: py`
          order = find_order(3, [])
          assert isinstance(order, list) and sorted(order) == [0, 1, 2], f"find_order(3, []) returned {order!r}, expected some ordering of [0, 1, 2]"
        ` },
      { name: "cycle returns []", code: py`
          order = find_order(2, [[1, 0], [0, 1]])
          assert order == [], f"find_order(2, [[1, 0], [0, 1]]) returned {order!r}, expected [] (cycle)"
          order = find_order(4, [[1, 0], [2, 1], [3, 2], [1, 3]])
          assert order == [], f"find_order(4, [[1,0],[2,1],[3,2],[1,3]]) returned {order!r}, expected [] (cycle 1->2->3->1)"
        ` },
      { name: "disconnected components", code: py`
          def check(n, pre):
              order = find_order(n, pre)
              assert isinstance(order, list), f"find_order({n}, {pre}) returned {order!r}, expected a list"
              assert sorted(order) == list(range(n)), f"find_order({n}, {pre}) returned {order}, which is not a permutation of 0..{n - 1}"
              pos = {c: i for i, c in enumerate(order)}
              for a, b in pre:
                  assert pos[b] < pos[a], f"find_order({n}, {pre}) returned {order}, but course {b} must come before course {a}"
          check(6, [[1, 0], [3, 2], [5, 4], [4, 3]])
        ` },
      { name: "long chain (5000 courses)", code: py`
          n = 5000
          pre = [[i + 1, i] for i in range(n - 1)]
          order = find_order(n, pre)
          assert order == list(range(n)), f"for a chain 0->1->...->{n - 1} expected [0, 1, ..., {n - 1}], got {str(order)[:80]}..."
        ` },
    ],
    hints: [
      "This is the same graph as Course Schedule; now you need to output the order instead of just a yes/no.",
      "A topological sort of the prerequisite graph is exactly a valid course order.",
      "Run Kahn's algorithm: queue all courses with in-degree 0, pop one, append it to the result, and decrement its dependents' in-degrees (queueing any that hit 0). If the result has fewer than num_courses entries, there was a cycle, so return [].",
    ],
    solution: py`
      from collections import deque

      def find_order(num_courses: int, prerequisites: list[list[int]]) -> list[int]:
          graph: list[list[int]] = [[] for _ in range(num_courses)]
          indeg = [0] * num_courses
          for a, b in prerequisites:
              graph[b].append(a)
              indeg[a] += 1
          queue = deque(i for i in range(num_courses) if indeg[i] == 0)
          order: list[int] = []
          while queue:
              c = queue.popleft()
              order.append(c)
              for nxt in graph[c]:
                  indeg[nxt] -= 1
                  if indeg[nxt] == 0:
                      queue.append(nxt)
          return order if len(order) == num_courses else []
    `,
    complexity: "O(V + E) time, O(V + E) space",
    explanation: md`
      A course is appended to the order only after all of its prerequisites have been appended (its in-degree has dropped to 0),
      so the output respects every edge. If a cycle exists, its courses never become available and the order comes up short, so we return \`[]\`.
    `,
  },
  {
    id: "word-ladder",
    title: "Word Ladder",
    difficulty: "Hard",
    topic: "Graphs",
    tags: ["bfs", "strings", "shortest-path"],
    prompt: md`
      A **transformation sequence** from \`begin_word\` to \`end_word\` using a dictionary \`word_list\` is a sequence
      \`begin_word -> s1 -> s2 -> ... -> sk\` such that:
      - every adjacent pair of words differs by exactly one letter,
      - every \`si\` is in \`word_list\` (\`begin_word\` does not need to be), and
      - \`sk == end_word\`.

      Return the **number of words** in the shortest transformation sequence, or \`0\` if none exists.

      **Example 1**
      \`\`\`
      Input: begin_word = "hit", end_word = "cog",
             word_list = ["hot","dot","dog","lot","log","cog"]
      Output: 5
      Explanation: "hit" -> "hot" -> "dot" -> "dog" -> "cog"
      \`\`\`

      **Example 2**
      \`\`\`
      Input: begin_word = "hit", end_word = "cog",
             word_list = ["hot","dot","dog","lot","log"]
      Output: 0
      Explanation: "cog" is not in the word list.
      \`\`\`

      **Constraints:**
      - \`1 <= len(begin_word) <= 10\`; all words have the same length and are lowercase
      - \`1 <= len(word_list) <= 5000\`
      - \`begin_word != end_word\`
    `,
    starter: py`
      def ladder_length(begin_word: str, end_word: str, word_list: list[str]) -> int:
          pass
    `,
    tests: [
      { call: "ladder_length('hit', 'cog', ['hot', 'dot', 'dog', 'lot', 'log', 'cog'])", expect: "5" },
      { call: "ladder_length('hit', 'cog', ['hot', 'dot', 'dog', 'lot', 'log'])", expect: "0" },
      { call: "ladder_length('a', 'c', ['a', 'b', 'c'])", expect: "2" },
      { call: "ladder_length('hot', 'dog', ['hot', 'dog'])", expect: "0" },
      { call: "ladder_length('hot', 'dot', ['dot'])", expect: "2" },
      { call: "ladder_length('lost', 'cost', ['most', 'fist', 'lost', 'cost', 'fish'])", expect: "2" },
      { call: "ladder_length('aaa', 'jjj', [a + b + c for a in 'abcdefghij' for b in 'abcdefghij' for c in 'abcdefghij'])", expect: "4" },
    ],
    hints: [
      "Think of each word as a node, with edges between words that differ by one letter. You want the shortest path.",
      "Shortest path in an unweighted graph means breadth-first search.",
      "BFS from begin_word, tracking the level. For each word, try replacing each position with each of 'a'..'z'; if the new word is in the (set) dictionary and unvisited, enqueue it. Return the level when you pop end_word, or 0 if the queue empties.",
    ],
    solution: py`
      from collections import deque
      from string import ascii_lowercase

      def ladder_length(begin_word: str, end_word: str, word_list: list[str]) -> int:
          words = set(word_list)
          if end_word not in words:
              return 0
          queue = deque([(begin_word, 1)])
          seen = {begin_word}
          while queue:
              word, dist = queue.popleft()
              if word == end_word:
                  return dist
              for i in range(len(word)):
                  prefix, suffix = word[:i], word[i + 1:]
                  for ch in ascii_lowercase:
                      nxt = prefix + ch + suffix
                      if nxt in words and nxt not in seen:
                          seen.add(nxt)
                          queue.append((nxt, dist + 1))
          return 0
    `,
    complexity: "O(N · L · 26) time for N words of length L, O(N) space",
    explanation: md`
      Words are nodes in an implicit graph, and BFS finds the shortest path in an unweighted graph by exploring level by level.
      Rather than comparing every pair of words, we generate each word's neighbours by trying all 26 letters at each position
      and checking membership in a set, which is much faster when the dictionary is large.
    `,
  },

  // ------------------------------------------------------------------ Intervals
  {
    id: "merge-intervals",
    title: "Merge Intervals",
    difficulty: "Medium",
    topic: "Intervals",
    tags: ["sorting", "intervals"],
    prompt: md`
      Given a list of \`intervals\` where \`intervals[i] = [start_i, end_i]\`, merge all overlapping intervals and return
      a list of the non-overlapping intervals that cover all the input intervals (in any order).

      Intervals that touch (e.g. \`[1,4]\` and \`[4,5]\`) are considered overlapping.

      **Example 1**
      \`\`\`
      Input: intervals = [[1,3],[2,6],[8,10],[15,18]]
      Output: [[1,6],[8,10],[15,18]]
      \`\`\`

      **Example 2**
      \`\`\`
      Input: intervals = [[1,4],[4,5]]
      Output: [[1,5]]
      \`\`\`

      **Constraints:**
      - \`1 <= len(intervals) <= 10^4\`
      - \`0 <= start_i <= end_i <= 10^5\`
    `,
    starter: py`
      def merge(intervals: list[list[int]]) -> list[list[int]]:
          pass
    `,
    tests: [
      { call: "merge([[1, 3], [2, 6], [8, 10], [15, 18]])", expect: "[[1, 6], [8, 10], [15, 18]]", cmp: "sorted" },
      { call: "merge([[1, 4], [4, 5]])", expect: "[[1, 5]]", cmp: "sorted" },
      { call: "merge([[1, 4], [0, 4]])", expect: "[[0, 4]]", cmp: "sorted" },
      { call: "merge([[1, 4], [2, 3]])", expect: "[[1, 4]]", cmp: "sorted" },
      { call: "merge([[5, 6]])", expect: "[[5, 6]]", cmp: "sorted" },
      { call: "merge([[8, 10], [1, 3], [2, 6], [9, 12], [0, 0]])", expect: "[[0, 0], [1, 6], [8, 12]]", cmp: "sorted" },
      { call: "merge([[i, i + 1] for i in range(0, 20000, 3)])", expect: "[[i, i + 1] for i in range(0, 20000, 3)]", cmp: "sorted" },
      { call: "merge([[i, i + 2] for i in range(9999, -1, -1)])", expect: "[[0, 10001]]", cmp: "sorted" },
    ],
    hints: [
      "Overlaps are easy to spot if the intervals are in a helpful order.",
      "Sort by start time. Then any interval that overlaps the current merged block must come right after it.",
      "After sorting, walk through the intervals keeping a result list. If the next interval starts at or before the end of the last merged interval, extend that end to the max of both ends; otherwise append it as a new interval.",
    ],
    solution: py`
      def merge(intervals: list[list[int]]) -> list[list[int]]:
          result: list[list[int]] = []
          for start, end in sorted(intervals):
              if result and start <= result[-1][1]:
                  result[-1][1] = max(result[-1][1], end)
              else:
                  result.append([start, end])
          return result
    `,
    complexity: "O(n log n) time, O(n) space",
    explanation: md`
      After sorting by start, intervals that overlap form contiguous runs. Scanning left to right we only need to compare each interval
      with the last merged one: if it starts before that one ends they overlap and we extend the end, otherwise a new block begins.
      Sorting dominates the cost.
    `,
  },
  {
    id: "insert-interval",
    title: "Insert Interval",
    difficulty: "Medium",
    topic: "Intervals",
    tags: ["intervals", "array"],
    prompt: md`
      You are given a list of non-overlapping \`intervals\` sorted by start, and a \`new_interval\`.
      Insert \`new_interval\` so the list stays sorted and non-overlapping (merge if necessary), and return the result.

      Intervals that touch (e.g. \`[3,5]\` and \`[5,7]\`) should be merged.

      **Example 1**
      \`\`\`
      Input: intervals = [[1,3],[6,9]], new_interval = [2,5]
      Output: [[1,5],[6,9]]
      \`\`\`

      **Example 2**
      \`\`\`
      Input: intervals = [[1,2],[3,5],[6,7],[8,10],[12,16]], new_interval = [4,8]
      Output: [[1,2],[3,10],[12,16]]
      \`\`\`

      **Constraints:**
      - \`0 <= len(intervals) <= 10^4\`
      - \`intervals\` is sorted by start and non-overlapping
      - \`0 <= start <= end <= 10^5\`
    `,
    starter: py`
      def insert(intervals: list[list[int]], new_interval: list[int]) -> list[list[int]]:
          pass
    `,
    tests: [
      { call: "insert([[1, 3], [6, 9]], [2, 5])", expect: "[[1, 5], [6, 9]]" },
      { call: "insert([[1, 2], [3, 5], [6, 7], [8, 10], [12, 16]], [4, 8])", expect: "[[1, 2], [3, 10], [12, 16]]" },
      { call: "insert([], [5, 7])", expect: "[[5, 7]]" },
      { call: "insert([[1, 5]], [2, 3])", expect: "[[1, 5]]" },
      { call: "insert([[1, 5]], [6, 8])", expect: "[[1, 5], [6, 8]]" },
      { call: "insert([[3, 5]], [0, 1])", expect: "[[0, 1], [3, 5]]" },
      { call: "insert([[1, 5], [7, 9]], [0, 10])", expect: "[[0, 10]]" },
      { call: "insert([[3, 5], [7, 9]], [5, 7])", expect: "[[3, 9]]" },
    ],
    hints: [
      "The existing intervals fall into three groups relative to the new one.",
      "Intervals entirely before the new one, intervals that overlap it, and intervals entirely after it.",
      "Walk the list once: append every interval that ends before new_interval starts; then, while intervals start at or before new_interval's end, widen new_interval to cover them; append new_interval; finally append the rest.",
    ],
    solution: py`
      def insert(intervals: list[list[int]], new_interval: list[int]) -> list[list[int]]:
          start, end = new_interval
          result: list[list[int]] = []
          i, n = 0, len(intervals)
          while i < n and intervals[i][1] < start:
              result.append(list(intervals[i]))
              i += 1
          while i < n and intervals[i][0] <= end:
              start = min(start, intervals[i][0])
              end = max(end, intervals[i][1])
              i += 1
          result.append([start, end])
          result.extend(list(iv) for iv in intervals[i:])
          return result
    `,
    complexity: "O(n) time, O(n) space",
    explanation: md`
      Since the input is already sorted and disjoint, a single pass suffices. Intervals that end before the new one starts are copied as is,
      every interval that overlaps gets absorbed by widening the new interval, and everything after is copied unchanged.
      No sorting is needed, so it runs in linear time.
    `,
  },
  {
    id: "meeting-rooms-ii",
    title: "Meeting Rooms II",
    difficulty: "Medium",
    topic: "Intervals",
    tags: ["intervals", "heap", "sweep-line"],
    prompt: md`
      Given a list of meeting time \`intervals\` where \`intervals[i] = [start_i, end_i]\`, return the minimum number of
      conference rooms required so that no two meetings in the same room overlap.

      A meeting ending at time \`t\` frees its room for a meeting starting at time \`t\`.

      **Example 1**
      \`\`\`
      Input: intervals = [[0,30],[5,10],[15,20]]
      Output: 2
      \`\`\`

      **Example 2**
      \`\`\`
      Input: intervals = [[7,10],[2,4]]
      Output: 1
      \`\`\`

      **Constraints:**
      - \`0 <= len(intervals) <= 10^4\`
      - \`0 <= start_i < end_i <= 10^6\`
    `,
    starter: py`
      def min_meeting_rooms(intervals: list[list[int]]) -> int:
          pass
    `,
    tests: [
      { call: "min_meeting_rooms([[0, 30], [5, 10], [15, 20]])", expect: "2" },
      { call: "min_meeting_rooms([[7, 10], [2, 4]])", expect: "1" },
      { call: "min_meeting_rooms([])", expect: "0" },
      { call: "min_meeting_rooms([[1, 5], [5, 10]])", expect: "1" },
      { call: "min_meeting_rooms([[1, 10], [2, 9], [3, 8]])", expect: "3" },
      { call: "min_meeting_rooms([[9, 10], [4, 9], [4, 17]])", expect: "2" },
      { call: "min_meeting_rooms([[i, i + 100] for i in range(10000)])", expect: "100" },
    ],
    hints: [
      "The answer is the maximum number of meetings happening at the same moment.",
      "Process meetings in order of start time and track when the rooms currently in use become free.",
      "Sort by start; keep a min-heap of end times of ongoing meetings. For each meeting, if the earliest end is <= its start, pop it (reuse that room). Push the meeting's end. The heap's maximum size is the answer.",
    ],
    solution: py`
      import heapq

      def min_meeting_rooms(intervals: list[list[int]]) -> int:
          ends: list[int] = []
          best = 0
          for start, end in sorted(intervals):
              if ends and ends[0] <= start:
                  heapq.heapreplace(ends, end)
              else:
                  heapq.heappush(ends, end)
              best = max(best, len(ends))
          return best
    `,
    complexity: "O(n log n) time, O(n) space",
    explanation: md`
      Processing meetings by start time, the min-heap holds the end times of rooms in use. If the room that frees up earliest is free
      by the time the next meeting starts, that meeting can take it; otherwise a new room is needed.
      The heap size therefore tracks the number of rooms in use, and its peak is the answer.
    `,
  },

  // ------------------------------------------------------------------ Dynamic Programming
  {
    id: "climbing-stairs",
    title: "Climbing Stairs",
    difficulty: "Easy",
    topic: "Dynamic Programming",
    tags: ["dp", "fibonacci", "memoization"],
    prompt: md`
      You are climbing a staircase with \`n\` steps. Each time you can climb either \`1\` or \`2\` steps.
      In how many distinct ways can you reach the top?

      **Example 1**
      \`\`\`
      Input: n = 2
      Output: 2
      Explanation: 1+1, or 2
      \`\`\`

      **Example 2**
      \`\`\`
      Input: n = 3
      Output: 3
      Explanation: 1+1+1, 1+2, 2+1
      \`\`\`

      **Constraints:**
      - \`1 <= n <= 80\`
    `,
    starter: py`
      def climb_stairs(n: int) -> int:
          pass
    `,
    tests: [
      { call: "climb_stairs(1)", expect: "1" },
      { call: "climb_stairs(2)", expect: "2" },
      { call: "climb_stairs(3)", expect: "3" },
      { call: "climb_stairs(5)", expect: "8" },
      { call: "climb_stairs(10)", expect: "89" },
      { call: "climb_stairs(45)", expect: "1836311903" },
      { call: "climb_stairs(80)", expect: "37889062373143906" },
    ],
    hints: [
      "Think about the very last move you make to reach step n.",
      "The last move was either a 1-step from n-1 or a 2-step from n-2, so ways(n) = ways(n-1) + ways(n-2).",
      "Plain recursion recomputes the same values exponentially many times. Build the answer bottom-up from ways(1) = 1 and ways(2) = 2, keeping only the last two values.",
    ],
    solution: py`
      def climb_stairs(n: int) -> int:
          a, b = 1, 1  # ways to reach step 0 and step 1
          for _ in range(n - 1):
              a, b = b, a + b
          return b
    `,
    complexity: "O(n) time, O(1) space",
    explanation: md`
      Every path to step \`n\` ends with either a 1-step from \`n - 1\` or a 2-step from \`n - 2\`, so the counts follow the Fibonacci recurrence.
      Iterating bottom-up computes each value once, avoiding the exponential blow-up of naive recursion, and only the last two values need to be kept.
    `,
  },
  {
    id: "house-robber",
    title: "House Robber",
    difficulty: "Medium",
    topic: "Dynamic Programming",
    tags: ["dp", "array"],
    prompt: md`
      You are a robber planning to rob houses along a street. \`nums[i]\` is the amount of money in house \`i\`.
      Adjacent houses have connected alarms, so you cannot rob two **adjacent** houses.

      Return the maximum amount of money you can rob.

      **Example 1**
      \`\`\`
      Input: nums = [1,2,3,1]
      Output: 4
      Explanation: Rob house 0 (1) and house 2 (3).
      \`\`\`

      **Example 2**
      \`\`\`
      Input: nums = [2,7,9,3,1]
      Output: 12
      Explanation: Rob houses 0, 2 and 4: 2 + 9 + 1 = 12.
      \`\`\`

      **Constraints:**
      - \`1 <= len(nums) <= 1000\`
      - \`0 <= nums[i] <= 400\`
    `,
    starter: py`
      def rob(nums: list[int]) -> int:
          pass
    `,
    tests: [
      { call: "rob([1, 2, 3, 1])", expect: "4" },
      { call: "rob([2, 7, 9, 3, 1])", expect: "12" },
      { call: "rob([5])", expect: "5" },
      { call: "rob([2, 1, 1, 2])", expect: "4" },
      { call: "rob([0, 0])", expect: "0" },
      { call: "rob([1, 3])", expect: "3" },
      { call: "rob([i % 10 for i in range(1000)])", expect: "2500" },
    ],
    hints: [
      "For each house you have two choices: rob it or skip it.",
      "If you rob house i you can't have robbed house i-1, so best(i) = max(best(i-1), best(i-2) + nums[i]).",
      "Sweep left to right keeping two running values: the best total up to the previous house and up to the one before it. Each step, the new best is the larger of skipping (previous best) or robbing (two-back best + current).",
    ],
    solution: py`
      def rob(nums: list[int]) -> int:
          prev2, prev1 = 0, 0
          for x in nums:
              prev2, prev1 = prev1, max(prev1, prev2 + x)
          return prev1
    `,
    complexity: "O(n) time, O(1) space",
    explanation: md`
      The best haul through house \`i\` either skips house \`i\` (same as the best through \`i - 1\`) or robs it (best through \`i - 2\` plus \`nums[i]\`).
      This recurrence only looks back two steps, so two rolling variables suffice. Trying every subset would be exponential.
    `,
  },
  {
    id: "coin-change",
    title: "Coin Change",
    difficulty: "Medium",
    topic: "Dynamic Programming",
    tags: ["dp", "unbounded-knapsack", "bfs"],
    prompt: md`
      You are given coin denominations \`coins\` and a total \`amount\`. Return the **fewest** number of coins needed to make up that amount.
      If it can't be made, return \`-1\`. You have an unlimited supply of each coin.

      **Example 1**
      \`\`\`
      Input: coins = [1,2,5], amount = 11
      Output: 3
      Explanation: 11 = 5 + 5 + 1
      \`\`\`

      **Example 2**
      \`\`\`
      Input: coins = [2], amount = 3
      Output: -1
      \`\`\`

      **Example 3**
      \`\`\`
      Input: coins = [1], amount = 0
      Output: 0
      \`\`\`

      **Constraints:**
      - \`1 <= len(coins) <= 12\`
      - \`1 <= coins[i] <= 2^31 - 1\`
      - \`0 <= amount <= 10^4\`
    `,
    starter: py`
      def coin_change(coins: list[int], amount: int) -> int:
          pass
    `,
    tests: [
      { call: "coin_change([1, 2, 5], 11)", expect: "3" },
      { call: "coin_change([2], 3)", expect: "-1" },
      { call: "coin_change([1], 0)", expect: "0" },
      { call: "coin_change([2, 5, 10, 1], 27)", expect: "4" },
      { call: "coin_change([186, 419, 83, 408], 6249)", expect: "20" },
      { call: "coin_change([3, 7], 10000)", expect: "1432" },
      { call: "coin_change([7], 10000)", expect: "-1" },
      { call: "coin_change([1, 3, 4], 6)", expect: "2" },
    ],
    hints: [
      "Greedy (always take the biggest coin) fails: with coins [1, 3, 4] and amount 6, greedy gives 4+1+1 but 3+3 is better.",
      "Let best[a] be the fewest coins to make amount a. The last coin used was some c, leaving amount a - c.",
      "Fill an array from 0 to amount: best[0] = 0, and best[a] = 1 + min(best[a - c]) over coins c <= a (skipping unreachable amounts). Return best[amount], or -1 if it stayed unreachable.",
    ],
    solution: py`
      def coin_change(coins: list[int], amount: int) -> int:
          inf = amount + 1
          best = [0] + [inf] * amount
          for a in range(1, amount + 1):
              for c in coins:
                  if c <= a and best[a - c] + 1 < best[a]:
                      best[a] = best[a - c] + 1
          return best[amount] if best[amount] <= amount else -1
    `,
    complexity: "O(amount · len(coins)) time, O(amount) space",
    explanation: md`
      Any optimal way to make \`a\` ends with some coin \`c\`, and the rest must be an optimal way to make \`a - c\`.
      So computing \`best\` for every amount from 0 upwards gives each answer from already-solved smaller amounts.
      \`amount + 1\` works as "infinity" because no valid answer can use more than \`amount\` coins.
    `,
  },
  {
    id: "longest-increasing-subsequence",
    title: "Longest Increasing Subsequence",
    difficulty: "Medium",
    topic: "Dynamic Programming",
    tags: ["dp", "binary-search", "patience-sorting"],
    prompt: md`
      Given an integer array \`nums\`, return the length of the longest **strictly increasing** subsequence.

      A subsequence is derived by deleting some or no elements without changing the order of the rest.

      **Example 1**
      \`\`\`
      Input: nums = [10,9,2,5,3,7,101,18]
      Output: 4
      Explanation: [2,3,7,101]
      \`\`\`

      **Example 2**
      \`\`\`
      Input: nums = [0,1,0,3,2,3]
      Output: 4
      \`\`\`

      **Example 3**
      \`\`\`
      Input: nums = [7,7,7,7,7,7,7]
      Output: 1
      \`\`\`

      **Constraints:**
      - \`1 <= len(nums) <= 2500\` (a bit larger in tests)
      - \`-10^4 <= nums[i] <= 10^4\`

      **Follow-up:** can you do it in \`O(n log n)\`?
    `,
    starter: py`
      def length_of_lis(nums: list[int]) -> int:
          pass
    `,
    tests: [
      { call: "length_of_lis([10, 9, 2, 5, 3, 7, 101, 18])", expect: "4" },
      { call: "length_of_lis([0, 1, 0, 3, 2, 3])", expect: "4" },
      { call: "length_of_lis([7, 7, 7, 7, 7, 7, 7])", expect: "1" },
      { call: "length_of_lis([5])", expect: "1" },
      { call: "length_of_lis([5, 4, 3, 2, 1])", expect: "1" },
      { call: "length_of_lis([4, 10, 4, 3, 8, 9])", expect: "3" },
      { call: "length_of_lis(list(range(2500)))", expect: "2500" },
      { call: "length_of_lis([(i * 7919) % 10007 for i in range(3000)])", expect: "47" },
    ],
    hints: [
      "Trying every subsequence is exponential. For each position, what's the longest increasing subsequence that ends there?",
      "O(n^2) DP: lis[i] = 1 + max(lis[j]) over j < i with nums[j] < nums[i]. For O(n log n), track the smallest possible tail value for each subsequence length.",
      "Keep a sorted list 'tails' where tails[k] is the smallest tail of any increasing subsequence of length k+1. For each number, binary-search the first tail >= it: replace that tail, or append if none exists. The length of tails is the answer.",
    ],
    solution: py`
      from bisect import bisect_left

      def length_of_lis(nums: list[int]) -> int:
          tails: list[int] = []
          for x in nums:
              i = bisect_left(tails, x)
              if i == len(tails):
                  tails.append(x)
              else:
                  tails[i] = x
          return len(tails)
    `,
    complexity: "O(n log n) time, O(n) space",
    explanation: md`
      \`tails[k]\` holds the smallest value that can end an increasing subsequence of length \`k + 1\`; this list is always sorted.
      A new number either extends the longest subsequence (append) or lowers some tail, which can only help later numbers.
      Using \`bisect_left\` (first tail \`>= x\`) enforces strict increase. The final length of \`tails\` is the LIS length, though \`tails\` itself need not be an actual subsequence.
    `,
  },
  {
    id: "word-break",
    title: "Word Break",
    difficulty: "Medium",
    topic: "Dynamic Programming",
    tags: ["dp", "strings", "memoization"],
    prompt: md`
      Given a string \`s\` and a list of strings \`word_dict\`, return \`True\` if \`s\` can be split into a sequence of one or more dictionary words.

      The same dictionary word may be reused multiple times.

      **Example 1**
      \`\`\`
      Input: s = "leetcode", word_dict = ["leet","code"]
      Output: True
      \`\`\`

      **Example 2**
      \`\`\`
      Input: s = "applepenapple", word_dict = ["apple","pen"]
      Output: True
      \`\`\`

      **Example 3**
      \`\`\`
      Input: s = "catsandog", word_dict = ["cats","dog","sand","and","cat"]
      Output: False
      \`\`\`

      **Constraints:**
      - \`1 <= len(s) <= 300\`
      - \`1 <= len(word_dict) <= 1000\`, \`1 <= len(word) <= 20\`
      - All strings are lowercase letters; dictionary words are unique
    `,
    starter: py`
      def word_break(s: str, word_dict: list[str]) -> bool:
          pass
    `,
    tests: [
      { call: "word_break('leetcode', ['leet', 'code'])", expect: "True" },
      { call: "word_break('applepenapple', ['apple', 'pen'])", expect: "True" },
      { call: "word_break('catsandog', ['cats', 'dog', 'sand', 'and', 'cat'])", expect: "False" },
      { call: "word_break('a', ['b'])", expect: "False" },
      { call: "word_break('aaaaaaa', ['aaaa', 'aaa'])", expect: "True" },
      { call: "word_break('cars', ['car', 'ca', 'rs'])", expect: "True" },
      { call: "word_break('a' * 150 + 'b', ['a', 'aa', 'aaa', 'aaaa', 'aaaaa', 'aaaaaa', 'aaaaaaa', 'aaaaaaaaaa'])", expect: "False" },
      { call: "word_break('ab' * 150, ['a', 'b', 'ab', 'aba', 'bab'])", expect: "True" },
    ],
    hints: [
      "Backtracking over every way to split the string can blow up exponentially when many prefixes match. Notice that the same suffixes get re-examined over and over.",
      "Let ok[i] mean 's[:i] can be segmented'. Then ok[i] is true if some ok[j] is true and s[j:i] is a dictionary word.",
      "Put the words in a set and compute ok[0..n] with ok[0] = True. For each end i, check start positions j (only within the max word length of i) where ok[j] holds and s[j:i] is in the set. Return ok[n].",
    ],
    solution: py`
      def word_break(s: str, word_dict: list[str]) -> bool:
          words = set(word_dict)
          max_len = max(map(len, words), default=0)
          n = len(s)
          ok = [True] + [False] * n
          for i in range(1, n + 1):
              for j in range(max(0, i - max_len), i):
                  if ok[j] and s[j:i] in words:
                      ok[i] = True
                      break
          return ok[n]
    `,
    complexity: "O(n · L) substring checks for max word length L, O(n) space",
    explanation: md`
      A prefix \`s[:i]\` is breakable exactly when some shorter breakable prefix \`s[:j]\` is followed by a dictionary word \`s[j:i]\`.
      Computing this for every \`i\` left to right means each prefix is solved once, instead of being re-explored by every branch of a backtracking search.
      Limiting \`j\` to the longest word length keeps the inner loop short.
    `,
  },
  {
    id: "longest-common-subsequence",
    title: "Longest Common Subsequence",
    difficulty: "Medium",
    topic: "Dynamic Programming",
    tags: ["dp", "strings", "2d-dp"],
    prompt: md`
      Given two strings \`text1\` and \`text2\`, return the length of their longest **common subsequence**, or \`0\` if there is none.

      A subsequence keeps the relative order of characters but may skip some (e.g. \`"ace"\` is a subsequence of \`"abcde"\`).

      **Example 1**
      \`\`\`
      Input: text1 = "abcde", text2 = "ace"
      Output: 3
      \`\`\`

      **Example 2**
      \`\`\`
      Input: text1 = "abc", text2 = "def"
      Output: 0
      \`\`\`

      **Constraints:**
      - \`1 <= len(text1), len(text2) <= 1000\`
      - Lowercase English letters only
    `,
    starter: py`
      def longest_common_subsequence(text1: str, text2: str) -> int:
          pass
    `,
    tests: [
      { call: "longest_common_subsequence('abcde', 'ace')", expect: "3" },
      { call: "longest_common_subsequence('abc', 'abc')", expect: "3" },
      { call: "longest_common_subsequence('abc', 'def')", expect: "0" },
      { call: "longest_common_subsequence('a', 'a')", expect: "1" },
      { call: "longest_common_subsequence('bsbininm', 'jmjkbkjkv')", expect: "1" },
      { call: "longest_common_subsequence('oxcpqrsvwf', 'shmtulqrypy')", expect: "2" },
      { call: "longest_common_subsequence('ab' * 300, 'ba' * 300)", expect: "599" },
    ],
    hints: [
      "Compare the last characters of the two strings. What happens when they match, and when they don't?",
      "Define L(i, j) as the LCS of text1[:i] and text2[:j]. If the characters match, L(i, j) = L(i-1, j-1) + 1; otherwise it's max(L(i-1, j), L(i, j-1)).",
      "Fill an (m+1) x (n+1) table row by row with zeros on the borders, applying the recurrence above. You only need the previous row at any time, so two 1-D arrays are enough.",
    ],
    solution: py`
      def longest_common_subsequence(text1: str, text2: str) -> int:
          prev = [0] * (len(text2) + 1)
          for a in text1:
              cur = [0]
              for j, b in enumerate(text2):
                  if a == b:
                      cur.append(prev[j] + 1)
                  else:
                      cur.append(max(prev[j + 1], cur[j]))
              prev = cur
          return prev[-1]
    `,
    complexity: "O(m·n) time, O(n) space",
    explanation: md`
      If the last characters of two prefixes match, that character can end the common subsequence, so we add 1 to the LCS of both shorter prefixes.
      Otherwise at least one of the two characters is unused, so we take the better of dropping either one.
      Each cell depends only on the previous row and the cell to its left, which allows a rolling-row implementation.
    `,
  },
  {
    id: "unique-paths",
    title: "Unique Paths",
    difficulty: "Medium",
    topic: "Dynamic Programming",
    tags: ["dp", "combinatorics", "grid"],
    prompt: md`
      A robot starts at the top-left corner of an \`m x n\` grid and wants to reach the bottom-right corner.
      It can only move **right** or **down** at each step.

      Return the number of distinct paths it can take.

      **Example 1**
      \`\`\`
      Input: m = 3, n = 7
      Output: 28
      \`\`\`

      **Example 2**
      \`\`\`
      Input: m = 3, n = 2
      Output: 3
      Explanation: Right -> Down -> Down, Down -> Down -> Right, Down -> Right -> Down
      \`\`\`

      **Constraints:**
      - \`1 <= m, n <= 100\` (Python integers don't overflow, so answers can be huge)
    `,
    starter: py`
      def unique_paths(m: int, n: int) -> int:
          pass
    `,
    tests: [
      { call: "unique_paths(3, 7)", expect: "28" },
      { call: "unique_paths(3, 2)", expect: "3" },
      { call: "unique_paths(1, 1)", expect: "1" },
      { call: "unique_paths(1, 10)", expect: "1" },
      { call: "unique_paths(10, 10)", expect: "48620" },
      { call: "unique_paths(23, 12)", expect: "193536720" },
      { call: "unique_paths(100, 100)", expect: "22750883079422934966181954039568885395604168260154104734000" },
    ],
    hints: [
      "The robot can only arrive at a cell from the cell above it or the cell to its left.",
      "paths(r, c) = paths(r-1, c) + paths(r, c-1), with every cell in the first row and first column having exactly 1 path.",
      "Keep one row of counts initialised to 1s; for each subsequent row, sweep left to right adding the left neighbour into each cell. (Alternatively: the answer is the binomial coefficient C(m+n-2, m-1).)",
    ],
    solution: py`
      def unique_paths(m: int, n: int) -> int:
          row = [1] * n
          for _ in range(m - 1):
              for c in range(1, n):
                  row[c] += row[c - 1]
          return row[-1]
    `,
    complexity: "O(m·n) time, O(n) space",
    explanation: md`
      Every path into a cell comes from above or from the left, so its count is the sum of those two counts.
      Processing row by row, \`row[c]\` still holds the value from the row above when we add \`row[c - 1]\` (already updated for the current row) into it.
      Combinatorially, the robot makes \`m - 1\` downs and \`n - 1\` rights in some order, giving \`C(m + n - 2, m - 1)\`.
    `,
  },

  // ------------------------------------------------------------------ Backtracking
  {
    id: "subsets",
    title: "Subsets",
    difficulty: "Medium",
    topic: "Backtracking",
    tags: ["backtracking", "bit-manipulation"],
    prompt: md`
      Given an integer array \`nums\` of **unique** elements, return all possible subsets (the power set).

      The result must not contain duplicate subsets. You may return the subsets in any order, and the elements within each subset in any order.

      **Example 1**
      \`\`\`
      Input: nums = [1,2,3]
      Output: [[],[1],[2],[1,2],[3],[1,3],[2,3],[1,2,3]]
      \`\`\`

      **Example 2**
      \`\`\`
      Input: nums = [0]
      Output: [[],[0]]
      \`\`\`

      **Constraints:**
      - \`0 <= len(nums) <= 10\`
      - All elements are unique
    `,
    starter: py`
      def subsets(nums: list[int]) -> list[list[int]]:
          pass
    `,
    tests: [
      { call: "subsets([1, 2, 3])", expect: "[[], [1], [2], [1, 2], [3], [1, 3], [2, 3], [1, 2, 3]]", cmp: "nested" },
      { call: "subsets([0])", expect: "[[], [0]]", cmp: "nested" },
      { call: "subsets([])", expect: "[[]]", cmp: "nested" },
      { call: "subsets([5, -1])", expect: "[[], [5], [-1], [5, -1]]", cmp: "nested" },
      { call: "len(subsets([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]))", expect: "1024" },
      { call: "subsets([3, 1, 4, 9, 2, 6, 5, 8])", expect: "[[x for j, x in enumerate([3, 1, 4, 9, 2, 6, 5, 8]) if m >> j & 1] for m in range(256)]", cmp: "nested" },
    ],
    hints: [
      "Each element is either in a subset or not, so there are 2^n subsets.",
      "Build subsets incrementally: decide for one element at a time whether to include it, then recurse on the rest.",
      "Backtrack with a current path: at index i, record a copy of the path, then for each j >= i append nums[j], recurse from j + 1, and pop. Alternatively, start with [[]] and for each number add it to a copy of every existing subset.",
    ],
    solution: py`
      def subsets(nums: list[int]) -> list[list[int]]:
          result: list[list[int]] = []
          path: list[int] = []

          def backtrack(start: int) -> None:
              result.append(path[:])
              for i in range(start, len(nums)):
                  path.append(nums[i])
                  backtrack(i + 1)
                  path.pop()

          backtrack(0)
          return result
    `,
    complexity: "O(n · 2^n) time, O(n) extra space besides the output",
    explanation: md`
      The recursion only ever extends the path with elements to the right of the last chosen one, so each subset is generated exactly once
      (in increasing index order). Every node of the recursion tree is a distinct subset, which we record on entry.
      Appending a copy of \`path\` matters, since the same list object is mutated as we backtrack.
    `,
  },
  {
    id: "permutations",
    title: "Permutations",
    difficulty: "Medium",
    topic: "Backtracking",
    tags: ["backtracking", "recursion"],
    prompt: md`
      Given an array \`nums\` of **distinct** integers, return all possible permutations, in any order.

      **Example 1**
      \`\`\`
      Input: nums = [1,2,3]
      Output: [[1,2,3],[1,3,2],[2,1,3],[2,3,1],[3,1,2],[3,2,1]]
      \`\`\`

      **Example 2**
      \`\`\`
      Input: nums = [0,1]
      Output: [[0,1],[1,0]]
      \`\`\`

      **Constraints:**
      - \`1 <= len(nums) <= 7\`
      - All integers are distinct
    `,
    starter: py`
      def permute(nums: list[int]) -> list[list[int]]:
          pass
    `,
    tests: [
      { call: "sorted(permute([1, 2, 3]))", expect: "[[1, 2, 3], [1, 3, 2], [2, 1, 3], [2, 3, 1], [3, 1, 2], [3, 2, 1]]" },
      { call: "sorted(permute([0, 1]))", expect: "[[0, 1], [1, 0]]" },
      { call: "permute([1])", expect: "[[1]]" },
      { call: "sorted(permute([-1, 5, 0]))", expect: "[[-1, 0, 5], [-1, 5, 0], [0, -1, 5], [0, 5, -1], [5, -1, 0], [5, 0, -1]]" },
      { call: "len(permute([1, 2, 3, 4, 5, 6, 7]))", expect: "5040" },
      { call: "sorted(permute([4, 2, 7, 1, 9, 3]))", expect: "sorted(list(p) for p in __import__('itertools').permutations([4, 2, 7, 1, 9, 3]))" },
    ],
    hints: [
      "Pick the first element, then you need all permutations of what's left.",
      "Backtracking: build the permutation one position at a time, tracking which elements are already used.",
      "Recurse with a current path and a 'used' set. When the path has length n, record a copy. Otherwise, for each unused number, mark it used, append it, recurse, then undo both.",
    ],
    solution: py`
      def permute(nums: list[int]) -> list[list[int]]:
          result: list[list[int]] = []
          path: list[int] = []
          used = [False] * len(nums)

          def backtrack() -> None:
              if len(path) == len(nums):
                  result.append(path[:])
                  return
              for i, x in enumerate(nums):
                  if used[i]:
                      continue
                  used[i] = True
                  path.append(x)
                  backtrack()
                  path.pop()
                  used[i] = False

          backtrack()
          return result
    `,
    complexity: "O(n · n!) time, O(n) extra space besides the output",
    explanation: md`
      Each level of the recursion fills one position with an element not yet used, so every root-to-leaf path is a distinct permutation
      and every permutation appears exactly once. Undoing the choice (pop and unmark) after each recursive call restores the state for the next choice.
    `,
  },
  {
    id: "combination-sum",
    title: "Combination Sum",
    difficulty: "Medium",
    topic: "Backtracking",
    tags: ["backtracking", "recursion"],
    prompt: md`
      Given an array of **distinct** positive integers \`candidates\` and a \`target\`, return all **unique combinations** of candidates that sum to \`target\`.

      The same number may be chosen an unlimited number of times. Two combinations are the same if they use the same numbers with the same frequencies.
      Return the combinations in any order (elements within a combination in any order).

      **Example 1**
      \`\`\`
      Input: candidates = [2,3,6,7], target = 7
      Output: [[2,2,3],[7]]
      \`\`\`

      **Example 2**
      \`\`\`
      Input: candidates = [2,3,5], target = 8
      Output: [[2,2,2,2],[2,3,3],[3,5]]
      \`\`\`

      **Example 3**
      \`\`\`
      Input: candidates = [2], target = 1
      Output: []
      \`\`\`

      **Constraints:**
      - \`1 <= len(candidates) <= 30\`
      - \`2 <= candidates[i] <= 40\` (1 also appears in tests), all distinct
      - \`1 <= target <= 40\`
    `,
    starter: py`
      def combination_sum(candidates: list[int], target: int) -> list[list[int]]:
          pass
    `,
    tests: [
      { call: "combination_sum([2, 3, 6, 7], 7)", expect: "[[2, 2, 3], [7]]", cmp: "nested" },
      { call: "combination_sum([2, 3, 5], 8)", expect: "[[2, 2, 2, 2], [2, 3, 3], [3, 5]]", cmp: "nested" },
      { call: "combination_sum([2], 1)", expect: "[]", cmp: "nested" },
      { call: "combination_sum([1], 2)", expect: "[[1, 1]]", cmp: "nested" },
      { call: "combination_sum([5, 4, 3], 16)", expect: "[[3, 3, 3, 3, 4], [3, 3, 5, 5], [3, 4, 4, 5], [4, 4, 4, 4]]", cmp: "nested" },
      { call: "combination_sum([7, 3, 2], 18)", expect: "[[2, 2, 2, 2, 2, 2, 2, 2, 2], [2, 2, 2, 2, 2, 2, 3, 3], [2, 2, 2, 2, 3, 7], [2, 2, 2, 3, 3, 3, 3], [2, 2, 7, 7], [2, 3, 3, 3, 7], [3, 3, 3, 3, 3, 3]]", cmp: "nested" },
      { call: "len(combination_sum([2, 3, 5, 7, 11, 13], 40))", expect: "206" },
    ],
    hints: [
      "To avoid producing [2,3] and [3,2] as different answers, always build combinations in a fixed order of candidates.",
      "Backtrack with a start index: at each step you may reuse the current candidate or move on to later ones, but never go back to earlier ones.",
      "Sort candidates. Recurse with (start, remaining, path): if remaining is 0, record a copy; otherwise for i from start, stop once candidates[i] > remaining, else append it, recurse with the same i (reuse allowed) and remaining - candidates[i], then pop.",
    ],
    solution: py`
      def combination_sum(candidates: list[int], target: int) -> list[list[int]]:
          nums = sorted(candidates)
          result: list[list[int]] = []
          path: list[int] = []

          def backtrack(start: int, remaining: int) -> None:
              if remaining == 0:
                  result.append(path[:])
                  return
              for i in range(start, len(nums)):
                  if nums[i] > remaining:
                      break
                  path.append(nums[i])
                  backtrack(i, remaining - nums[i])
                  path.pop()

          backtrack(0, target)
          return result
    `,
    complexity: "Exponential in target / min(candidates) in the worst case; O(target) recursion depth",
    explanation: md`
      Restricting each recursive call to candidates at or after the current index produces every multiset exactly once, in non-decreasing order.
      Passing the same index \`i\` (not \`i + 1\`) allows unlimited reuse. Sorting lets us \`break\` as soon as a candidate exceeds the remaining sum,
      pruning the rest of that branch.
    `,
  },

  // ------------------------------------------------------------------ Design
  {
    id: "lru-cache",
    title: "LRU Cache",
    difficulty: "Medium",
    topic: "Design",
    tags: ["design", "hash-map", "linked-list"],
    prompt: md`
      Design a data structure that follows the constraints of a **Least Recently Used (LRU) cache**.

      Implement the \`LRUCache\` class:
      - \`LRUCache(capacity: int)\` initializes the cache with a positive capacity.
      - \`get(key: int) -> int\` returns the value of \`key\` if present, otherwise \`-1\`.
      - \`put(key: int, value: int) -> None\` inserts or updates the key. If this pushes the number of keys over \`capacity\`, evict the **least recently used** key.

      Both \`get\` and \`put\` count as "using" a key. Both must run in \`O(1)\` average time.

      **Example**
      \`\`\`
      c = LRUCache(2)
      c.put(1, 1)
      c.put(2, 2)
      c.get(1)     # 1
      c.put(3, 3)  # evicts key 2
      c.get(2)     # -1
      c.put(4, 4)  # evicts key 1
      c.get(1)     # -1
      c.get(3)     # 3
      c.get(4)     # 4
      \`\`\`

      **Constraints:**
      - \`1 <= capacity <= 3000\`
      - \`0 <= key <= 10^4\`, \`0 <= value <= 10^5\`
      - Up to \`2 * 10^5\` calls
    `,
    starter: py`
      class LRUCache:
          def __init__(self, capacity: int):
              pass

          def get(self, key: int) -> int:
              pass

          def put(self, key: int, value: int) -> None:
              pass
    `,
    tests: [
      { name: "example", code: py`
          c = LRUCache(2)
          c.put(1, 1); c.put(2, 2)
          r = c.get(1); assert r == 1, f"get(1) returned {r!r}, expected 1"
          c.put(3, 3)
          r = c.get(2); assert r == -1, f"get(2) returned {r!r}, expected -1 (key 2 should have been evicted)"
          c.put(4, 4)
          r = c.get(1); assert r == -1, f"get(1) returned {r!r}, expected -1 (key 1 should have been evicted)"
          r = c.get(3); assert r == 3, f"get(3) returned {r!r}, expected 3"
          r = c.get(4); assert r == 4, f"get(4) returned {r!r}, expected 4"
        ` },
      { name: "missing key returns -1", code: py`
          c = LRUCache(1)
          r = c.get(5); assert r == -1, f"get(5) on empty cache returned {r!r}, expected -1"
        ` },
      { name: "capacity 1", code: py`
          c = LRUCache(1)
          c.put(2, 1)
          r = c.get(2); assert r == 1, f"get(2) returned {r!r}, expected 1"
          c.put(3, 2)
          r = c.get(2); assert r == -1, f"get(2) returned {r!r}, expected -1 (evicted by put(3, 2))"
          r = c.get(3); assert r == 2, f"get(3) returned {r!r}, expected 2"
        ` },
      { name: "put updates value and recency", code: py`
          c = LRUCache(2)
          c.put(1, 1); c.put(2, 2)
          c.put(1, 10)   # update: key 1 becomes most recent
          c.put(3, 3)    # should evict key 2, not key 1
          r = c.get(1); assert r == 10, f"get(1) returned {r!r}, expected 10 (updated value)"
          r = c.get(2); assert r == -1, f"get(2) returned {r!r}, expected -1 (least recently used)"
          r = c.get(3); assert r == 3, f"get(3) returned {r!r}, expected 3"
        ` },
      { name: "get refreshes recency", code: py`
          c = LRUCache(3)
          c.put(1, 1); c.put(2, 2); c.put(3, 3)
          c.get(1)       # order now 2, 3, 1
          c.put(4, 4)    # evicts 2
          r = c.get(2); assert r == -1, f"get(2) returned {r!r}, expected -1"
          c.put(5, 5)    # evicts 3
          r = c.get(3); assert r == -1, f"get(3) returned {r!r}, expected -1"
          for k in (1, 4, 5):
              r = c.get(k); assert r == k, f"get({k}) returned {r!r}, expected {k}"
        ` },
      { name: "large workload", code: py`
          cap = 3000
          c = LRUCache(cap)
          for i in range(20000):
              c.put(i, i * 2)
              if i % 2 == 0:
                  c.get(i // 2)
          for k in range(20000 - cap, 20000):
              r = c.get(k)
              assert r == k * 2, f"get({k}) returned {r!r}, expected {k * 2}"
          r = c.get(0); assert r == -1, f"get(0) returned {r!r}, expected -1"
        ` },
    ],
    hints: [
      "A dictionary gives O(1) lookup, but you also need to know which key was used least recently, and update that order in O(1).",
      "Combine a hash map with a doubly linked list ordered by recency (or use collections.OrderedDict, which is exactly that).",
      "On get: if present, move the key to the 'most recent' end and return its value. On put: insert/update the key and move it to the most recent end; if the size exceeds capacity, remove the item at the least recent end.",
    ],
    solution: py`
      from collections import OrderedDict

      class LRUCache:
          def __init__(self, capacity: int):
              self.capacity = capacity
              self.data: OrderedDict[int, int] = OrderedDict()

          def get(self, key: int) -> int:
              if key not in self.data:
                  return -1
              self.data.move_to_end(key)
              return self.data[key]

          def put(self, key: int, value: int) -> None:
              self.data[key] = value
              self.data.move_to_end(key)
              if len(self.data) > self.capacity:
                  self.data.popitem(last=False)
    `,
    complexity: "O(1) per get/put, O(capacity) space",
    explanation: md`
      \`OrderedDict\` is a hash map plus a doubly linked list of its keys, so lookups, \`move_to_end\`, and \`popitem(last=False)\` are all O(1).
      Keeping the most recently used key at the end means the least recently used key is always at the front, ready to evict.
      The hand-rolled version (dict of key to node, plus sentinel head/tail nodes) works the same way.
    `,
  },
  {
    id: "implement-trie",
    title: "Implement Trie (Prefix Tree)",
    difficulty: "Medium",
    topic: "Design",
    tags: ["design", "trie", "strings"],
    prompt: md`
      A **trie** (prefix tree) stores strings so that keys and prefixes can be looked up efficiently.

      Implement the \`Trie\` class:
      - \`Trie()\` initializes an empty trie.
      - \`insert(word: str) -> None\` inserts \`word\`.
      - \`search(word: str) -> bool\` returns \`True\` if \`word\` was inserted before.
      - \`starts_with(prefix: str) -> bool\` returns \`True\` if some inserted word starts with \`prefix\`.

      **Example**
      \`\`\`
      t = Trie()
      t.insert("apple")
      t.search("apple")    # True
      t.search("app")      # False
      t.starts_with("app") # True
      t.insert("app")
      t.search("app")      # True
      \`\`\`

      **Constraints:**
      - \`1 <= len(word), len(prefix) <= 2000\`
      - Lowercase English letters only
      - Up to \`3 * 10^4\` calls in total
    `,
    starter: py`
      class Trie:
          def __init__(self):
              pass

          def insert(self, word: str) -> None:
              pass

          def search(self, word: str) -> bool:
              pass

          def starts_with(self, prefix: str) -> bool:
              pass
    `,
    tests: [
      { name: "example", code: py`
          t = Trie()
          t.insert("apple")
          r = t.search("apple"); assert r is True, f"search('apple') returned {r!r}, expected True"
          r = t.search("app"); assert r is False, f"search('app') returned {r!r}, expected False (only a prefix)"
          r = t.starts_with("app"); assert r is True, f"starts_with('app') returned {r!r}, expected True"
          t.insert("app")
          r = t.search("app"); assert r is True, f"search('app') after insert returned {r!r}, expected True"
        ` },
      { name: "empty trie", code: py`
          t = Trie()
          r = t.search("a"); assert r is False, f"search('a') on empty trie returned {r!r}, expected False"
          r = t.starts_with("a"); assert r is False, f"starts_with('a') on empty trie returned {r!r}, expected False"
        ` },
      { name: "word longer than inserted", code: py`
          t = Trie()
          t.insert("car")
          r = t.search("cart"); assert r is False, f"search('cart') returned {r!r}, expected False"
          r = t.starts_with("cart"); assert r is False, f"starts_with('cart') returned {r!r}, expected False"
          r = t.starts_with("car"); assert r is True, f"starts_with('car') returned {r!r}, expected True (whole word is a prefix of itself)"
        ` },
      { name: "branching words", code: py`
          t = Trie()
          for w in ["tea", "ten", "to", "inn", "in"]:
              t.insert(w)
          for w in ["tea", "ten", "to", "inn", "in"]:
              r = t.search(w); assert r is True, f"search({w!r}) returned {r!r}, expected True"
          for w in ["te", "t", "i", "tent", "inner"]:
              r = t.search(w); assert r is False, f"search({w!r}) returned {r!r}, expected False"
          for p in ["te", "t", "i", "in", "to"]:
              r = t.starts_with(p); assert r is True, f"starts_with({p!r}) returned {r!r}, expected True"
          for p in ["a", "tx", "ib"]:
              r = t.starts_with(p); assert r is False, f"starts_with({p!r}) returned {r!r}, expected False"
        ` },
      { name: "duplicate inserts", code: py`
          t = Trie()
          t.insert("go"); t.insert("go")
          r = t.search("go"); assert r is True, f"search('go') returned {r!r}, expected True"
          r = t.search("g"); assert r is False, f"search('g') returned {r!r}, expected False"
        ` },
      { name: "many words", code: py`
          t = Trie()
          letters = "abcdefghij"
          words = [a + b + c + d for a in letters for b in letters for c in letters for d in letters[:5]]
          for w in words:
              t.insert(w)
          for w in words[::7]:
              r = t.search(w); assert r is True, f"search({w!r}) returned {r!r}, expected True"
          r = t.search("aaaf"); assert r is False, f"search('aaaf') returned {r!r}, expected False"
          r = t.starts_with("jjj"); assert r is True, f"starts_with('jjj') returned {r!r}, expected True"
          r = t.starts_with("jjjf"); assert r is False, f"starts_with('jjjf') returned {r!r}, expected False"
          r = t.starts_with("k"); assert r is False, f"starts_with('k') returned {r!r}, expected False"
        ` },
    ],
    hints: [
      "Words that share a prefix can share storage for that prefix.",
      "Use a tree where each node maps a character to a child node, plus a flag marking whether a word ends at that node.",
      "insert walks down from the root creating missing children and sets the end flag on the last node. Both search and starts_with walk down the same way and fail if a child is missing; search additionally requires the end flag on the final node.",
    ],
    solution: py`
      class TrieNode:
          __slots__ = ("children", "end")

          def __init__(self):
              self.children: dict[str, "TrieNode"] = {}
              self.end = False


      class Trie:
          def __init__(self):
              self.root = TrieNode()

          def insert(self, word: str) -> None:
              node = self.root
              for ch in word:
                  node = node.children.setdefault(ch, TrieNode())
              node.end = True

          def _walk(self, s: str) -> TrieNode | None:
              node = self.root
              for ch in s:
                  node = node.children.get(ch)
                  if node is None:
                      return None
              return node

          def search(self, word: str) -> bool:
              node = self._walk(word)
              return node is not None and node.end

          def starts_with(self, prefix: str) -> bool:
              return self._walk(prefix) is not None
    `,
    complexity: "O(L) per operation for a string of length L; O(total characters) space",
    explanation: md`
      Each trie node represents a prefix, and its children extend that prefix by one character. Walking the characters of a string
      either reaches the node for that prefix or falls off the tree, which answers \`starts_with\`.
      The \`end\` flag separates whole inserted words from mere prefixes, which is what \`search\` needs.
    `,
  },
];
