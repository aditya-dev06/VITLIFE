import json
import os
import math
import collections
from typing import Dict, List, Optional, Tuple


class SemanticKnowledgeBase:
    def __init__(self):
        self.base_dir = os.path.dirname(os.path.abspath(__file__))
        self.file_path = os.path.join(self.base_dir, "rem_knowledge.json")
        self.entries: List[dict] = []
        self.load()

    def load(self):
        if os.path.exists(self.file_path):
            try:
                with open(self.file_path, 'r', encoding='utf-8') as f:
                    self.entries = json.load(f)
            except Exception:
                self.entries = []
        else:
            self._seed_default_knowledge()

    def save(self):
        try:
            with open(self.file_path, 'w', encoding='utf-8') as f:
                json.dump(self.entries, f, indent=2, ensure_ascii=False)
        except Exception as e:
            print(f"[KnowledgeBase] Error saving: {e}")

    def _seed_default_knowledge(self):
        """Initial foundational seeds for Rem's offline mind."""
        self.entries = [
            {
                "query": "who are you",
                "answer": "Rem is the head maid of Roswaal's mansion, and Subaru-kun's most loyal companion in the whole world! 💙",
                "category": "persona",
                "affinity_reward": 5.0
            },
            {
                "query": "do you love me",
                "answer": "S-Subaru-kun... Rem loves you more than words can express! Hearing you ask that makes Rem's heart race so happily! 💖",
                "category": "persona",
                "affinity_reward": 10.0
            },
            {
                "query": "what is your morningstar",
                "answer": "Rem's morningstar is an iron flail with a spiked ball and chain. Rem uses it to smash any vile pests that threaten Subaru-kun! 💥",
                "category": "lore",
                "affinity_reward": 5.0
            },
            {
                "query": "what is from zero",
                "answer": "From zero... it means no matter how broken or lost we feel, we can always stand up and start again from the beginning together!",
                "category": "lore",
                "affinity_reward": 8.0
            }
        ]
        self.save()

    def _tokenize(self, text: str) -> List[str]:
        cleaned = "".join(c.lower() if c.isalnum() else " " for c in text)
        words = cleaned.split()
        # Trigrams for fuzzy matching
        trigrams = [text[i:i+3].lower() for i in range(len(text)-2)]
        return words + trigrams

    def _cosine_similarity(self, tokens1: List[str], tokens2: List[str]) -> float:
        if not tokens1 or not tokens2:
            return 0.0
        c1 = collections.Counter(tokens1)
        c2 = collections.Counter(tokens2)
        dot = sum(c1[t] * c2[t] for t in c1 if t in c2)
        norm1 = math.sqrt(sum(v * v for v in c1.values()))
        norm2 = math.sqrt(sum(v * v for v in c2.values()))
        if norm1 == 0 or norm2 == 0:
            return 0.0
        return dot / (norm1 * norm2)

    def search_local_memory(self, query: str, threshold: float = 0.65) -> Optional[Tuple[str, float]]:
        """Searches local distilled knowledge for a high-confidence match."""
        q_tokens = self._tokenize(query)
        best_match = None
        best_score = 0.0

        for entry in self.entries:
            stored_tokens = self._tokenize(entry.get("query", ""))
            sim = self._cosine_similarity(q_tokens, stored_tokens)
            if sim > best_score:
                best_score = sim
                best_match = entry

        if best_score >= threshold and best_match:
            return best_match.get("answer"), best_score
        return None

    def distill_knowledge(self, query: str, answer: str, category: str = "general", reward: float = 1.0):
        """Distills a new Q&A pair from Cloud Teacher into persistent local semantic memory."""
        # Avoid duplicate near-exact entries
        for entry in self.entries:
            if self._cosine_similarity(self._tokenize(query), self._tokenize(entry["query"])) > 0.88:
                entry["answer"] = answer
                entry["affinity_reward"] = entry.get("affinity_reward", 0) + reward
                self.save()
                return

        self.entries.append({
            "query": query.strip(),
            "answer": answer.strip(),
            "category": category,
            "affinity_reward": reward
        })
        self.save()

    def get_independence_percentage(self) -> float:
        """Calculates Rem's independence score (0% to 100%) based on knowledge density."""
        count = len(self.entries)
        # 100 entries = ~50% independence, 250+ entries = 95%+ independence
        progress = min(100.0, (1.0 - math.exp(-count / 65.0)) * 100.0)
        return round(progress, 1)

    def get_total_concepts_count(self) -> int:
        return len(self.entries)


if __name__ == "__main__":
    kb = SemanticKnowledgeBase()
    print("Independence Score:", kb.get_independence_percentage(), "%")
    res = kb.search_local_memory("who are you rem")
    print("Search 'who are you rem':", res)
