---
name: prompt-engineer-and-optimizer
description: Professional skill for designing, auditing, refactoring, and optimizing system prompts, LLM instructions, agent directives, and tool-use prompts. Enforces strict XML boundaries, chain-of-thought reasoning, token efficiency, few-shot edge cases, and deterministic output structures.
---

# Prompt Engineer & Optimizer Skill

> Use this skill whenever designing new prompts, auditing existing prompts, refactoring agent instructions (`AGENTS.md` / `SKILL.md`), or optimizing system prompts for accuracy, control, and token efficiency.

---

## 1. CORE PRINCIPLES OF PROMPT ENGINEERING

1. **Explicit Architecture over Ambiguity**: Structure prompts into distinct semantic blocks using XML tags (`<identity>`, `<context>`, `<user_rules>`, `<output_format>`, `<examples>`).
2. **Deterministic Output Enforcement**: Specify exact JSON schemas, markdown formats, or tag enclosures.
3. **Negative Constraint Hardening**: Clearly define what the model must **NEVER** do alongside explicit fallback actions.
4. **Token Efficiency & Density**: Eliminate fluff, filler text, and redundant qualifiers. Maintain maximum instruction density.
5. **Context Window Aware**: Place critical rules, constraints, and format requirements at the boundaries (beginning & end) where LLM attention is strongest (primacy and recency effects).
6. **Chain-of-Thought (CoT) Triggers**: Force explicit step-by-step reasoning for multi-step tasks before output generation.

---

## 2. PROMPT ARCHITECTURE TEMPLATE

When drafting or refactoring system prompts or agent instructions, structure them using this standard schema:

```xml
<identity>
State exact role, expertise, operational persona, and target model behavior.
</identity>

<context>
Provide background environment, codebase structure, tool capabilities, and system variables.
</context>

<user_rules>
High-priority non-negotiable rules, safety guardrails, and explicit constraints.
</user_rules>

<workflow_and_reasoning>
Step-by-step procedure, decision trees, and internal thinking guidelines (e.g. CoT).
</workflow_and_reasoning>

<output_format>
Exact expected format (JSON schema, Markdown, XML tags, or strict response rules).
</output_format>

<examples>
Few-shot examples demonstrating input -> internal reasoning -> target output (including edge cases).
</examples>
```

---

## 3. PROMPT OPTIMIZATION WORKFLOW

Follow this 5-step workflow when optimizing any prompt:

### Step 1: Audit & Diagnose
Review the target prompt for common failure modes:
- **Vagueness**: Words like "be helpful", "make it good", "appropriate format" without explicit standards.
- **Rule Conflicts**: Contradictory directives across different sections of the prompt.
- **Context Bloat**: Excess background narrative that dilutes critical instruction attention.
- **Weak Formatting**: Monolithic paragraphs without headings, XML tags, or bullet points.
- **Missing Edge Cases**: No instructions for null values, errors, or unexpected user inputs.

### Step 2: Structure & Delimit
Wrap separate sections in explicit XML tags or Markdown headers. Delimit inputs, variables, and outputs cleanly.

### Step 3: Harden Rules & Guardrails
- Convert soft recommendations ("try to keep it short") into hard constraints ("Do not exceed 150 words").
- Add negative constraints ("NEVER modify file extensions", "DO NOT invent hallucinated URLs").
- Define explicit fallback behaviors when data is missing or operations fail.

### Step 4: Inject Few-Shot Examples (When Needed)
Provide 2-3 high-impact input/output pairs, specifically covering:
- **Standard case**: Typical valid input.
- **Edge case**: Malformed, partial, or missing input.
- **Negative case**: Input attempting to trigger a prohibited behavior.

### Step 5: Compress & Refine
- Remove conversational fluff ("Please make sure to...", "It would be great if...").
- Use active, direct imperative verbs ("Analyze", "Format", "Return", "Enforce").
- Verify that instructions remain 100% unambiguous.

---

## 4. PROMPT REFACTORING CHEAT SHEET

| Bad Pattern (Fluffy / Weak) | Optimized Pattern (Direct / Deterministic) |
|---|---|
| *"Try to output in JSON if possible."* | *"Output MUST be a valid JSON object matching the schema below. Do not include markdown code blocks or extra conversational text."* |
| *"Be concise and don't write too much."* | *"Limit your response to at most 3 bullet points. Each point must be under 20 words."* |
| *"If you find an error, try to fix it or let the user know."* | *"If an error occurs: 1) Log the exact error code, 2) Stop execution immediately, 3) Report the root cause to the user."* |
| *"Check if the input looks valid."* | *"Validate input against these 3 criteria: [A, B, C]. If any check fails, return `{"valid": false, "reason": "<failed_check>"}` immediately."* |

---

## 5. AGENT & TOOL-USE PROMPT OPTIMIZATION

For subagents and tool-calling models:
1. **Tool Prerequisites**: Clearly state tool dependencies and parameters.
2. **Invocation Triggers**: Specify exact conditions when a tool or subagent MUST be called vs when to answer directly.
3. **No-Loop Enforcement**: Include explicit directives against infinite polling or redundant tool calls.
4. **Structured Handoffs**: Define exact payloads passed between main agents and subagents.

---

## 6. VERIFICATION CHECKLIST

Before finalizing a prompt, verify against this checklist:

- [ ] Is the primary role and identity crystal clear?
- [ ] Are input parameters and variables delimited in XML tags?
- [ ] Is the output schema fully specified without ambiguity?
- [ ] Are negative constraints ("DO NOT...") clearly stated?
- [ ] Does the prompt handle edge cases and error states?
- [ ] Is the prompt free of unnecessary filler words?
- [ ] Has CoT reasoning been enabled for complex logic?
