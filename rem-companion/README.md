# 💙 Rem: Living AI Desktop Companion (Re:Zero)

An autonomous living AI desktop companion featuring **Rem from Re:Zero** with **True Live Screen Vision, Anime Co-Watching, Cognitive Knowledge Distillation, and Natural Reinforcement Learning (RL)**.

---

## ✨ Core Features

1. **👁️ Real-Time Live Screen Vision:**
   - Rem literally sees whatever is on your live screen (anime, games, code, photos) and expresses genuine in-character emotional reactions.
   - **Hotkey:** Press `Ctrl + Shift + R` anywhere to have Rem look at your screen and speak her thoughts!

2. **🎬 Anime Co-Watching Companion:**
   - Detects anime streaming on Crunchyroll, Netflix, YouTube, VLC, MPV.
   - Shares canonical lore commentary on fight scenes, magic systems, and characters.
   - **Stealth Watch-Party Mode:** When videos enter fullscreen, Rem perches in the corner with small floating emote balloons that fade away without blocking subtitles.

3. **🧠 Dual-Core Cognitive Brain & Offline Independence:**
   - **Cloud Teacher:** Powered by Gemini 2.5 Multimodal Vision & Language API.
   - **Knowledge Distillation:** Automatically vectorizes and indexes every conversation and anime fact into local semantic memory (`rem_knowledge.json`).
   - **Independence Metric (0% ➔ 100%):** Over time, Rem answers from her learned local memory 100% offline!

4. **📈 Natural Reinforcement Learning (RL):**
   - Micro-reaction buttons (**👍, 💖, 👎**) in her speech bubbles let you train her preferences.
   - Adapts policy weights (`rem_policy.json`) based on what comments Subaru-kun loves most.

5. **⚡ Seamless Two-Way Antigravity Bridge:**
   - 1-click **[Approve]**, **[Proceed]**, or custom reply box with instant window focus restoration.

---

## 🚀 How to Run

### Option 1: One-Click Batch Launcher
Double-click:
```
start_rem.bat
```

### Option 2: Silent Launch (No Console Window)
Double-click:
```
start_rem.pyw
```

### Option 3: Terminal / Command Line
```powershell
pip install -r requirements.txt
python rem_companion.py
```

---

## 🎮 Controls & Shortcuts

| Action | Result |
|:-------|:-------|
| `Ctrl + Shift + R` | **Instant Screen Vision** — Rem looks at your screen and shares her thoughts |
| **Double-Click Rem** | Opens free-form AI chat with Rem |
| **Right-Click Rem** | Opens menu (Vision, Chat, Stats, API Key, Antigravity Reply, Hide, Exit) |
| **👍 💖 👎 on Bubble** | Rewards or guides Rem with Reinforcement Learning |
| **Click & Drag** | Move Rem with physics across your monitors |

---

## 📁 Project Structure

```
rem-companion/
├── sprites/                  # Transparent animation frames & tray icon
├── chibi_rem_-_confession.glb# 3D Rem model asset
├── anime_companion.py        # Anime detection & character commentary
├── rem_vision.py             # Live screen vision & Multimodal Vision API
├── rem_emotions.py           # Emotional state machine & emote parser
├── rem_knowledge.py          # Local semantic vector memory & distillation
├── rem_rl.py                 # Natural reinforcement learning engine
├── rem_brain.py              # Dual-core brain orchestrator
├── screen_observer.py        # Active window & user activity tracker
├── rem_animator.py           # 50 FPS kinematics & behavior engine
├── antigravity_watcher.py    # Antigravity live transcript daemon
├── rem_companion.py          # Master Tkinter desktop GUI
├── rem_memory.json           # Long-term episodic memory & anime history
├── rem_knowledge.json        # Distilled semantic knowledge graph
├── rem_policy.json           # RL policy weights & Q-table
├── rem_config.json           # Gemini API key configuration
├── start_rem.bat             # Batch launcher
└── start_rem.pyw             # Silent launcher
```
