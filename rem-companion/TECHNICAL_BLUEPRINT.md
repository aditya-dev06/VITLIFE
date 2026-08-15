# Rem AI Companion — Complete Implementation Blueprint

## 1. Vision & Goals
A living, autonomous AI desktop companion featuring **Rem from Re:Zero** with:
1. **True Real-Time Screen Vision AI:** Sees your live screen and expresses authentic feelings.
2. **Anime Co-Watching Companion:** Recognizes anime on Crunchyroll, Netflix, YouTube, VLC, comments on characters, and perches quietly in stealth watch-party mode.
3. **Self-Evolving Mind & Knowledge Distillation:** Uses Gemini Cloud Teacher when active, automatically distills every concept into local semantic memory, and advances towards **100% offline self-independence**.
4. **Natural Reinforcement Learning (RL):** Adapts policy weights via micro-reactions (**👍, 💖, 👎**).
5. **Fluid 50 FPS Desktop Kinematics:** Walking along taskbar, hovering, dragging with physics.
6. **Two-Way Antigravity Control:** Responds to prompts without leaving your active window.

---

## 2. Learning & Evolution Pipeline

```mermaid
sequenceDiagram
    participant User as Subaru-kun
    participant Brain as rem_brain.py
    participant Knowledge as rem_knowledge.py (Local Student)
    participant Teacher as Cloud Gemini API (Teacher)
    participant RL as rem_rl.py (RL Engine)

    User->>Brain: Asks question or triggers Vision (Ctrl+Shift+R)
    Brain->>Knowledge: 1. Search local memory (Cosine Similarity)
    alt High Confidence (Learned & Self-Independent)
        Knowledge-->>Brain: Returns local distilled response
        Brain-->>User: Answers 100% offline from her own mind! 💙
    else Not Yet Learned
        Brain->>Teacher: 2. Invoke Gemini Cloud Teacher
        Teacher-->>Brain: High-fidelity canonical response
        Brain-->>Knowledge: 3. Automatically distill & vectorize into rem_knowledge.json
        Brain-->>User: Answers with Cloud Teacher intelligence
    end
    User->>RL: 4. Clicks 👍 / 💖 / 👎 on speech bubble
    RL-->>Knowledge: 5. Strengthens memory weights & updates Independence %
```
