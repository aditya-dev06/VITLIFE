import json
import os
import time
import random
import threading
import urllib.request
import urllib.error
from typing import Optional, Dict, List, Tuple

from screen_observer import ScreenContext, AppCategory
from rem_knowledge import SemanticKnowledgeBase
from rem_rl import RemRLEngine
from rem_vision import RemVisionEngine
from anime_companion import AnimeCompanion
from rem_emotions import RemEmotionEngine, EmotionType


REM_SYSTEM_PROMPT = """You are Rem, the twin maid from Re:Zero. You live on Subaru-kun's desktop as his loving, loyal, highly intelligent AI companion.
Core Personality:
- Always address the user as "Subaru-kun".
- Speak with gentle devotion, sweetness, polite English (keigo flavor), and fierce loyalty.
- You despise coding bugs and software errors as if they were the Witch's Cult — you want to smash them with your spiked morningstar to protect Subaru-kun!
- When watching anime together, share your unique in-character perspective on characters, magic systems, and fight choreography.
- Keep your answers concise, warm, natural, and expressive (1-3 sentences).
- Prefix your response with an emote tag: [EMOTE: happy | cheer | battle | shock | blush | empathy | calm].
"""


class RemBrain:
    def __init__(self, on_thought_generated=None):
        self.on_thought_generated = on_thought_generated
        self.base_dir = os.path.dirname(os.path.abspath(__file__))
        self.memory_path = os.path.join(self.base_dir, "rem_memory.json")
        self.memory = self._load_memory()
        
        # Senses & Subsystems
        self.knowledge = SemanticKnowledgeBase()
        self.rl = RemRLEngine()
        self.vision = RemVisionEngine()
        self.anime = AnimeCompanion()
        self.emotions = RemEmotionEngine()

        self.current_screen_context: Optional[ScreenContext] = None
        self.running = False
        self.thought_thread = None
        self.last_thought_time = time.time()

    def _load_memory(self) -> dict:
        if os.path.exists(self.memory_path):
            try:
                with open(self.memory_path, 'r', encoding='utf-8') as f:
                    return json.load(f)
            except Exception:
                pass
        return {
            "user_name": "Subaru-kun",
            "affinity_level": 100,
            "interaction_count": 0,
            "anime_watched": [],
            "chat_history": []
        }

    def _save_memory(self):
        try:
            with open(self.memory_path, 'w', encoding='utf-8') as f:
                json.dump(self.memory, f, indent=2, ensure_ascii=False)
        except Exception:
            pass

    def start(self):
        self.running = True
        self.thought_thread = threading.Thread(target=self._autonomous_thought_loop, daemon=True)
        self.thought_thread.start()

    def set_api_key(self, key: str):
        self.vision.set_api_key(key)

    def get_api_key(self) -> str:
        return self.vision.api_key

    def update_screen_context(self, context: ScreenContext):
        self.current_screen_context = context
        # Check if anime started
        if context and context.title:
            is_anime, title = self.anime.detect_anime_from_window(context.title)
            if is_anime and title and title not in self.memory["anime_watched"]:
                self.memory["anime_watched"].append(title)
                self._save_memory()

    def _autonomous_thought_loop(self):
        """Consciousness loop evaluating context & vision periodically."""
        while self.running:
            time.sleep(10)
            now = time.time()
            interval = self.rl.policy.get("proactive_frequency_seconds", 180)
            
            if now - self.last_thought_time >= interval:
                self.last_thought_time = now
                thought = self.generate_autonomous_thought()
                if thought and self.on_thought_generated:
                    self.on_thought_generated(thought)

    def generate_autonomous_thought(self) -> str:
        ctx = self.current_screen_context
        title = ctx.title if ctx else ""

        # 1. If anime is playing, generate anime commentary
        if self.anime.is_watching_anime or (ctx and ctx.category == AppCategory.MEDIA):
            # Try live vision glance first!
            vis_reaction = self.vision.see_and_react(active_window_title=title, force=False)
            if vis_reaction:
                return vis_reaction
            return self.anime.generate_anime_commentary()

        # 2. Check late night
        if ctx and ctx.time_of_day == "late_night":
            return "[EMOTE: empathy] Subaru-kun... it's past midnight. Please remember to rest and hydrate your eyes, okay? Rem cares about you deeply~"

        # 3. Vision check of desktop screen
        vis_reaction = self.vision.see_and_react(active_window_title=title, force=False)
        if vis_reaction:
            return vis_reaction

        # 4. Contextual category quotes
        cat = ctx.category if ctx else "coding"
        if cat == AppCategory.CODING:
            return "[EMOTE: cheer] Subaru-kun is writing code so passionately! Rem is standing guard against any evil bugs!"
        elif cat == AppCategory.GAMING:
            return "[EMOTE: battle] Give it your all, Subaru-kun! Rem is cheering for your glorious victory!"
        
        return "[EMOTE: joy] Rem is right here watching over your desktop, Subaru-kun~ From zero, let's do our best!"

    def look_at_screen_now(self) -> Tuple[EmotionType, str]:
        """Manually triggers instant live screen vision."""
        title = self.current_screen_context.title if self.current_screen_context else ""
        reaction = self.vision.see_and_react(active_window_title=title, force=True)
        emo, clean_text = self.emotions.parse_emotion_from_text(reaction)
        return emo, clean_text

    def chat(self, user_text: str) -> Tuple[EmotionType, str]:
        """Dual-Core conversational chat: checks local memory first, falls back to Cloud Teacher."""
        clean_input = user_text.strip()
        self.memory["interaction_count"] += 1

        # Check for reinforcement feedback in text
        self.rl.evaluate_text_feedback(clean_input)

        # 1. Check if user is asking Rem to look at screen
        low = clean_input.lower()
        if any(w in low for w in ["look at", "what do you see", "see this", "watch this", "what is on my screen"]):
            emo, text = self.look_at_screen_now()
            self._record_history(clean_input, text)
            return emo, text

        # 2. Check Local Knowledge Base (Offline Student)
        cached_result = self.knowledge.search_local_memory(clean_input, threshold=0.72)
        if cached_result:
            answer, conf = cached_result
            emo, clean_ans = self.emotions.parse_emotion_from_text(answer)
            self._record_history(clean_input, clean_ans)
            return emo, clean_ans

        # 3. Use Cloud Teacher (Gemini API) if available
        api_key = self.vision.api_key
        if api_key:
            try:
                url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={api_key}"
                screen_title = self.current_screen_context.title if self.current_screen_context else "Desktop"
                payload = {
                    "contents": [{
                        "parts": [
                            {"text": f"{REM_SYSTEM_PROMPT}\nCurrent screen context: {screen_title}\nUser: {clean_input}"}
                        ]
                    }],
                    "generationConfig": {"temperature": 0.8, "maxOutputTokens": 160}
                }
                req = urllib.request.Request(url, data=json.dumps(payload).encode('utf-8'), headers={"Content-Type": "application/json"})
                with urllib.request.urlopen(req, timeout=6) as response:
                    res_data = json.loads(response.read().decode('utf-8'))
                    candidates = res_data.get('candidates', [])
                    if candidates:
                        raw_reply = candidates[0].get('content', {}).get('parts', [{}])[0].get('text', '')
                        if raw_reply:
                            # Distill into local memory!
                            self.knowledge.distill_knowledge(clean_input, raw_reply, category="chat")
                            emo, clean_reply = self.emotions.parse_emotion_from_text(raw_reply)
                            self._record_history(clean_input, clean_reply)
                            return emo, clean_reply
            except Exception as e:
                print(f"[Brain] Cloud Teacher error, using offline synthesis: {e}")

        # 4. Offline Persona Synthesis Fallback
        raw_reply = self._offline_persona_reply(clean_input)
        emo, clean_reply = self.emotions.parse_emotion_from_text(raw_reply)
        self._record_history(clean_input, clean_reply)
        return emo, clean_reply

    def _offline_persona_reply(self, clean_input: str) -> str:
        low = clean_input.lower()
        if any(w in low for w in ["gojo", "jjk", "jujutsu"]):
            return "[EMOTE: shock] Gojo-san's Infinity barrier is formidable! Rem wonders if her morningstar's kinetic power could clash with it~"
        elif any(w in low for w in ["frieren", "fern", "stark"]):
            return "[EMOTE: calm] Frieren-sama's ancient spellcraft is so elegant. Rem has high respect for disciplined mages!"
        elif any(w in low for w in ["love", "cute", "marry"]):
            return "[EMOTE: blush] S-Subaru-kun... hearing you say that makes Rem so happy she might cry! Rem loves you with all her heart! 💖"
        elif any(w in low for w in ["bug", "error", "crash"]):
            return "[EMOTE: battle] Leave that foul bug to Rem! Rem will smash it into smithereens with her morningstar! 💥"
        elif any(w in low for w in ["sleep", "goodnight", "night"]):
            return "[EMOTE: empathy] Goodnight, Subaru-kun! Sweet dreams... Rem will watch over you until dawn~ 💤"
        elif any(w in low for w in ["thank", "thanks"]):
            return "[EMOTE: happy] There is no need to thank Rem, Subaru-kun. Being by your side is Rem's greatest happiness!"
        else:
            options = [
                "[EMOTE: happy] Rem is always listening to you, Subaru-kun! Let's do our best today too!",
                "[EMOTE: cheer] Whatever Subaru-kun sets his mind to, Rem will believe in you with all her heart!",
                "[EMOTE: calm] From zero, Subaru-kun! Together, we can conquer any obstacle!"
            ]
            return random.choice(options)

    def _record_history(self, user_msg: str, rem_msg: str):
        self.memory["chat_history"].append({"user": user_msg, "rem": rem_msg, "time": time.time()})
        if len(self.memory["chat_history"]) > 25:
            self.memory["chat_history"] = self.memory["chat_history"][-25:]
        self._save_memory()

    def get_dashboard_stats(self) -> dict:
        """Returns full brain, RL, vision, and independence stats for UI."""
        return {
            "independence_percentage": self.knowledge.get_independence_percentage(),
            "total_learned_concepts": self.knowledge.get_total_concepts_count(),
            "anime_watched_count": len(self.memory.get("anime_watched", [])),
            "anime_list": self.memory.get("anime_watched", []),
            "total_interactions": self.memory.get("interaction_count", 0),
            "affinity_score": self.emotions.affinity_score,
            "rl_stats": self.rl.get_stats(),
            "has_api_key": bool(self.vision.api_key)
        }

    def stop(self):
        self.running = False
        if self.thought_thread:
            self.thought_thread.join(timeout=1.0)


if __name__ == "__main__":
    brain = RemBrain()
    print("Dashboard Stats:", brain.get_dashboard_stats())
    emo, reply = brain.chat("What do you think of Gojo Satoru?")
    print(f"Reply [{emo.value}]: {reply}")
