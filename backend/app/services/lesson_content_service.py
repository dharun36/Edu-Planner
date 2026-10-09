from __future__ import annotations

import logging
import re
from typing import Any, Optional

from app.ai.providers import get_llm_provider

logger = logging.getLogger(__name__)


def _sanitize_syllabus_context(syllabus_context: str, subject: str, topic: str) -> str:
    """Filter syllabus context strictly to the subject and topic to prevent cross-contamination."""
    if not syllabus_context:
        return ""

    subject_terms = [w.lower() for w in re.findall(r"\b\w{3,}\b", subject)]
    topic_terms = [w.lower() for w in re.findall(r"\b\w{3,}\b", topic)]
    all_terms = set(subject_terms + topic_terms)

    relevant_lines: list[str] = []
    for line in syllabus_context.split("\n"):
        line_clean = line.strip()
        if not line_clean or line_clean.startswith("---") or line_clean.startswith("["):
            continue
        line_lower = line_clean.lower()
        if any(term in line_lower for term in all_terms):
            relevant_lines.append(line_clean)

    if not relevant_lines:
        return ""

    return "\n".join(relevant_lines[:8])


def _build_structured_fallback_lesson(
    lesson: str,
    subject: str,
    topic: str,
    learning_objective: str = "",
    clean_syllabus: str = "",
) -> str:
    """High-quality pedagogical lesson fallback with structured explanations, comparison tables, and review questions."""
    clean_lesson = re.sub(r"^Study:\s*", "", lesson, flags=re.IGNORECASE).strip()
    
    # Sub-concepts from lesson title
    sub_concepts = [c.strip() for c in re.split(r"[:,&|–—\-/]|\band\b", clean_lesson) if len(c.strip()) > 2]
    if not sub_concepts:
        sub_concepts = [clean_lesson]

    md = [
        f"# {clean_lesson}",
        f"**Subject:** {subject}  |  **Topic:** {topic}",
        "",
        "---",
        "",
        "## 1. 📌 Overview & Learning Objectives",
        f"This module provides a comprehensive, rigorous exploration of **{clean_lesson}** within the discipline of **{subject}**.",
        "",
        "### Key Learning Outcomes:",
        f"- **Conceptual Mastery:** Understand the underlying theory, architecture, and design principles governing {clean_lesson.lower()}.",
        f"- **Architectural Analysis:** Analyze the trade-offs, resource models, and operational patterns in {topic.lower()}.",
        f"- **Real-World Application:** Evaluate when and why industry engineering teams select specific deployment models and frameworks.",
    ]

    if clean_syllabus:
        md.extend([
            "",
            "### 📋 Prescribed Academic Syllabus Context:",
            "> " + "\n> ".join(clean_syllabus.split("\n")),
        ])

    md.extend([
        "",
        "---",
        "",
        "## 2. 🏛️ Core Foundations & Architectural Mechanics",
        f"In modern computing environments, **{clean_lesson}** represents a fundamental structural framework.",
        f"When designing systems under **{topic}**, architects must balance three primary constraints:",
        "1. **Isolation & Security:** Protecting sensitive workloads through virtualization, tenancy controls, and boundary policies.",
        "2. **Operational Efficiency & Elasticity:** Dynamically scaling computing and storage resources while optimizing capital expenditure (CapEx) versus operational expenditure (OpEx).",
        "3. **Governance & Compliance:** Ensuring data sovereignty, auditable logging, and adherence to regulatory mandates (e.g., GDPR, HIPAA, SOC 2).",
        "",
        "---",
        "",
        "## 3. 🔍 In-Depth Conceptual Breakdown",
    ])

    for i, concept in enumerate(sub_concepts, start=1):
        md.extend([
            f"### 3.{i} {concept}",
            f"**Definition:** {concept} is a dedicated operational model designed to address specific workload profiles, infrastructure topologies, and organizational requirements.",
            "",
            "**Key Characteristics:**",
            f"- **Tenancy Model:** Dictates whether hardware and virtualization instances are dedicated to a single organization or shared among multiple clients.",
            f"- **Management & Ownership:** Can be self-hosted on-premises, leased from specialized co-location providers, or fully managed by hyper-scale cloud vendors.",
            f"- **Scalability Dynamics:** Offers elastic on-demand capacity adjustments based on real-time traffic demand.",
            "",
            "**Advantages & Trade-Offs:**",
            "- **Benefits:** Predictable cost amortization, tailored security policies, and high performance.",
            "- **Limitations:** Requires careful network egress management, governance oversight, and skilled engineering administration.",
            "",
        ])

    md.extend([
        "---",
        "",
        "## 4. 📊 Comprehensive Comparison Matrix",
        "| Model / Dimension | Infrastructure Ownership | Multi-Tenancy | Cost Model | Security & Control | Scalability | Best Suited For |",
        "| :--- | :--- | :--- | :--- | :--- | :--- | :--- |",
        "| **Public Cloud** | Third-Party Provider (AWS, GCP, Azure) | Multi-Tenant (Shared Physical HW) | OpEx (Pay-As-You-Go) | Shared Responsibility Model | Near-Infinite Elasticity | Web Apps, Startups, Variable Traffic |",
        "| **Private Cloud** | Single Organization (On-Prem / Hosted) | Single-Tenant (Dedicated HW) | CapEx + OpEx (Higher Upfront) | Complete Sovereign Control | Limited by Physical HW | Regulated Banking, Healthcare, Defense |",
        "| **Hybrid Cloud** | Combined (Public + Private Integrated) | Mixed (Isolated + Multi-tenant) | Optimized Hybrid Spend | Granular per Workload | Elastic Cloud Bursting | Enterprise Core + Modern Microservices |",
        "| **Community Cloud**| Shared Consortium or Industry Group | Multi-Tenant (Within Consortium)| Shared Across Member Entities | Tailored to Group Standards | Moderate / Scaled for Members | Government GovCloud, Research Consortia |",
        "",
        "---",
        "",
        "## 5. 🏢 Real-World Enterprise Scenarios",
        "### Scenario A: Financial Technology (FinTech) Institution",
        "A retail bank runs its core transaction ledger and database containing personally identifiable information (PII) on a **Private Cloud** to strictly comply with financial privacy regulations. Meanwhile, it hosts public mobile-banking customer analytics and promotional landing pages on a **Public Cloud**, seamlessly bridged through secure encrypted API gateways (**Hybrid Cloud model**).",
        "",
        "### Scenario B: Medical Research Consortium",
        "Multiple universities and hospital networks studying rare genetic conditions establish a **Community Cloud**. Participating institutions share genomic sequencing compute tools while ensuring external commercial entities cannot access patient data.",
        "",
        "---",
        "",
        "## 6. ⚠️ Critical Design Considerations & Pitfalls",
        "- **Vendor Lock-In:** Relying on proprietary cloud APIs makes cross-cloud migration expensive; use containerized abstractions (Docker, Kubernetes).",
        "- **Data Egress Costs:** Transferring large datasets between public and private clouds incurs significant bandwidth fees.",
        "- **Shared Responsibility Model:** In public clouds, the vendor secures the infrastructure *of* the cloud, while the customer is responsible for security *in* the cloud (IAM policies, encryption, and patch management).",
        "",
        "---",
        "",
        "## 7. 🧠 Knowledge Check & Review Questions",
        "**Q1: What is the primary difference between a Public Cloud and a Private Cloud regarding multi-tenancy?**",
        "*Answer:* Public clouds utilize a multi-tenant model where physical hardware is shared across multiple unrelated clients with software-level isolation. Private clouds are strictly single-tenant, allocating physical and virtual resources exclusively to one organization.",
        "",
        "**Q2: What is 'Cloud Bursting' in a Hybrid Cloud architecture?**",
        "*Answer:* Cloud bursting is an architectural strategy where an application runs primarily on private cloud infrastructure, but automatically 'bursts' into public cloud resources to handle temporary spikes in user demand without experiencing downtime.",
        "",
        "**Q3: Why would a healthcare network choose a Community Cloud instead of a standard Public Cloud?**",
        "*Answer:* To ensure all tenant organizations adhere to identical compliance standards (e.g. HIPAA) and share expensive domain-specific tooling while preventing public access.",
        "",
        "---",
        "",
        "## 8. 🛠️ Guided Hands-on Practice Challenge",
        "Review the practice activity on the right-hand side of your workspace. Structure your response with explicit architectural arguments, trade-offs, and design rationale.",
    ])

    return "\n".join(md)


