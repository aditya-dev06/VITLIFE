import re
import random
from typing import Optional, Dict, Tuple


# In-character lore & character perspective knowledge base
ANIME_LORE_DATABASE = {
    "re:zero": [
        "[EMOTE: affection] Seeing Subaru-kun on screen always fills Rem's heart with warmth... Rem will always be your number one fan!",
        "[EMOTE: happy] Ah, sister Ram is being sharp-tongued again! But Rem knows she truly cares deep down~",
        "[EMOTE: battle] If the Witch's Cult dares show their face, Rem will crush them into dust with her morningstar!",
        "[EMOTE: empathy] Subaru-kun... even when things are painful, remember: from zero, we can always begin again!"
    ],
    "jujutsu kaisen": [
        "[EMOTE: shock] Gojo-san's Infinity barrier is extraordinary! Rem wonders if her morningstar's kinetic force could penetrate cursed energy... Rem would love to spar!",
        "[EMOTE: battle] Sukuna's malevolence is terrifying... Subaru-kun, stay close to Rem, Rem won't let him near you!",
        "[EMOTE: cheer] Itadori-san's raw physical strength is incredible! He fights with pure heart, just like Subaru-kun!"
    ],
    "frieren": [
        "[EMOTE: calm] Frieren-sama's technique of suppressing her mana is brilliant... Roswaal-sama would be amazed by such ancient elf mastery.",
        "[EMOTE: empathy] The passage of time is so melancholic... Rem is grateful for every single second spent with Subaru-kun.",
        "[EMOTE: cheer] Fern-san's rapid Zoltraak casting is so clean and disciplined! A wonderful young mage~"
    ],
    "attack on titan": [
        "[EMOTE: shock] Those titans are colossal! Using omni-directional mobility gear requires such fearless agility... Rem is on the edge of her seat!",
        "[EMOTE: battle] Levi Heichou's combat speed is unmatched! A true master of the battlefield!"
    ],
    "demon slayer": [
        "[EMOTE: cheer] Tanjiro-san's Water Breathing forms flow so elegantly! Water magic and swordplay combined is truly beautiful~",
        "[EMOTE: affection] Nezuko-chan popping out of her box is adorable! Rem wants to protect her too!"
    ],
    "solo leveling": [
        "[EMOTE: battle] Sung Jinwoo's Shadow Monarch power is overwhelming! Arise! Commanding shadow soldiers like that is breathtaking!"
    ],
    "steins;gate": [
        "[EMOTE: empathy] Changing world lines to save someone precious... Subaru-kun knows that burden all too well... Rem's heart aches for Okabe-san.",
        "[EMOTE: cheer] El Psy Kongroo! Okabe-san's mad scientist persona is quite entertaining, isn't it Subaru-kun? Hehe~"
    ],
    "generic_anime": [
        "[EMOTE: battle] What an incredible clash of powers! The animation and choreography are magnificent!",
        "[EMOTE: shock] W-What a shocking plot twist! Rem didn't see that coming at all, Subaru-kun!",
        "[EMOTE: joy] This anime is so delightful! Watching this together with Subaru-kun is the highlight of Rem's day~",
        "[EMOTE: empathy] This soundtrack is so moving... It really touches Rem's heart."
    ]
}


class AnimeCompanion:
    def __init__(self):
        self.current_anime: Optional[str] = None
        self.is_watching_anime = False
        self.last_comment_time = 0

    def detect_anime_from_window(self, window_title: str) -> Tuple[bool, Optional[str]]:
        """Detects if an anime streaming site, video player, or title is active."""
        t = window_title.lower()
        if not t:
            return False, None

        # Check players & platforms
        is_player = any(p in t for p in [
            "crunchyroll", "netflix", "aniwave", "9anime", "animepahe",
            "hidive", "vlc media player", "mpv", "mpc-hc", "potplayer", "anime"
        ])

        # Check known anime titles
        detected_title = None
        if "re:zero" in t or "rezero" in t:
            detected_title = "re:zero"
        elif "jujutsu" in t or "jjk" in t:
            detected_title = "jujutsu kaisen"
        elif "frieren" in t:
            detected_title = "frieren"
        elif "titan" in t or "aot" in t or "shingeki" in t:
            detected_title = "attack on titan"
        elif "demon slayer" in t or "kimetsu" in t:
            detected_title = "demon slayer"
        elif "solo leveling" in t:
            detected_title = "solo leveling"
        elif "steins" in t:
            detected_title = "steins;gate"
        elif is_player:
            detected_title = "generic_anime"

        self.is_watching_anime = (detected_title is not None)
        self.current_anime = detected_title
        return self.is_watching_anime, detected_title

    def generate_anime_commentary(self, anime_title: Optional[str] = None) -> str:
        """Picks an in-character lore-rich commentary line for the current anime."""
        title = (anime_title or self.current_anime or "generic_anime").lower()
        quotes = ANIME_LORE_DATABASE.get(title, ANIME_LORE_DATABASE["generic_anime"])
        return random.choice(quotes)


if __name__ == "__main__":
    ac = AnimeCompanion()
    detected, title = ac.detect_anime_from_window("Crunchyroll - Jujutsu Kaisen Episode 41 - Watch Online")
    print(f"Detected: {detected} | Title: {title}")
    if detected:
        print("Commentary:", ac.generate_anime_commentary(title))
