import time
import threading
from typing import Callable, Optional, Dict, Tuple

try:
    import win32gui
    import win32process
    import win32api
    HAS_WIN32 = True
except ImportError:
    HAS_WIN32 = False


class AppCategory:
    CODING = "coding"
    GAMING = "gaming"
    MEDIA = "media"
    BROWSING = "browsing"
    TERMINAL = "terminal"
    ERROR = "error"
    UNKNOWN = "unknown"


class ScreenContext:
    def __init__(self, title: str, category: str, rect: Tuple[int, int, int, int], is_fullscreen: bool, idle_seconds: float):
        self.title = title
        self.category = category
        self.rect = rect  # (left, top, right, bottom)
        self.is_fullscreen = is_fullscreen
        self.idle_seconds = idle_seconds
        self.timestamp = time.time()

    @property
    def time_of_day(self) -> str:
        hour = time.localtime().tm_hour
        if 0 <= hour < 5:
            return "late_night"
        elif 5 <= hour < 12:
            return "morning"
        elif 12 <= hour < 18:
            return "afternoon"
        else:
            return "evening"


class ScreenObserver:
    def __init__(self, on_context_change: Optional[Callable[[ScreenContext], None]] = None):
        self.on_context_change = on_context_change
        self.running = False
        self.thread = None
        self.current_context: Optional[ScreenContext] = None
        self.poll_interval = 1.0  # seconds

    def start(self):
        if not HAS_WIN32:
            print("[ScreenObserver] win32 API not available, running in mock mode.")
            return
        self.running = True
        self.thread = threading.Thread(target=self._observe_loop, daemon=True)
        self.thread.start()

    def _get_idle_duration(self) -> float:
        try:
            last_input = win32api.GetLastInputInfo()
            current_tick = win32api.GetTickCount()
            return max(0.0, (current_tick - last_input) / 1000.0)
        except Exception:
            return 0.0

    def _classify_window(self, title: str) -> str:
        t = title.lower()
        if not t:
            return AppCategory.UNKNOWN

        # Error dialogs
        if any(w in t for w in ["error", "fatal", "crash", "exception", "failed", "unhandled"]):
            return AppCategory.ERROR

        # Coding / Development
        if any(w in t for w in ["visual studio", "vscode", "antigravity", "cursor", "sublime", "pycharm", "intellij", "git", "github", "stack overflow", "excited-newton", "vitlife"]):
            return AppCategory.CODING

        # Terminal / Shell
        if any(w in t for w in ["powershell", "command prompt", "cmd.exe", "terminal", "bash", "wsl"]):
            return AppCategory.TERMINAL

        # Gaming
        if any(w in t for w in ["steam", "valorant", "genshin", "minecraft", "roblox", "epic games", "league of legends", "overwatch", "unity", "unreal"]):
            return AppCategory.GAMING

        # Media & Entertainment
        if any(w in t for w in ["youtube", "netflix", "spotify", "discord", "twitch", "anime", "crunchyroll", "vlc", "movie", "prime video"]):
            return AppCategory.MEDIA

        # Web Browsing
        if any(w in t for w in ["chrome", "firefox", "edge", "brave", "browser"]):
            return AppCategory.BROWSING

        return AppCategory.UNKNOWN

    def get_active_window_rect(self) -> Optional[Tuple[int, int, int, int]]:
        """Returns (left, top, right, bottom) of current foreground window."""
        if not HAS_WIN32:
            return None
        try:
            hwnd = win32gui.GetForegroundWindow()
            if hwnd and win32gui.IsWindowVisible(hwnd):
                return win32gui.GetWindowRect(hwnd)
        except Exception:
            pass
        return None

    def _observe_loop(self):
        last_title = ""
        while self.running:
            try:
                hwnd = win32gui.GetForegroundWindow()
                if hwnd and win32gui.IsWindowVisible(hwnd):
                    title = win32gui.GetWindowText(hwnd).strip()
                    rect = win32gui.GetWindowRect(hwnd)
                    
                    # Detect fullscreen
                    screen_w = win32api.GetSystemMetrics(0)
                    screen_h = win32api.GetSystemMetrics(1)
                    is_fs = (rect[2] - rect[0] >= screen_w) and (rect[3] - rect[1] >= screen_h)
                    
                    idle_sec = self._get_idle_duration()
                    category = self._classify_window(title)

                    context = ScreenContext(
                        title=title,
                        category=category,
                        rect=rect,
                        is_fullscreen=is_fs,
                        idle_seconds=idle_sec
                    )

                    # Trigger callback if window changed or significant context shift
                    if title != last_title or (self.current_context and self.current_context.category != category):
                        last_title = title
                        self.current_context = context
                        if self.on_context_change:
                            self.on_context_change(context)

                time.sleep(self.poll_interval)
            except Exception as e:
                time.sleep(1.0)

    def stop(self):
        self.running = False
        if self.thread:
            self.thread.join(timeout=1.0)


if __name__ == "__main__":
    def print_ctx(c: ScreenContext):
        print(f"[Context] Category: {c.category.upper()} | Title: {c.title[:50]} | Time: {c.time_of_day} | Idle: {c.idle_seconds:.1f}s")

    obs = ScreenObserver(on_context_change=print_ctx)
    obs.start()
    print("Screen observer listening... switch windows to test (Ctrl+C to stop).")
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        obs.stop()
