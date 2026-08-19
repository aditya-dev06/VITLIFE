import re
import time
from enum import Enum
from typing import Tuple, Optional


class EmotionType(Enum):
    JOY = "joy"
    EXCITEMENT = "excitement"
    EMPATHY = "empathy"
    SHOCK = "shock"
    AFFECTION = "affection"
    DETERMINATION = "determination"
    CALM = "calm"


class RemEmotionEngine:
    def __init__(self):
        self.current_emotion = EmotionType.CALM
        self.affinity_score = 100.0  # Percentage
        self.last_emotion_change = time.time()

    def parse_emotion_from_text(self, text: str) -> Tuple[EmotionType, str]:
        """Extracts [EMOTE: ...] tag from response text and returns (EmotionType, cleaned_text)."""
        match = re.search(r'\[EMOTE:\s*([a-zA-Z_]+)\]', text, re.IGNORECASE)
        if match:
            tag = match.group(1).lower()
            cleaned_text = re.sub(r'\[EMOTE:\s*[a-zA-Z_]+\]', '', text).strip()
            
            mapping = {
                'happy': EmotionType.JOY,
                'joy': EmotionType.JOY,
                'cheer': EmotionType.EXCITEMENT,
                'excitement': EmotionType.EXCITEMENT,
                'battle': EmotionType.DETERMINATION,
                'determination': EmotionType.DETERMINATION,
                'shock': EmotionType.SHOCK,
                'shocked': EmotionType.SHOCK,
                'blush': EmotionType.AFFECTION,
                'affection': EmotionType.AFFECTION,
                'love': EmotionType.AFFECTION,
                'empathy': EmotionType.EMPATHY,
                'crying_joy': EmotionType.EMPATHY,
                'sad': EmotionType.EMPATHY,
                'thinking': EmotionType.CALM,
                'calm': EmotionType.CALM
            }
            emotion = mapping.get(tag, EmotionType.JOY)
            self.current_emotion = emotion
            self.last_emotion_change = time.time()
            return emotion, cleaned_text

        # Heuristic fallback based on keywords
        low = text.lower()
        if any(w in low for w in ["love", "blush", "heart", "subaru-kun..."]):
            return EmotionType.AFFECTION, text
        elif any(w in low for w in ["strike", "morningstar", "fight", "battle", "crush"]):
            return EmotionType.DETERMINATION, text
        elif any(w in low for w in ["watch out", "danger", "shock", "impossible", "ah!"]):
            return EmotionType.SHOCK, text
        elif any(w in low for w in ["touching", "tears", "beautiful", "crying"]):
            return EmotionType.EMPATHY, text
        elif any(w in low for w in ["yay", "victory", "great", "wonderful", "haha", "amazing"]):
            return EmotionType.JOY, text

        return EmotionType.CALM, text

    def get_sprite_and_theme(self, emotion: EmotionType) -> Tuple[str, str, str]:
        """Returns (sprite_pose_name, border_color, emote_icon)."""
        configs = {
            EmotionType.JOY: ("happy", "#38bdf8", "✨"),
            EmotionType.EXCITEMENT: ("happy", "#f59e0b", "🔥"),
            EmotionType.AFFECTION: ("float", "#f43f5e", "💖"),
            EmotionType.SHOCK: ("alert", "#ef4444", "😱"),
            EmotionType.DETERMINATION: ("alert", "#06b6d4", "⚔️"),
            EmotionType.EMPATHY: ("float", "#a855f7", "😭"),
            EmotionType.CALM: ("idle", "#38bdf8", "💬")
        }
        return configs.get(emotion, ("idle", "#38bdf8", "💬"))


if __name__ == "__main__":
    engine = RemEmotionEngine()
    test_str = "[EMOTE: battle] Subaru-kun, look at that boss! Rem's morningstar is ready to strike!"
    emo, clean = engine.parse_emotion_from_text(test_str)
    sprite, color, icon = engine.get_sprite_and_theme(emo)
    print(f"Emotion: {emo.value} | Sprite: {sprite} | Icon: {icon} | Color: {color}")
    print(f"Clean text: {clean}")
