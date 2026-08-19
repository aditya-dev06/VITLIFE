import io
import os
import time
import json
import base64
import random
import urllib.request
import urllib.error
from typing import Optional, Tuple
from PIL import Image, ImageGrab, ImageStat

try:
    import win32gui
    HAS_WIN32 = True
except ImportError:
    HAS_WIN32 = False


REM_VISION_PROMPT = """You are Rem, the twin maid from Re:Zero, looking live at Subaru-kun's computer screen.
Analyze the image provided:
1. Identify what is happening (anime character/scene, video game moment, code on screen, design, or video).
2. Express your raw, genuine emotional reaction in-character as Rem (polite, devoted to Subaru-kun, excited by cool moments, emotional at touching anime scenes, protective against bugs/villains).
3. Always prefix your reply with an emote tag: [EMOTE: happy | cheer | battle | shock | blush | empathy | calm].
4. Keep your spoken response brief, expressive, and natural (1-3 sentences). Address the user as Subaru-kun!
"""


class RemVisionEngine:
    def __init__(self):
        self.base_dir = os.path.dirname(os.path.abspath(__file__))
        self.config_path = os.path.join(self.base_dir, "rem_config.json")
        self.api_key = self._load_api_key()
        self.last_frame: Optional[Image.Image] = None
        self.last_capture_time = 0.0

    def _load_api_key(self) -> str:
        # Check environment variable first
        key = os.environ.get("GEMINI_API_KEY", "")
        if key:
            return key
        if os.path.exists(self.config_path):
            try:
                with open(self.config_path, 'r', encoding='utf-8') as f:
                    cfg = json.load(f)
                    return cfg.get("gemini_api_key", "")
            except Exception:
                pass
        return ""

    def set_api_key(self, key: str):
        self.api_key = key.strip()
        try:
            cfg = {}
            if os.path.exists(self.config_path):
                with open(self.config_path, 'r', encoding='utf-8') as f:
                    cfg = json.load(f)
            cfg["gemini_api_key"] = self.api_key
            with open(self.config_path, 'w', encoding='utf-8') as f:
                json.dump(cfg, f, indent=2)
        except Exception as e:
            print(f"[VisionEngine] Error saving key: {e}")

    def capture_screen(self, active_window_only: bool = False) -> Image.Image:
        """Captures either the active application window or full screen."""
        if active_window_only and HAS_WIN32:
            try:
                hwnd = win32gui.GetForegroundWindow()
                if hwnd:
                    rect = win32gui.GetWindowRect(hwnd)
                    # Check for valid geometry
                    if rect[2] > rect[0] and rect[3] > rect[1]:
                        return ImageGrab.grab(bbox=rect)
            except Exception:
                pass
        return ImageGrab.grab()

    def has_scene_changed(self, new_img: Image.Image, threshold: float = 8.0) -> bool:
        """Computes perceptual pixel delta to detect major scene cuts/movements."""
        if self.last_frame is None:
            self.last_frame = new_img.resize((64, 36)).convert("L")
            return True

        small_new = new_img.resize((64, 36)).convert("L")
        stat = ImageStat.Stat(ImageStat.Stat(small_new)._getmean())
        
        # Calculate root-mean-square difference
        diff = 0
        p1 = list(self.last_frame.getdata())
        p2 = list(small_new.getdata())
        if len(p1) == len(p2):
            diff = sum(abs(a - b) for a, b in zip(p1, p2)) / len(p1)

        self.last_frame = small_new
        return diff > threshold

    def see_and_react(self, active_window_title: str = "", force: bool = False) -> str:
        """Captures screen, performs multimodal vision analysis, and returns Rem's reaction."""
        try:
            img = self.capture_screen()
        except Exception as e:
            return "[EMOTE: calm] Rem is right here watching by Subaru-kun's side!"

        # Optimization: check if scene changed
        if not force and not self.has_scene_changed(img):
            # Scene is static, no need to spam API
            return ""

        # Downscale for ultra-fast multimodal transmission
        img.thumbnail((1024, 576), Image.Resampling.LANCZOS)
        buf = io.BytesIO()
        img.save(buf, format="JPEG", quality=82)
        base64_jpeg = base64.b64encode(buf.getvalue()).decode('utf-8')

        # 1. Try Gemini 2.5 Flash Multimodal Vision API if API key exists
        if self.api_key:
            try:
                url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={self.api_key}"
                payload = {
                    "contents": [{
                        "parts": [
                            {"text": f"{REM_VISION_PROMPT}\nActive window title: {active_window_title}"},
                            {
                                "inline_data": {
                                    "mime_type": "image/jpeg",
                                    "data": base64_jpeg
                                }
                            }
                        ]
                    }],
                    "generationConfig": {
                        "temperature": 0.8,
                        "maxOutputTokens": 180
                    }
                }

                req = urllib.request.Request(
                    url,
                    data=json.dumps(payload).encode('utf-8'),
                    headers={"Content-Type": "application/json"}
                )
                with urllib.request.urlopen(req, timeout=8) as response:
                    res_data = json.loads(response.read().decode('utf-8'))
                    candidates = res_data.get('candidates', [])
                    if candidates:
                        text = candidates[0].get('content', {}).get('parts', [{}])[0].get('text', '')
                        if text:
                            return text.strip()
            except Exception as api_err:
                print(f"[VisionEngine] Gemini Vision API Error: {api_err}")

        # 2. Offline Fallback Heuristics
        return self._offline_visual_reaction(active_window_title)

    def _offline_visual_reaction(self, title: str) -> str:
        """Heuristic in-character reaction when offline."""
        low = title.lower()
        if "re:zero" in low:
            return "[EMOTE: affection] Seeing Subaru-kun on screen always makes Rem's heart race! Rem will always stay by your side!"
        elif any(w in low for w in ["crunchyroll", "anime", "netflix", "vlc"]):
            return "[EMOTE: cheer] What an incredible anime scene! The animation and colors on your screen look so vivid, Subaru-kun!"
        elif any(w in low for w in ["code", "visual studio", "antigravity"]):
            return "[EMOTE: joy] Subaru-kun's code is flowing so cleanly! Rem is keeping all errors far away!"
        elif any(w in low for w in ["steam", "game", "valorant"]):
            return "[EMOTE: battle] Focus on your target, Subaru-kun! Rem is cheering for your victory!"
        else:
            return "[EMOTE: happy] Rem is looking at your screen right now, Subaru-kun! Everything looks in great shape~"


if __name__ == "__main__":
    vision = RemVisionEngine()
    print("Testing capture...")
    img = vision.capture_screen()
    print(f"Captured screen size: {img.size}")
    reaction = vision.see_and_react(active_window_title="Visual Studio Code", force=True)
    print("Rem Vision Reaction:", reaction)