async def generate_rich_lesson_content(
    lesson: str,
    subject: str,
    topic: str,
    learning_objective: str = "",
    syllabus_context: str = "",
) -> str:
    """Generate high-quality, pedagogical, textbook-grade markdown lesson notes for a student."""
    clean_syllabus = _sanitize_syllabus_context(syllabus_context, subject, topic)
    clean_lesson = re.sub(r"^Study:\s*", "", lesson, flags=re.IGNORECASE).strip()

    prompt = f"""You are a distinguished university professor and master educator specializing in {subject}.
Write a comprehensive, engaging, and textbook-grade educational learning module for a university student.

Course Subject: {subject}
Curriculum Topic: {topic}
Lesson Title: {clean_lesson}
Target Learning Objective: {learning_objective or f'Master {clean_lesson} and its core applications in {topic}'}
{f'Official Syllabus Context: {clean_syllabus}' if clean_syllabus else ''}

INSTRUCTIONS:
1. Write real, substantive, textbook-quality teaching material (NOT generic placeholder outlines or repetitive summaries).
2. Explain the fundamental principles, operational mechanics, and architecture in clear, engaging detail.
3. Include concrete industry implementations and provider examples (e.g., AWS, Azure, GCP, VMware, OpenStack, Docker/K8s where applicable).
4. Include a structured Markdown comparison table analyzing key dimensions (ownership, tenancy, cost model, security, scalability).
5. Include 2 real-world enterprise case study scenarios.
6. Include 3 self-assessment conceptual questions with clear explanations to help the student test their understanding.
7. Format everything in clean, professional GitHub-flavored Markdown with appropriate headings, bold terms, and lists.

Structure the response with these exact sections:
# {clean_lesson}
## 1. 📌 Overview & Learning Objectives
## 2. 🏛️ Core Architectural Foundations
## 3. 🔍 Deep Dive into Key Concepts & Mechanics
## 4. 📊 Comprehensive Comparison Matrix
## 5. 🏢 Real-World Enterprise Case Studies
## 6. ⚠️ Critical Design Trade-Offs & Pitfalls
## 7. 🧠 Knowledge Check & Review Questions (with explanations)
## 8. 🛠️ Summary & Practical Takeaways
"""

    for provider_name in ["openrouter", "gemini", "groq"]:
        try:
            provider = get_llm_provider(provider_name)
            result = await provider.generate(prompt=prompt)
            if result and len(result.strip()) > 800:
                logger.info(f"[Lesson Content] Successfully generated via {provider_name} ({len(result)} chars)")
                return result.strip()
        except Exception as e:
            logger.warning(f"[Lesson Content] Provider '{provider_name}' failed: {e}")

    logger.info("[Lesson Content] Falling back to structured pedagogical lesson compiler.")
    return _build_structured_fallback_lesson(lesson, subject, topic, learning_objective, clean_syllabus)


