---
name: p
description: Direct shortcut for prompt-engineer-and-optimizer. Use when user types /p or requests prompt optimization.
---

# /p — Prompt Engineer & Optimizer Shortcut

> Whenever the user starts a message with `/p` or mentions `/p`, activate the **prompt-engineer-and-optimizer** skill (`.agents/skills/prompt-engineer-and-optimizer/SKILL.md`).

---

## Direct Instructions for `/p`:

1. **Interpret Input**: Treat everything following `/p` as the target prompt, system prompt, or instruction to be audited, rewritten, or optimized.
2. **Apply 5-Step Optimization**:
   - Wrap in XML semantic blocks (`<identity>`, `<context>`, `<user_rules>`, `<output_format>`, `<examples>`).
   - Eliminate fluff, passive voice, and vague directives.
   - Enforce deterministic outputs (exact schemas/formats).
   - Add explicit negative constraints (DO NOTs) & error fallbacks.
   - Inject edge-case few-shot examples or CoT triggers where applicable.
3. **Output**: Return the refined, production-ready prompt clearly formatted in code blocks alongside a brief breakdown of key improvements.
