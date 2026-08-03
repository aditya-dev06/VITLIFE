---
name: promt-skill
description: Shortcut skill for prompt-engineer-and-optimizer triggered by /p or prompt optimization requests.
---

# Prompt Skill (`/p`)

> Triggered when the user types `/p` or requests prompt engineering, prompt optimization, or instruction refactoring.

---

## Direct Instructions:

1. **Interpret Input**: Treat everything following `/p` as the target prompt, system prompt, or instruction to be audited, rewritten, or optimized.
2. **Apply 5-Step Optimization**:
   - Wrap in XML semantic blocks (`<identity>`, `<context>`, `<user_rules>`, `<output_format>`, `<examples>`).
   - Eliminate fluff, passive voice, and vague directives.
   - Enforce deterministic outputs (exact schemas/formats).
   - Add explicit negative constraints (DO NOTs) & error fallbacks.
   - Inject edge-case few-shot examples or CoT triggers where applicable.
3. **Output**: Return the refined, production-ready prompt clearly formatted in code blocks alongside a brief breakdown of key improvements.