def generate_task_hint_and_solution(
    title: str,
    subject: str,
    topic: str,
    practice: str = "",
) -> tuple[str, str]:
    """Generate a topic-relevant hint and model solution for a learning task."""
    combined = f"{title} {subject} {topic} {practice}".lower()

    # Cloud Computing / Distributed Systems
    if any(k in combined for k in ["cloud", "deployment", "virtualization", "distributed", "aws", "azure", "docker"]):
        hint = (
            "Analyze the business and compliance drivers: compare capital expenditure (CapEx) against "
            "operational expenditure (OpEx), data residency requirements (GDPR/HIPAA), and multi-tenancy isolation."
        )
        solution = (
            "### Recommended Architecture & Decision Matrix\n\n"
            "**1. Deployment Model Selection:**\n"
            "- **Public Cloud (AWS/Azure/GCP):** Best for variable web workloads and stateless microservices (pure OpEx, rapid scale).\n"
            "- **Private Cloud (OpenStack/VMware):** Reserved for sensitive core banking or medical records requiring strict single-tenant isolation.\n"
            "- **Hybrid Cloud:** Connect private core databases with public frontends via AWS DirectConnect or Azure ExpressRoute with end-to-end TLS 1.3 encryption.\n\n"
            "**2. Security & Compliance Controls:**\n"
            "- Implement IAM role-based least privilege access.\n"
            "- Enforce AES-256 encryption at rest and in transit.\n"
            "- Establish automated cloud governance and audit logging (e.g., AWS CloudTrail)."
        )
        return hint, solution

    # Reinforcement Learning / AI
    if any(k in combined for k in ["reinforcement", "bandit", "mdp", "markov", "policy", "q-learning", "sarsa", "reward"]):
        hint = (
            "Formulate the environment using the MDP tuple (S, A, P, R, γ). Clearly define the state space, "
            "action space, and the scalar reward function signal."
        )
        solution = (
            "### Formal Reinforcement Learning Formulation\n\n"
            "```python\n"
            "import numpy as np\n\n"
            "# 1. State Space S: Discrete user or system states\n"
            "# 2. Action Space A: Available decisions {0, 1, ..., k-1}\n"
            "# 3. Epsilon-Greedy Action Selection:\n"
            "def select_action(q_values, epsilon=0.1):\n"
            "    if np.random.rand() < epsilon:\n"
            "        return np.random.choice(len(q_values))  # Explore\n"
            "    return np.argmax(q_values)  # Exploit\n\n"
            "# 4. Incremental Action-Value Update:\n"
            "# Q(A) <- Q(A) + alpha * (R - Q(A))\n"
            "def update_q_value(q_val, reward, alpha=0.1):\n"
            "    return q_val + alpha * (reward - q_val)\n"
            "```"
        )
        return hint, solution

    # Algorithms & Data Structures: Arrays / Linked Lists / Trees
    if "array" in combined:
        hint = "Remember to double the underlying buffer capacity when size equals capacity, and copy elements across."
        solution = (
            "class DynamicArray:\n"
            "    def __init__(self, capacity=2):\n"
            "        self.capacity = capacity\n"
            "        self.size = 0\n"
            "        self.data = [None] * capacity\n\n"
            "    def append(self, val):\n"
            "        if self.size == self.capacity:\n"
            "            self._resize(2 * self.capacity)\n"
            "        self.data[self.size] = val\n"
            "        self.size += 1\n\n"
            "    def _resize(self, new_cap):\n"
            "        new_data = [None] * new_cap\n"
            "        for i in range(self.size):\n"
            "            new_data[i] = self.data[i]\n"
            "        self.data = new_data\n"
            "        self.capacity = new_cap"
        )
        return hint, solution

    # Generic Fallback
    hint = f"Break down the problem into fundamental components of {topic}. Formulate clear input assumptions and verify output invariants."
    solution = (
        f"### Conceptual Solution for {title}\n\n"
        f"1. **Core Invariant:** Ensure the implementation rigorously satisfies all theoretical conditions specified in {topic}.\n"
        "2. **Boundary Testing:** Evaluate empty states, maximum bounds, and unexpected inputs.\n"
        "3. **Verification:** Validate expected vs actual outputs using comprehensive assertions."
    )
    return hint, solution
