"""
Assessment API — Adaptive Learning MVP

This module serves meaningful, domain-specific diagnostic assessments based on the
student's selected learning subject and topic.  The 5-IQ-category baseline is replaced
with prerequisite-aligned subject questions seeded from a rich curated bank, with
automatic AI-powered generation for topics not in the bank.
"""
import json
import logging
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.dependencies.auth import get_current_user
from app.db.database import get_session_factory
from app.models.user import User
from app.models.assessment import (
    DiagnosticQuestion,
    DiagnosticAssessment,
    DiagnosticAttempt,
    StudentSkill,
    StudentSkillHistory,
)
from app.schemas.assessment import (
    DiagnosticQuestionPublic,
    AssessmentStartResponse,
    AssessmentSubmitRequest,
    SkillScore,
    AddCustomSkillRequest,
    UpdateSkillScoreRequest,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/assessment", tags=["assessment"])


def get_db():
    factory = get_session_factory()
    with factory() as session:
        yield session


# ---------------------------------------------------------------------------
# General Learning Capacity Categories & Question Bank
# ---------------------------------------------------------------------------
GENERAL_LEARNING_CAPACITY_CATEGORIES = [
    "Numerical Calculation",
    "Logical Reasoning",
    "Abstract Thinking",
    "Association & Analogy",
    "Spatial Imagination",
]

# Backward compatibility alias
REQUIRED_CATEGORIES = GENERAL_LEARNING_CAPACITY_CATEGORIES

GENERAL_LEARNING_CAPACITY_QUESTIONS = [
    # ── 1. Numerical Calculation ──────────────────────────────────────────────
    {
        "skill_category": "Numerical Calculation",
        "text": "A student scores 72 out of 90 on a quantitative evaluation. What is the equivalent percentage?",
        "options": ["A. 75%", "B. 80%", "C. 82%", "D. 85%"],
        "correct_answer": "B. 80%",
        "explanation": "72 ÷ 90 = 0.80, which equals 80%.",
        "difficulty": "Easy",
    },
    {
        "skill_category": "Numerical Calculation",
        "text": "If a processor executes 120 instructions in 40 milliseconds, how many instructions will it complete in 150 milliseconds at the exact same rate?",
        "options": ["A. 300 instructions", "B. 360 instructions", "C. 450 instructions", "D. 500 instructions"],
        "correct_answer": "C. 450 instructions",
        "explanation": "Rate = 120 / 40 = 3 instructions per millisecond. 150 ms × 3 = 450 instructions.",
        "difficulty": "Medium",
    },

    # ── 2. Logical Reasoning ──────────────────────────────────────────────────
    {
        "skill_category": "Logical Reasoning",
        "text": "All valid deterministic procedures have a termination condition. Merge Sort is a deterministic procedure. What conclusion must logically follow?",
        "options": [
            "A. Merge Sort has a termination condition.",
            "B. Everything with a termination condition is Merge Sort.",
            "C. Merge Sort is the fastest deterministic procedure.",
            "D. Only sorting procedures terminate.",
        ],
        "correct_answer": "A. Merge Sort has a termination condition.",
        "explanation": "By categorical syllogism: if all members of set A have property P, and M is in set A, M necessarily has property P.",
        "difficulty": "Easy",
    },
    {
        "skill_category": "Logical Reasoning",
        "text": "Consider the rule: 'If condition X occurs, then outcome Y is guaranteed.' Observation shows that outcome Y did NOT occur. What must be true?",
        "options": [
            "A. Condition X occurred anyway.",
            "B. Condition X did not occur.",
            "C. Outcome Y will occur later.",
            "D. Condition X has no relation to outcome Y.",
        ],
        "correct_answer": "B. Condition X did not occur.",
        "explanation": "By modus tollens (contrapositive logic): (X → Y) implies (¬Y → ¬X). Since Y did not occur, X cannot have occurred.",
        "difficulty": "Medium",
    },

    # ── 3. Abstract Thinking ──────────────────────────────────────────────────
    {
        "skill_category": "Abstract Thinking",
        "text": "Identify the underlying pattern in the sequence: 2, 6, 12, 20, 30, ___. What is the next term?",
        "options": ["A. 40", "B. 42", "C. 44", "D. 48"],
        "correct_answer": "B. 42",
        "explanation": "The differences between successive terms are +4, +6, +8, +10. The next difference is +12, so 30 + 12 = 42 (also n·(n+1) for n=6: 6×7=42).",
        "difficulty": "Medium",
    },
    {
        "skill_category": "Abstract Thinking",
        "text": "Consider the conceptual relationship: 'Seed is to Plant as Hypothesis is to ___'?",
        "options": [
            "A. Experiment",
            "B. Scientific Theory",
            "C. Question",
            "D. Observation",
        ],
        "correct_answer": "B. Scientific Theory",
        "explanation": "A seed is the foundational starting point that matures into a full plant; a validated hypothesis matures into a comprehensive scientific theory.",
        "difficulty": "Easy",
    },

    # ── 4. Association & Analogy ──────────────────────────────────────────────
    {
        "skill_category": "Association & Analogy",
        "text": "Architectural Blueprint is to Completed Building as System Specification is to ___?",
        "options": [
            "A. Software Program",
            "B. Computer Hardware",
            "C. Power Supply",
            "D. Network Cable",
        ],
        "correct_answer": "A. Software Program",
        "explanation": "A blueprint is the design model implemented to build a physical structure; a specification is the design model implemented to construct a software program.",
        "difficulty": "Easy",
    },
    {
        "skill_category": "Association & Analogy",
        "text": "Compass is to Navigation as Clock is to ___?",
        "options": [
            "A. Distance",
            "B. Timekeeping",
            "C. Speed",
            "D. Rotation",
        ],
        "correct_answer": "B. Timekeeping",
        "explanation": "A compass is an instrument whose primary purpose is navigation; a clock is an instrument whose primary purpose is timekeeping.",
        "difficulty": "Easy",
    },

    # ── 5. Spatial Imagination ────────────────────────────────────────────────
    {
        "skill_category": "Spatial Imagination",
        "text": "A solid wooden cube has all 6 outer faces painted blue. If it is cut into 27 equal small cubes (3×3×3 grid), how many small cubes have blue paint on EXACTLY 3 faces?",
        "options": ["A. 4 cubes", "B. 6 cubes", "C. 8 cubes", "D. 12 cubes"],
        "correct_answer": "C. 8 cubes",
        "explanation": "Only cubes at the 8 corners/vertices of the cube have three painted faces exposed.",
        "difficulty": "Medium",
    },
    {
        "skill_category": "Spatial Imagination",
        "text": "An autonomous drone starts facing North. It rotates 90° clockwise, then 180° counter-clockwise, and finally 90° clockwise. What direction is it facing now?",
        "options": ["A. North", "B. East", "C. South", "D. West"],
        "correct_answer": "A. North",
        "explanation": "Starting North: +90° = East; -180° = West; +90° = North. The cumulative net rotation is +90 - 180 + 90 = 0° (North).",
        "difficulty": "Easy",
    },
]

# ---------------------------------------------------------------------------
# Curated Domain Question Bank
# ---------------------------------------------------------------------------
# Each entry maps a (subject_keyword, topic_keyword) pair to a list of
# skill-labelled diagnostic questions that directly evaluate prerequisite
# knowledge required for the stated learning goal.
# ---------------------------------------------------------------------------

DOMAIN_QUESTION_BANK = {
    # ── Data Structures ──────────────────────────────────────────────────────
    ("data structures", "binary search tree"): [
        {
            "skill_category": "Recursion",
            "text": "What is the base case for a recursive in-order traversal of a Binary Search Tree?",
            "options": ["A. When the node has two children", "B. When the current node is None", "C. When the node value equals the target", "D. When the tree height is zero"],
            "correct_answer": "B. When the current node is None",
            "explanation": "Recursive traversals terminate when the current node pointer is None, i.e., we've gone past a leaf.",
            "difficulty": "Easy",
        },
        {
            "skill_category": "Recursion",
            "text": "A recursive function to find an element in a BST calls itself with a smaller subproblem each time.  Which property of BST makes this possible?",
            "options": ["A. All left subtree values < node value < all right subtree values", "B. The tree is always balanced", "C. Nodes are stored in sorted array order", "D. Every node has exactly two children"],
            "correct_answer": "A. All left subtree values < node value < all right subtree values",
            "explanation": "The BST ordering property lets us halve the search space at every node, making recursion straightforward.",
            "difficulty": "Medium",
        },
        {
            "skill_category": "Tree Fundamentals",
            "text": "In a rooted tree, the node with no parent is called the ___.",
            "options": ["A. Leaf", "B. Root", "C. Sibling", "D. Ancestor"],
            "correct_answer": "B. Root",
            "explanation": "The root is the topmost node of a rooted tree and has no parent.",
            "difficulty": "Easy",
        },
        {
            "skill_category": "Tree Fundamentals",
            "text": "The height of a tree is defined as ___.",
            "options": ["A. Number of nodes", "B. Maximum number of edges from root to any leaf", "C. Number of leaf nodes", "D. Total number of edges"],
            "correct_answer": "B. Maximum number of edges from root to any leaf",
            "explanation": "Height = longest root-to-leaf path measured in edges.",
            "difficulty": "Easy",
        },
        {
            "skill_category": "Binary Trees",
            "text": "A Binary Tree where every node has either 0 or 2 children is called a ___.",
            "options": ["A. Full Binary Tree", "B. Complete Binary Tree", "C. Perfect Binary Tree", "D. Degenerate Tree"],
            "correct_answer": "A. Full Binary Tree",
            "explanation": "A full (strict) binary tree allows only 0 or 2 children per node.",
            "difficulty": "Easy",
        },
        {
            "skill_category": "Binary Trees",
            "text": "Which traversal of a BST visits nodes in ascending sorted order?",
            "options": ["A. Pre-order", "B. Post-order", "C. In-order", "D. Level-order"],
            "correct_answer": "C. In-order",
            "explanation": "In-order (left → root → right) visits a BST in sorted ascending order.",
            "difficulty": "Easy",
        },
        {
            "skill_category": "Binary Search Trees",
            "text": "Given a BST, searching for key 45 from root 50 — which subtree do you traverse?",
            "options": ["A. Right subtree", "B. Left subtree", "C. Both subtrees", "D. Restart from root"],
            "correct_answer": "B. Left subtree",
            "explanation": "45 < 50 so we move left per the BST ordering property.",
            "difficulty": "Easy",
        },
        {
            "skill_category": "Binary Search Trees",
            "text": "What is the time complexity of inserting a key into a BST with n nodes in the average case?",
            "options": ["A. O(1)", "B. O(log n)", "C. O(n)", "D. O(n log n)"],
            "correct_answer": "B. O(log n)",
            "explanation": "On average (balanced BST), insertion visits O(log n) nodes.",
            "difficulty": "Medium",
        },
        {
            "skill_category": "Arrays",
            "text": "Which array operation has O(n) time complexity in the worst case?",
            "options": ["A. Access by index", "B. Update by index", "C. Linear search", "D. Reading the first element"],
            "correct_answer": "C. Linear search",
            "explanation": "Linear search may inspect every element, so worst-case is O(n).",
            "difficulty": "Easy",
        },
        {
            "skill_category": "Arrays",
            "text": "An array of n elements is given sorted in ascending order.  Binary search runs in ___.",
            "options": ["A. O(n)", "B. O(n²)", "C. O(log n)", "D. O(1)"],
            "correct_answer": "C. O(log n)",
            "explanation": "Binary search halves the search space each step: O(log n).",
            "difficulty": "Easy",
        },
    ],
    ("data structures", "linked list"): [
        {
            "skill_category": "Pointers & References",
            "text": "What does the 'next' pointer of the last node in a singly linked list point to?",
            "options": ["A. The head node", "B. Itself", "C. NULL / None", "D. The previous node"],
            "correct_answer": "C. NULL / None",
            "explanation": "The tail node's next pointer is set to NULL to signal end of the list.",
            "difficulty": "Easy",
        },
        {
            "skill_category": "Pointers & References",
            "text": "To insert a node after a given node P in a singly linked list, which pointer must be updated?",
            "options": ["A. Only the new node's next", "B. Only P's next", "C. New node's next, then P's next", "D. Head pointer only"],
            "correct_answer": "C. New node's next, then P's next",
            "explanation": "First set new_node.next = P.next, then P.next = new_node to avoid losing the rest of the list.",
            "difficulty": "Medium",
        },
        {
            "skill_category": "Linked Lists",
            "text": "What is the time complexity of accessing the k-th element of a singly linked list?",
            "options": ["A. O(1)", "B. O(log n)", "C. O(k)", "D. O(n²)"],
            "correct_answer": "C. O(k)",
            "explanation": "Linked lists lack random access; you must traverse node-by-node from head.",
            "difficulty": "Easy",
        },
        {
            "skill_category": "Linked Lists",
            "text": "How do you detect a cycle in a linked list efficiently?",
            "options": ["A. Sort the list first", "B. Floyd's Tortoise & Hare algorithm", "C. Hash each node value", "D. Reverse the list and compare"],
            "correct_answer": "B. Floyd's Tortoise & Hare algorithm",
            "explanation": "Two pointers (slow/fast) running at different speeds will meet if a cycle exists — O(n) time, O(1) space.",
            "difficulty": "Medium",
        },
        {
            "skill_category": "Arrays",
            "text": "Which of the following is TRUE about arrays versus linked lists?",
            "options": ["A. Linked lists offer O(1) random access", "B. Arrays offer O(1) insertion at arbitrary positions", "C. Arrays offer O(1) access by index", "D. Both have the same memory usage"],
            "correct_answer": "C. Arrays offer O(1) access by index",
            "explanation": "Arrays are contiguous memory so index access is O(1); linked list traversal is O(n).",
            "difficulty": "Easy",
        },
    ],
    ("data structures", "graph"): [
        {
            "skill_category": "Graph Fundamentals",
            "text": "A graph where edges have direction (u → v) is called a ___.",
            "options": ["A. Undirected Graph", "B. Directed Graph (Digraph)", "C. Weighted Graph", "D. Bipartite Graph"],
            "correct_answer": "B. Directed Graph (Digraph)",
            "explanation": "Edges with direction are directed edges; the graph is a digraph.",
            "difficulty": "Easy",
        },
        {
            "skill_category": "Graph Traversal",
            "text": "Which traversal algorithm uses a queue (FIFO) data structure?",
            "options": ["A. Depth-First Search", "B. Breadth-First Search", "C. Dijkstra's", "D. Prim's"],
            "correct_answer": "B. Breadth-First Search",
            "explanation": "BFS explores nodes layer by layer using a queue.",
            "difficulty": "Easy",
        },
        {
            "skill_category": "Graph Traversal",
            "text": "DFS on a graph with V vertices and E edges has time complexity ___.",
            "options": ["A. O(V)", "B. O(E)", "C. O(V + E)", "D. O(V × E)"],
            "correct_answer": "C. O(V + E)",
            "explanation": "DFS visits each vertex once and each edge once: O(V + E).",
            "difficulty": "Medium",
        },
        {
            "skill_category": "Recursion",
            "text": "Recursive DFS uses the call stack to track visited nodes.  What happens if the stack overflows?",
            "options": ["A. DFS terminates early", "B. A StackOverflowError / RecursionError occurs", "C. DFS automatically switches to BFS", "D. Nothing — stacks are infinite"],
            "correct_answer": "B. A StackOverflowError / RecursionError occurs",
            "explanation": "Very deep graphs may exhaust the call stack, causing a stack overflow.",
            "difficulty": "Medium",
        },
        {
            "skill_category": "Graph Fundamentals",
            "text": "An adjacency matrix for a graph with V vertices requires ___ space.",
            "options": ["A. O(V)", "B. O(V + E)", "C. O(V²)", "D. O(E²)"],
            "correct_answer": "C. O(V²)",
            "explanation": "Adjacency matrix stores an entry for every (i, j) pair: V×V cells.",
            "difficulty": "Medium",
        },
    ],
    # ── Algorithms ──────────────────────────────────────────────────────────
    ("algorithms", "sorting"): [
        {
            "skill_category": "Comparison-Based Sorting",
            "text": "What is the worst-case time complexity of Quick Sort?",
            "options": ["A. O(n log n)", "B. O(n²)", "C. O(n)", "D. O(log n)"],
            "correct_answer": "B. O(n²)",
            "explanation": "Worst-case occurs when the pivot is always the smallest or largest element (already sorted array with naive pivot).",
            "difficulty": "Medium",
        },
        {
            "skill_category": "Comparison-Based Sorting",
            "text": "Which sorting algorithm is stable AND has guaranteed O(n log n) worst-case?",
            "options": ["A. Quick Sort", "B. Heap Sort", "C. Merge Sort", "D. Insertion Sort"],
            "correct_answer": "C. Merge Sort",
            "explanation": "Merge Sort is stable and always O(n log n) — worst, average, and best case.",
            "difficulty": "Medium",
        },
        {
            "skill_category": "Recursion",
            "text": "Merge Sort splits the array in half recursively.  What is the recurrence relation?",
            "options": ["A. T(n) = T(n-1) + O(1)", "B. T(n) = 2T(n/2) + O(n)", "C. T(n) = T(n/2) + O(1)", "D. T(n) = n·T(n-1)"],
            "correct_answer": "B. T(n) = 2T(n/2) + O(n)",
            "explanation": "Two recursive calls on halves + O(n) merge step. By Master Theorem → O(n log n).",
            "difficulty": "Hard",
        },
        {
            "skill_category": "Comparison-Based Sorting",
            "text": "Which sorting algorithm has the best average-case performance for nearly-sorted arrays?",
            "options": ["A. Bubble Sort", "B. Selection Sort", "C. Insertion Sort", "D. Merge Sort"],
            "correct_answer": "C. Insertion Sort",
            "explanation": "Insertion Sort is nearly O(n) on almost-sorted data — only ~n comparisons needed.",
            "difficulty": "Easy",
        },
        {
            "skill_category": "Arrays",
            "text": "After one pass of Bubble Sort over [5, 3, 8, 1], what is the resulting array?",
            "options": ["A. [3, 5, 1, 8]", "B. [1, 3, 5, 8]", "C. [5, 3, 1, 8]", "D. [3, 5, 8, 1]"],
            "correct_answer": "A. [3, 5, 1, 8]",
            "explanation": "One full pass bubbles the largest element (8) to its correct position: 5↔3→[3,5,8,1]→8↔1→[3,5,1,8].",
            "difficulty": "Medium",
        },
    ],
    ("algorithms", "dynamic programming"): [
        {
            "skill_category": "Recursion",
            "text": "Which of the following best describes memoisation in dynamic programming?",
            "options": ["A. Solving subproblems bottom-up", "B. Caching results of recursive calls to avoid recomputation", "C. Reducing space complexity to O(1)", "D. Converting recursion to iteration"],
            "correct_answer": "B. Caching results of recursive calls to avoid recomputation",
            "explanation": "Memoisation (top-down DP) stores each subproblem result on first computation.",
            "difficulty": "Easy",
        },
        {
            "skill_category": "Recursion",
            "text": "The naive recursive Fibonacci function has time complexity ___.  Memoised DP reduces this to ___.",
            "options": ["A. O(n) → O(1)", "B. O(2ⁿ) → O(n)", "C. O(n²) → O(n)", "D. O(n log n) → O(log n)"],
            "correct_answer": "B. O(2ⁿ) → O(n)",
            "explanation": "Naive recursion recomputes overlapping subproblems exponentially; memoisation computes each only once.",
            "difficulty": "Medium",
        },
        {
            "skill_category": "Dynamic Programming",
            "text": "The Longest Common Subsequence (LCS) of 'ABCBDAB' and 'BDCABA' has length ___.",
            "options": ["A. 3", "B. 4", "C. 5", "D. 6"],
            "correct_answer": "B. 4",
            "explanation": "LCS = 'BCBA' or 'BCAB' — length 4.",
            "difficulty": "Hard",
        },
        {
            "skill_category": "Dynamic Programming",
            "text": "What condition must a problem satisfy to be solvable with DP?",
            "options": ["A. Must have a greedy solution", "B. Must have overlapping subproblems and optimal substructure", "C. Must be solvable in O(n log n)", "D. Must have a recursive but not iterative solution"],
            "correct_answer": "B. Must have overlapping subproblems and optimal substructure",
            "explanation": "Both properties are necessary for DP: reuse of subproblem results and composability of optimal solutions.",
            "difficulty": "Easy",
        },
        {
            "skill_category": "Arrays",
            "text": "In the 0/1 Knapsack problem with n items and capacity W, the DP table has ___ entries.",
            "options": ["A. n + W", "B. n × W", "C. n²", "D. W²"],
            "correct_answer": "B. n × W",
            "explanation": "The DP table is (n+1) × (W+1), so O(n×W) entries.",
            "difficulty": "Medium",
        },
    ],
    # ── Python / Programming ─────────────────────────────────────────────────
    ("python", "functions"): [
        {
            "skill_category": "Python Functions",
            "text": "What does the *args parameter allow in a Python function?",
            "options": ["A. Keyword arguments only", "B. Any number of positional arguments", "C. Default parameter values", "D. Return multiple values"],
            "correct_answer": "B. Any number of positional arguments",
            "explanation": "*args collects extra positional arguments into a tuple.",
            "difficulty": "Easy",
        },
        {
            "skill_category": "Python Functions",
            "text": "What is a Python lambda function?",
            "options": ["A. A function defined with def that returns None", "B. An anonymous single-expression function", "C. A class method", "D. A built-in function"],
            "correct_answer": "B. An anonymous single-expression function",
            "explanation": "Lambda creates small anonymous functions: lambda x: x + 1",
            "difficulty": "Easy",
        },
        {
            "skill_category": "Recursion",
            "text": "What is the output of factorial(0) if defined as: factorial(n) = 1 if n == 0 else n * factorial(n-1)?",
            "options": ["A. 0", "B. 1", "C. Error", "D. None"],
            "correct_answer": "B. 1",
            "explanation": "The base case returns 1 when n == 0 (0! = 1 by mathematical convention).",
            "difficulty": "Easy",
        },
        {
            "skill_category": "Python Functions",
            "text": "Which keyword makes a Python function a generator?",
            "options": ["A. return", "B. yield", "C. async", "D. global"],
            "correct_answer": "B. yield",
            "explanation": "yield turns a function into a generator, producing values lazily one at a time.",
            "difficulty": "Medium",
        },
        {
            "skill_category": "Python Functions",
            "text": "What is a closure in Python?",
            "options": ["A. A function that closes the program", "B. A function that captures variables from its enclosing scope", "C. A class with private methods", "D. A module import pattern"],
            "correct_answer": "B. A function that captures variables from its enclosing scope",
            "explanation": "Closures 'close over' variables from their enclosing function scope.",
            "difficulty": "Medium",
        },
    ],
}

# ---------------------------------------------------------------------------
# Generic prerequisite question generator for topics not in the bank
# ---------------------------------------------------------------------------

def _generic_questions_for_subject_topic(subject: str, topic: str) -> list[dict]:
    """Return a set of generic but subject-contextualised diagnostic questions."""
    s, t = subject.strip(), topic.strip()
    if s == "General" and t == "Core Concepts":
        return [
            {
                "skill_category": cat,
                "text": f"Evaluate baseline competency in {cat}.",
                "options": ["A. Option A", "B. Option B", "C. Option C", "D. Option D"],
                "correct_answer": "A. Option A",
                "explanation": f"Diagnostic check for {cat}",
                "difficulty": "Easy",
            }
            for cat in REQUIRED_CATEGORIES
        ]
    return [
        {
            "skill_category": f"{t} Fundamentals",
            "text": f"Which statement BEST describes the core purpose of {t} in {s}?",
            "options": [
                f"A. {t} provides foundational structures/algorithms for solving domain problems in {s}",
                f"B. {t} is used only in advanced research, not practical {s}",
                f"C. {t} replaces all other concepts in {s}",
                f"D. {t} is unrelated to {s}",
            ],
            "correct_answer": f"A. {t} provides foundational structures/algorithms for solving domain problems in {s}",
            "explanation": f"Understanding {t} is central to {s} problem solving.",
            "difficulty": "Easy",
        },
        {
            "skill_category": f"{t} Prerequisites",
            "text": f"Before studying {t}, a student should be comfortable with which foundational concept in {s}?",
            "options": [
                f"A. Basic variables, control flow, and functions",
                f"B. Advanced distributed systems",
                f"C. Machine learning model training",
                f"D. Database administration",
            ],
            "correct_answer": "A. Basic variables, control flow, and functions",
            "explanation": "Foundational programming concepts are prerequisites for most {s} topics.",
            "difficulty": "Easy",
        },
        {
            "skill_category": f"{t} Application",
            "text": f"A student successfully applying {t} in {s} would demonstrate ___.",
            "options": [
                f"A. Memorising definitions without understanding principles",
                f"B. Ability to implement, analyse, and adapt {t} to solve new problems",
                f"C. Using {t} only in theoretical settings",
                f"D. Avoiding {t} and using alternatives",
            ],
            "correct_answer": f"B. Ability to implement, analyse, and adapt {t} to solve new problems",
            "explanation": "True mastery means applying knowledge to novel situations.",
            "difficulty": "Medium",
        },
        {
            "skill_category": f"Problem Solving",
            "text": "When approaching an unfamiliar problem, what is the BEST first step?",
            "options": [
                "A. Write code immediately",
                "B. Understand the problem constraints and identify what is being asked",
                "C. Search for a solution online",
                "D. Randomly try algorithms until one works",
            ],
            "correct_answer": "B. Understand the problem constraints and identify what is being asked",
            "explanation": "Problem decomposition before coding leads to cleaner, more correct solutions.",
            "difficulty": "Easy",
        },
        {
            "skill_category": f"Analysis",
            "text": f"How should you evaluate whether your solution to a {t} problem is efficient?",
            "options": [
                "A. Count the number of lines of code",
                "B. Measure time and space complexity using Big-O notation",
                "C. Run it once and see if it feels fast",
                "D. Check if the function name is descriptive",
            ],
            "correct_answer": "B. Measure time and space complexity using Big-O notation",
            "explanation": "Big-O analysis provides a rigorous measure of algorithmic efficiency.",
            "difficulty": "Easy",
        },
    ]


def _get_bank_questions(subject: str, topic: str) -> list[dict]:
    """Look up questions from the curated bank, case-insensitively."""
    s_low = subject.lower().strip()
    t_low = topic.lower().strip()

    # Exact match first
    for (bank_s, bank_t), questions in DOMAIN_QUESTION_BANK.items():
        if bank_s in s_low and bank_t in t_low:
            return questions

    # Partial match on topic only
    for (bank_s, bank_t), questions in DOMAIN_QUESTION_BANK.items():
        if bank_t in t_low or t_low in bank_t:
            return questions

    return []


def _ensure_skill_questions_in_db(db: Session, questions_data: list[dict]) -> None:
    """Upsert diagnostic questions from a question list into the database."""
    for q_data in questions_data:
        existing = db.execute(
            select(DiagnosticQuestion).where(
                DiagnosticQuestion.skill_category == q_data["skill_category"],
                DiagnosticQuestion.text == q_data["text"],
            )
        ).scalar_one_or_none()

        if not existing:
            q = DiagnosticQuestion(
                text=q_data["text"],
                options=q_data["options"],
                correct_answer=q_data["correct_answer"],
                explanation=q_data.get("explanation", ""),
                skill_category=q_data["skill_category"],
                difficulty=q_data.get("difficulty", "Medium"),
                is_active=True,
            )
            db.add(q)

    db.commit()


def _get_or_create_subject_skills(db: Session, user_id: int, skill_categories: list[str]) -> None:
    """Initialise StudentSkill rows (score=0) for any skill categories that don't yet exist."""
    for cat in skill_categories:
        existing = db.execute(
            select(StudentSkill).where(
                StudentSkill.user_id == user_id,
                StudentSkill.skill_category == cat,
            )
        ).scalar_one_or_none()
        if not existing:
            db.add(StudentSkill(user_id=user_id, skill_category=cat, score=0.0))
    db.commit()


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.post("/start", response_model=AssessmentStartResponse)
def start_assessment(
    subject: str | None = None,
    topic: str | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Start or resume the initial diagnostic assessment.

    Evaluates the student across 5 general learning capacity dimensions:
    Numerical Calculation, Logical Reasoning, Abstract Thinking,
    Association & Analogy, and Spatial Imagination.
    Course and subject selection are conducted later.
    """
    if current_user.role != "student":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Only students can take assessments"
        )

    # Seed general learning capacity questions into DB
    _ensure_skill_questions_in_db(db, GENERAL_LEARNING_CAPACITY_QUESTIONS)

    # Initialise StudentSkill rows (score=0.0) for the 5 general categories if not already present
    _get_or_create_subject_skills(db, current_user.id, GENERAL_LEARNING_CAPACITY_CATEGORIES)

    # Check for an uncompleted assessment
    existing = db.execute(
        select(DiagnosticAssessment).where(
            DiagnosticAssessment.user_id == current_user.id,
            DiagnosticAssessment.is_completed == False,
        )
    ).scalar_one_or_none()

    if existing:
        return {"assessment_id": existing.id}

    # Start a new assessment
    new_assessment = DiagnosticAssessment(user_id=current_user.id)
    db.add(new_assessment)
    db.commit()
    db.refresh(new_assessment)

    return {"assessment_id": new_assessment.id}


@router.get("/{assessment_id}/questions", response_model=list[DiagnosticQuestionPublic])
def get_assessment_questions(
    assessment_id: int,
    subject: str | None = None,
    topic: str | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Return all active general learning capacity questions for the assessment."""
    assessment = db.get(DiagnosticAssessment, assessment_id)
    if not assessment or assessment.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Assessment not found"
        )

    if assessment.is_completed:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Assessment already completed"
        )

    # Ensure questions are present in DB
    _ensure_skill_questions_in_db(db, GENERAL_LEARNING_CAPACITY_QUESTIONS)

    questions = db.execute(
        select(DiagnosticQuestion).where(
            DiagnosticQuestion.is_active == True,
            DiagnosticQuestion.skill_category.in_(GENERAL_LEARNING_CAPACITY_CATEGORIES),
        ).order_by(DiagnosticQuestion.id.asc())
    ).scalars().all()

    return questions


