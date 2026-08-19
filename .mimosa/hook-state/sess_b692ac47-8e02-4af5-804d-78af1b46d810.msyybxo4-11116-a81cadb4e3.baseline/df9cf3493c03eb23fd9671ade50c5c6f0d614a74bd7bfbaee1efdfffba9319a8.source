import json
import os
import time
from typing import Dict, Any


class RemRLEngine:
    def __init__(self):
        self.base_dir = os.path.dirname(os.path.abspath(__file__))
        self.policy_file = os.path.join(self.base_dir, "rem_policy.json")
        self.policy = self._load_policy()

    def _load_policy(self) -> dict:
        if os.path.exists(self.policy_file):
            try:
                with open(self.policy_file, 'r', encoding='utf-8') as f:
                    return json.load(f)
            except Exception:
                pass
        return {
            "total_rewards": 0.0,
            "positive_feedback_count": 0,
            "negative_feedback_count": 0,
            "proactive_frequency_seconds": 180,
            "playfulness_weight": 0.5,
            "devotion_weight": 0.9,
            "anime_reaction_rate": 0.7,
            "learning_rate": 0.1
        }

    def _save_policy(self):
        try:
            with open(self.policy_file, 'w', encoding='utf-8') as f:
                json.dump(self.policy, f, indent=2, ensure_ascii=False)
        except Exception as e:
            print(f"[RLEngine] Error saving policy: {e}")

    def apply_feedback(self, feedback_type: str, context_tag: str = "general"):
        """Applies explicit or implicit reward signals to update Rem's policy."""
        reward = 0.0
        if feedback_type == "love":
            reward = 2.0
            self.policy["positive_feedback_count"] += 1
            self.policy["devotion_weight"] = min(1.0, self.policy["devotion_weight"] + 0.02)
        elif feedback_type == "like":
            reward = 1.0
            self.policy["positive_feedback_count"] += 1
            self.policy["playfulness_weight"] = min(1.0, self.policy["playfulness_weight"] + 0.01)
        elif feedback_type == "dislike":
            reward = -1.5
            self.policy["negative_feedback_count"] += 1
            # If user disliked, slightly reduce proactive frequency so Rem doesn't interrupt too much
            self.policy["proactive_frequency_seconds"] = min(360, self.policy["proactive_frequency_seconds"] + 20)
        elif feedback_type == "quick_reply":
            reward = 0.5
        elif feedback_type == "plan_approved":
            reward = 1.0

        self.policy["total_rewards"] += reward
        self._save_policy()
        return reward

    def evaluate_text_feedback(self, user_text: str) -> float:
        """Detects implicit positive/negative feedback in user text."""
        low = user_text.lower()
        if any(w in low for w in ["good job", "thank you", "thanks", "perfect", "awesome", "great", "love you", "cute", "haha"]):
            return self.apply_feedback("like")
        elif any(w in low for w in ["shut up", "be quiet", "stop", "annoying", "wrong", "bad"]):
            return self.apply_feedback("dislike")
        return 0.0

    def get_stats(self) -> dict:
        return {
            "total_rewards": round(self.policy.get("total_rewards", 0.0), 1),
            "positive_reactions": self.policy.get("positive_feedback_count", 0),
            "negative_reactions": self.policy.get("negative_feedback_count", 0),
            "proactive_frequency": self.policy.get("proactive_frequency_seconds", 180)
        }


if __name__ == "__main__":
    rl = RemRLEngine()
    print("Initial RL Stats:", rl.get_stats())
    rl.apply_feedback("love")
    print("Updated RL Stats:", rl.get_stats())