@router.post("/{assessment_id}/submit")
def submit_assessment(
    assessment_id: int,
    request: AssessmentSubmitRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Grade the general learning capacity diagnostic assessment and initialise the
    Persistent Learner Model across the 5 cognitive dimensions.
    """
    assessment = db.get(DiagnosticAssessment, assessment_id)
    if not assessment or assessment.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Assessment not found"
        )

    if assessment.is_completed:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Assessment already completed"
        )

    # Load active general learning capacity questions
    active_questions = db.execute(
        select(DiagnosticQuestion).where(
            DiagnosticQuestion.is_active == True,
            DiagnosticQuestion.skill_category.in_(GENERAL_LEARNING_CAPACITY_CATEGORIES),
        )
    ).scalars().all()
    question_map = {q.id: q for q in active_questions}

    # Count per-category correct/total
    category_correct: dict[str, int] = {cat: 0 for cat in GENERAL_LEARNING_CAPACITY_CATEGORIES}
    category_total: dict[str, int] = {cat: 0 for cat in GENERAL_LEARNING_CAPACITY_CATEGORIES}

    answered_ids = set()

    for answer in request.answers:
        q = question_map.get(answer.question_id)
        if not q:
            continue

        is_correct = (answer.selected_answer.strip() == q.correct_answer.strip())

        attempt = DiagnosticAttempt(
            assessment_id=assessment_id,
            question_id=q.id,
            selected_answer=answer.selected_answer,
            is_correct=is_correct,
        )
        db.add(attempt)
        answered_ids.add(q.id)

        cat = q.skill_category
        category_total[cat] = category_total.get(cat, 0) + 1
        if is_correct:
            category_correct[cat] = category_correct.get(cat, 0) + 1

    # Record unanswered questions as incorrect
    for q in active_questions:
        if q.id not in answered_ids:
            cat = q.skill_category
            category_total[cat] = category_total.get(cat, 0) + 1
            attempt = DiagnosticAttempt(
                assessment_id=assessment_id,
                question_id=q.id,
                selected_answer=None,
                is_correct=False,
            )
            db.add(attempt)

    # Update StudentSkill for each category
    results = []
    now = datetime.now(timezone.utc)
    for category in GENERAL_LEARNING_CAPACITY_CATEGORIES:
        total = category_total.get(category, 0)
        correct = category_correct.get(category, 0)
        score = round((correct / max(total, 1)) * 100.0, 1)

        student_skill = db.execute(
            select(StudentSkill).where(
                StudentSkill.user_id == current_user.id,
                StudentSkill.skill_category == category,
            )
        ).scalar_one_or_none()

        if student_skill:
            db.add(StudentSkillHistory(
                user_id=current_user.id,
                skill_category=category,
                score=student_skill.score,
                evidence_type="diagnostic_assessment",
                recorded_at=now,
            ))
            student_skill.score = score
            student_skill.last_updated = now
        else:
            student_skill = StudentSkill(
                user_id=current_user.id,
                skill_category=category,
                score=score,
                last_updated=now,
            )
            db.add(student_skill)

        results.append({"skill_category": category, "score": score})

    assessment.is_completed = True
    assessment.completed_at = now
    current_user.onboarding_complete = True
    db.commit()

    return {
        "message": "General learning capacity assessment completed. Your cognitive profile has been initialised.",
        "results": results,
    }


@router.get("/skills", response_model=list[SkillScore])
def get_skills(
    db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    skills = db.execute(
        select(StudentSkill).where(StudentSkill.user_id == current_user.id)
    ).scalars().all()
    return skills


@router.post("/custom-skill", response_model=SkillScore)
def add_custom_skill(
    payload: AddCustomSkillRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Allow a student to manually add a skill to their learner model."""
    category = payload.skill_category.strip()
    if not category:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Skill category cannot be empty")

    existing = db.execute(
        select(StudentSkill).where(
            StudentSkill.user_id == current_user.id,
            StudentSkill.skill_category == category,
        )
    ).scalar_one_or_none()

    if existing:
        return existing

    skill = StudentSkill(
        user_id=current_user.id,
        skill_category=category,
        score=payload.initial_score,
    )
    db.add(skill)
    db.commit()
    db.refresh(skill)
    return skill


@router.patch("/skills/{skill_id}", response_model=SkillScore)
def update_skill_score(
    skill_id: int,
    payload: UpdateSkillScoreRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    skill = db.get(StudentSkill, skill_id)
    if not skill or skill.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Skill record not found"
        )

    db.add(StudentSkillHistory(
        user_id=current_user.id,
        skill_category=skill.skill_category,
        score=skill.score,
        recorded_at=skill.last_updated or datetime.now(timezone.utc),
    ))

    skill.score = payload.score
    skill.last_updated = datetime.now(timezone.utc)
    db.commit()
    db.refresh(skill)
    return skill
