import os
import sys
import time
import random
import threading
import tkinter as tk
from tkinter import messagebox, simpledialog
from PIL import Image, ImageTk

try:
    import winsound
    HAS_WINSOUND = True
except ImportError:
    HAS_WINSOUND = False

try:
    import win32gui
    import win32con
    import win32api
    HAS_WIN32 = True
except ImportError:
    HAS_WIN32 = False

try:
    import pyautogui
    import pyperclip
    HAS_AUTOMATION = True
except ImportError:
    HAS_AUTOMATION = False

# Import companion modules
from antigravity_watcher import AntigravityWatcher, EventType, AgentEvent
from screen_observer import ScreenObserver, ScreenContext, AppCategory
from rem_brain import RemBrain
from rem_emotions import EmotionType
from rem_quotes import get_quote


class AutonomousRemCompanion:
    TRANSPARENT_COLOR = '#010101'
    SPRITE_WIDTH = 180
    SPRITE_HEIGHT = 240

    def __init__(self):
        self.root = tk.Tk()
        self.root.title("Rem Autonomous AI Companion")
        
        # Transparent & Borderless Always-on-top Window
        self.root.overrideredirect(True)
        self.root.wm_attributes("-topmost", True)
        self.root.config(bg=self.TRANSPARENT_COLOR)
        try:
            self.root.wm_attributes("-transparentcolor", self.TRANSPARENT_COLOR)
        except Exception:
            pass

        # Screen & Window Geometry
        self.screen_width = self.root.winfo_screenwidth()
        self.screen_height = self.root.winfo_screenheight()
        self.win_width = 460
        self.win_height = 430
        
        self.win_x = self.screen_width - self.win_width - 25
        self.win_y = self.screen_height - self.win_height - 45
        self.root.geometry(f"{self.win_width}x{self.win_height}+{self.win_x}+{self.win_y}")

        # Dragging variables
        self._drag_start_x = 0
        self._drag_start_y = 0
        self._is_dragging = False

        # Internal sprite animation coordinates
        self.sprite_base_x = self.win_width // 2
        self.sprite_base_y = self.win_height - (self.SPRITE_HEIGHT // 2) - 10
        self.sprite_offset_x = 0
        self.walk_dir = 1
        self.anim_frame_tick = 0
        self.motion_state = "idle"  # idle, walk, float, alert, happy, sit

        # Load Animation Assets
        self.base_dir = os.path.dirname(os.path.abspath(__file__))
        self.sprites_dir = os.path.join(self.base_dir, "sprites")
        self.sprites = {}
        self.load_all_sprites()

        # Canvas for drawing Rem and speech bubbles
        self.canvas = tk.Canvas(
            self.root,
            width=self.win_width,
            height=self.win_height,
            bg=self.TRANSPARENT_COLOR,
            highlightthickness=0
        )
        self.canvas.pack(fill="both", expand=True)

        # Bind dragging & interactions
        self.canvas.bind("<ButtonPress-1>", self.on_drag_start)
        self.canvas.bind("<B1-Motion>", self.on_drag_motion)
        self.canvas.bind("<ButtonRelease-1>", self.on_drag_release)
        self.canvas.bind("<Button-3>", self.show_context_menu)
        self.canvas.bind("<Double-Button-1>", lambda e: self.show_interactive_chat())

        # Speech bubble references
        self.bubble_visible = False
        self.bubble_elements = []
        self.typewriter_job = None
        self.bubble_timer_job = None

        # Context Menu
        self.menu = tk.Menu(self.root, tearoff=0, bg="#0b0f19", fg="#f8fafc", activebackground="#38bdf8", activeforeground="#0b0f19")
        self.menu.add_command(label="👁️ Rem, What Do You See? (Vision)", command=self.trigger_screen_vision)
        self.menu.add_command(label="💬 Chat with Rem (AI)", command=self.show_interactive_chat)
        self.menu.add_command(label="⚡ Reply to Antigravity", command=self.show_antigravity_reply)
        self.menu.add_separator()
        self.menu.add_command(label="📊 Brain & Learning Stats", command=self.show_brain_dashboard)
        self.menu.add_command(label="🔑 Set Gemini API Key", command=self.prompt_api_key_dialog)
        self.menu.add_command(label="💖 Rem Quote", command=self.say_random_quote)
        self.menu.add_separator()
        self.menu.add_command(label="🔔 Test Alert", command=lambda: self.trigger_agent_event("needs_input", "Action Required", "Antigravity needs your review for the plan!"))
        self.menu.add_command(label="✨ Test Celebration", command=lambda: self.trigger_agent_event("task_done", "All Done!", "Build completed successfully!"))
        self.menu.add_separator()
        self.menu.add_command(label="👋 Hide Rem", command=self.hide_window)
        self.menu.add_command(label="❌ Exit", command=self.quit_app)

        # Draw initial character on Canvas
        self.sprite_canvas_id = self.canvas.create_image(
            self.sprite_base_x,
            self.sprite_base_y,
            image=self.sprites.get("idle_0")
        )

        # 1. Initialize Screen Perception Engine
        self.observer = ScreenObserver(on_context_change=self.handle_screen_context_change)
        self.observer.start()

        # 2. Initialize Master Brain (Dual-Core + Vision + RL + Anime)
        self.brain = RemBrain(on_thought_generated=self.handle_autonomous_thought)
        self.brain.start()

        # 3. Initialize Antigravity Watcher Daemon
        self.watcher = AntigravityWatcher(callback=self.handle_agent_event)
        self.watcher.start()

        # Start Global Hotkey Thread (Ctrl+Shift+R for Instant Vision)
        self._start_hotkey_listener()

        # Start Smooth 30 FPS Animation Loop (every 33ms)
        self.animate_loop()

        # Start Autonomous Behavior Loop (random walking/floating)
        self.behavior_loop()

        # Greet on launch
        self.root.after(1000, lambda: self.show_speech_bubble(
            "Hello Subaru-kun! Rem's vision & self-evolving mind are online~ 💙",
            actions=[("👁️ Look at Screen", self.trigger_screen_vision), ("💬 Chat", self.show_interactive_chat), ("✕", self.return_to_idle)],
            auto_hide=8
        ))

    def load_all_sprites(self):
        """Loads and prepares all PhotoImage sprites."""
        for i in range(4):
            path = os.path.join(self.sprites_dir, f"rem_idle_{i}.png")
            if os.path.exists(path):
                self.sprites[f"idle_{i}"] = ImageTk.PhotoImage(Image.open(path))
        if "idle_0" not in self.sprites:
            p = os.path.join(self.sprites_dir, "rem_idle.png")
            if os.path.exists(p):
                self.sprites["idle_0"] = ImageTk.PhotoImage(Image.open(p))

        for i in range(4):
            wl = os.path.join(self.sprites_dir, f"rem_walk_left_{i}.png")
            wr = os.path.join(self.sprites_dir, f"rem_walk_right_{i}.png")
            if os.path.exists(wl):
                self.sprites[f"walk_left_{i}"] = ImageTk.PhotoImage(Image.open(wl))
            if os.path.exists(wr):
                self.sprites[f"walk_right_{i}"] = ImageTk.PhotoImage(Image.open(wr))

        for i in range(6):
            fl = os.path.join(self.sprites_dir, f"rem_float_{i}.png")
            if os.path.exists(fl):
                self.sprites[f"float_{i}"] = ImageTk.PhotoImage(Image.open(fl))

        for name in ["alert", "happy", "sit"]:
            p = os.path.join(self.sprites_dir, f"rem_{name}.png")
            if os.path.exists(p):
                self.sprites[name] = ImageTk.PhotoImage(Image.open(p))

    def _start_hotkey_listener(self):
        """Background listener for Ctrl+Shift+R hotkey."""
        def listener():
            if not HAS_WIN32:
                return
            while True:
                try:
                    # Check if Ctrl (0x11), Shift (0x10), and 'R' (0x52) are pressed
                    ctrl = win32api.GetAsyncKeyState(0x11) & 0x8000
                    shift = win32api.GetAsyncKeyState(0x10) & 0x8000
                    r_key = win32api.GetAsyncKeyState(0x52) & 0x8000
                    if ctrl and shift and r_key:
                        self.root.after(0, self.trigger_screen_vision)
                        time.sleep(0.8)  # Debounce
                    time.sleep(0.1)
                except Exception:
                    time.sleep(1.0)
        threading.Thread(target=listener, daemon=True).start()

    def animate_loop(self):
        """Smooth animation loop updating sprite position and frame."""
        self.anim_frame_tick += 1
        
        if self._is_dragging:
            sprite_key = f"float_{(self.anim_frame_tick // 4) % 6}"
        elif self.motion_state == "walk":
            self.sprite_offset_x += self.walk_dir * 1.4
            if self.sprite_offset_x > 85:
                self.walk_dir = -1
            elif self.sprite_offset_x < -85:
                self.walk_dir = 1
            
            dir_name = "walk_right" if self.walk_dir > 0 else "walk_left"
            sprite_key = f"{dir_name}_{(self.anim_frame_tick // 4) % 4}"
        elif self.motion_state == "float":
            sprite_key = f"float_{(self.anim_frame_tick // 5) % 6}"
        elif self.motion_state == "alert":
            sprite_key = "alert"
        elif self.motion_state == "happy":
            sprite_key = "happy"
        elif self.motion_state == "sit":
            sprite_key = "sit"
        else:
            sprite_key = f"idle_{(self.anim_frame_tick // 14) % 4}"

        if sprite_key in self.sprites:
            self.canvas.itemconfig(self.sprite_canvas_id, image=self.sprites[sprite_key])
        elif "idle_0" in self.sprites:
            self.canvas.itemconfig(self.sprite_canvas_id, image=self.sprites["idle_0"])

        cur_x = self.sprite_base_x + (self.sprite_offset_x if self.motion_state == "walk" else 0)
        self.canvas.coords(self.sprite_canvas_id, cur_x, self.sprite_base_y)

        self.root.after(33, self.animate_loop)

    def behavior_loop(self):
        """Periodically switches Rem's autonomous desktop behavior."""
        if not self._is_dragging and self.motion_state not in ["alert", "happy"]:
            r = random.random()
            if r < 0.45:
                self.motion_state = "idle"
            elif r < 0.8:
                self.motion_state = "walk"
            else:
                self.motion_state = "float"

        self.root.after(int(random.uniform(5000, 10000)), self.behavior_loop)

    def on_drag_start(self, event):
        self._is_dragging = True
        self._drag_start_x = event.x
        self._drag_start_y = event.y

    def on_drag_motion(self, event):
        deltax = event.x - self._drag_start_x
        deltay = event.y - self._drag_start_y
        self.win_x = self.root.winfo_x() + deltax
        self.win_y = self.root.winfo_y() + deltay
        self.root.geometry(f"+{self.win_x}+{self.win_y}")

    def on_drag_release(self, event):
        self._is_dragging = False

    def show_context_menu(self, event):
        try:
            self.menu.tk_popup(event.x_root, event.y_root)
        finally:
            self.menu.grab_release()

    def show_speech_bubble(self, text, actions=None, with_input=False, input_placeholder="Type a message...", on_submit=None, border_color="#38bdf8", emote_icon="💬", auto_hide=10):
        self.clear_speech_bubble()
        self.bubble_visible = True

        bx, by = 15, 10
        bw = self.win_width - 30
        bh = 165 if with_input else (120 if actions else 85)

        # Speech bubble card with dynamic emotional border
        bg_card = self.canvas.create_rectangle(
            bx, by, bx + bw, by + bh,
            fill="#0b0f19", outline=border_color, width=2
        )
        pointer = self.canvas.create_polygon(
            bx + (bw // 2) - 18, by + bh,
            bx + (bw // 2), by + bh + 14,
            bx + (bw // 2) + 18, by + bh,
            fill="#0b0f19", outline=border_color
        )
        self.bubble_elements.extend([bg_card, pointer])

        # RL Micro-Reaction Buttons (👍 💖 👎) in top-right
        rl_frame = tk.Frame(self.root, bg="#0b0f19")
        
        def react_thumb(rtype):
            self.brain.rl.apply_feedback(rtype)
            self.canvas.itemconfig(text_id, text=f"{emote_icon} [Subaru-kun gave feedback: {rtype.upper()}! 💙]")

        btn_like = tk.Button(rl_frame, text="👍", command=lambda: react_thumb("like"), font=("Segoe UI", 7), bg="#1e293b", fg="#f8fafc", relief="flat", padx=2, pady=0, cursor="hand2")
        btn_like.pack(side="left", padx=1)
        btn_love = tk.Button(rl_frame, text="💖", command=lambda: react_thumb("love"), font=("Segoe UI", 7), bg="#1e293b", fg="#f8fafc", relief="flat", padx=2, pady=0, cursor="hand2")
        btn_love.pack(side="left", padx=1)
        btn_dislike = tk.Button(rl_frame, text="👎", command=lambda: react_thumb("dislike"), font=("Segoe UI", 7), bg="#1e293b", fg="#f8fafc", relief="flat", padx=2, pady=0, cursor="hand2")
        btn_dislike.pack(side="left", padx=1)

        rl_win = self.canvas.create_window(bx + bw - 8, by + 12, window=rl_frame, anchor="ne")
        self.bubble_elements.append(rl_win)

        # Text element inside speech bubble
        text_id = self.canvas.create_text(
            bx + 14, by + 12,
            text="",
            anchor="nw",
            width=bw - 85,
            font=("Segoe UI", 9, "bold"),
            fill="#f8fafc"
        )
        self.bubble_elements.append(text_id)

        # Typewriter animation
        self.typewriter_text(text_id, f"{emote_icon} {text}", 0)

        # Interactive controls frame
        ctrl_frame = tk.Frame(self.root, bg="#0b0f19")

        # 1. Text Input box if requested
        if with_input:
            input_row = tk.Frame(ctrl_frame, bg="#0b0f19")
            input_row.pack(fill="x", padx=2, pady=3)

            entry_var = tk.StringVar()
            entry = tk.Entry(
                input_row,
                textvariable=entry_var,
                font=("Segoe UI", 9),
                bg="#1e293b",
                fg="#f8fafc",
                insertbackground="#38bdf8",
                relief="flat",
                highlightthickness=1,
                highlightcolor="#38bdf8",
                highlightbackground="#334155"
            )
            entry.pack(side="left", fill="x", expand=True, padx=(0, 4), ipady=3)
            entry.focus_set()

            def submit_action(e=None):
                val = entry_var.get()
                if val and val.strip():
                    if on_submit:
                        on_submit(val)
                    else:
                        self.send_reply_to_antigravity(val)

            entry.bind("<Return>", submit_action)

            send_btn = tk.Button(
                input_row,
                text="Send ➔",
                command=submit_action,
                font=("Segoe UI", 8, "bold"),
                bg="#38bdf8",
                fg="#0f172a",
                activebackground="#7dd3fc",
                relief="flat",
                padx=8,
                pady=2,
                cursor="hand2"
            )
            send_btn.pack(side="right")

        # 2. Quick action buttons
        if actions:
            btn_row = tk.Frame(ctrl_frame, bg="#0b0f19")
            btn_row.pack(fill="x", padx=2, pady=(2, 0))
            for label, cmd in actions:
                btn = tk.Button(
                    btn_row,
                    text=label,
                    command=cmd,
                    font=("Segoe UI", 8, "bold"),
                    bg="#1e293b",
                    fg="#38bdf8",
                    activebackground="#38bdf8",
                    activeforeground="#0f172a",
                    relief="flat",
                    padx=6,
                    pady=2,
                    cursor="hand2",
                    highlightthickness=1,
                    highlightbackground="#38bdf8"
                )
                btn.pack(side="left", padx=2)

        ctrl_win = self.canvas.create_window(bx + bw - 14, by + bh - 10, window=ctrl_frame, anchor="se")
        self.bubble_elements.append(ctrl_win)

        # Auto-hide timer
        if auto_hide and not with_input:
            if self.bubble_timer_job:
                self.root.after_cancel(self.bubble_timer_job)
            self.bubble_timer_job = self.root.after(int(auto_hide * 1000), self.clear_speech_bubble)

    def typewriter_text(self, text_id, full_text, current_idx):
        if not self.bubble_visible:
            return
        if current_idx <= len(full_text):
            self.canvas.itemconfig(text_id, text=full_text[:current_idx])
            self.typewriter_job = self.root.after(16, self.typewriter_text, text_id, full_text, current_idx + 1)

    def clear_speech_bubble(self):
        self.bubble_visible = False
        if self.typewriter_job:
            self.root.after_cancel(self.typewriter_job)
            self.typewriter_job = None
        if self.bubble_timer_job:
            self.root.after_cancel(self.bubble_timer_job)
            self.bubble_timer_job = None

        for el in self.bubble_elements:
            self.canvas.delete(el)
        self.bubble_elements = []

    def handle_screen_context_change(self, context: ScreenContext):
        self.brain.update_screen_context(context)

    def handle_autonomous_thought(self, raw_thought: str):
        emo, clean_text = self.brain.emotions.parse_emotion_from_text(raw_thought)
        sprite_pose, border_color, icon = self.brain.emotions.get_sprite_and_theme(emo)
        self.motion_state = sprite_pose
        self.root.after(0, lambda: self.show_speech_bubble(
            clean_text,
            actions=[("👁️ Look", self.trigger_screen_vision), ("💬 Chat", self.show_interactive_chat), ("✕", self.return_to_idle)],
            border_color=border_color,
            emote_icon=icon,
            auto_hide=10
        ))

    def trigger_screen_vision(self):
        """Triggers live multimodal vision capture and emotional commentary."""
        self.motion_state = "alert"
        emo, reaction = self.brain.look_at_screen_now()
        sprite_pose, border_color, icon = self.brain.emotions.get_sprite_and_theme(emo)
        self.motion_state = sprite_pose
        self.show_speech_bubble(
            f"Rem sees:\n{reaction}",
            actions=[("👁️ Look Again", self.trigger_screen_vision), ("💬 Reply", self.show_interactive_chat), ("✕", self.return_to_idle)],
            border_color=border_color,
            emote_icon=icon,
            auto_hide=14
        )

    def show_brain_dashboard(self):
        """Opens Rem's Brain & Learning Stats Dashboard Modal."""
        stats = self.brain.get_dashboard_stats()
        msg = (
            f"🧠 REM'S AUTONOMOUS BRAIN STATS\n"
            f"━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
            f"🌟 Independence Progress: {stats['independence_percentage']}%\n"
            f"📚 Total Learned Concepts: {stats['total_learned_concepts']}\n"
            f"🎬 Anime Watched Together: {stats['anime_watched_count']}\n"
            f"💖 Affinity Level: {stats['affinity_score']}%\n"
            f"💬 Total Interactions: {stats['total_interactions']}\n"
            f"📈 RL Total Rewards: {stats['rl_stats']['total_rewards']} pts\n"
            f"🔑 Cloud API Key: {'Connected ✅' if stats['has_api_key'] else 'Offline Student Mode 💡'}\n"
            f"━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
            f"Rem continues to learn and become more self-sufficient with every chat!"
        )
        messagebox.showinfo("Rem's Brain Dashboard", msg)

    def prompt_api_key_dialog(self):
        """Allows user to set or update their Gemini API key."""
        current_key = self.brain.get_api_key()
        new_key = simpledialog.askstring("Gemini API Key", "Enter your Gemini API key for live Cloud Vision & Teacher intelligence:", initialvalue=current_key)
        if new_key is not None:
            self.brain.set_api_key(new_key)
            status = "configured successfully!" if new_key.strip() else "cleared (Offline mode)."
            messagebox.showinfo("API Key Updated", f"Gemini API key {status}")

    def handle_agent_event(self, event: AgentEvent):
        if not event:
            return
        type_str = event.type.value if hasattr(event.type, 'value') else str(event.type)
        self.root.after(0, self.trigger_agent_event, type_str, event.title, event.body)

    def trigger_agent_event(self, event_type, title, message):
        if event_type == "needs_input":
            self.motion_state = "alert"
            if HAS_WINSOUND:
                try:
                    winsound.MessageBeep(winsound.MB_ICONASTERISK)
                except Exception:
                    pass
            actions = [
                ("⚡ Approve", lambda: self.send_reply_to_antigravity("Approve")),
                ("Proceed", lambda: self.send_reply_to_antigravity("Proceed")),
                ("Open AGY", self.focus_antigravity_window),
                ("✕", self.return_to_idle)
            ]
            self.show_speech_bubble(f"❗ {title}:\n{message}", actions=actions, with_input=True, border_color="#ef4444", emote_icon="🔔", auto_hide=None)
        elif event_type == "task_done":
            self.motion_state = "happy"
            self.show_speech_bubble(f"✨ {title} {message}", border_color="#10b981", emote_icon="🎉", auto_hide=6)
            self.root.after(6000, self.return_to_idle)
        elif event_type == "working":
            self.motion_state = "idle"
            self.show_speech_bubble(f"💭 {message}", auto_hide=4)
        elif event_type == "error":
            self.motion_state = "alert"
            if HAS_WINSOUND:
                try:
                    winsound.MessageBeep(winsound.MB_ICONHAND)
                except Exception:
                    pass
            actions = [("⚡ View in AGY", self.focus_antigravity_window), ("✕", self.return_to_idle)]
            self.show_speech_bubble(f"⚠️ {title}: {message}", actions=actions, with_input=True, border_color="#f59e0b", emote_icon="💥", auto_hide=None)

    def show_interactive_chat(self):
        """Opens free-form chat with Rem's persona AI."""
        self.motion_state = "alert"

        def handle_chat_submit(user_msg):
            emo, reply = self.brain.chat(user_msg)
            sprite_pose, border_color, icon = self.brain.emotions.get_sprite_and_theme(emo)
            self.motion_state = sprite_pose
            self.show_speech_bubble(
                f"💙 Rem:\n{reply}",
                actions=[("💬 Reply", self.show_interactive_chat), ("👁️ Look", self.trigger_screen_vision), ("✕", self.return_to_idle)],
                with_input=True,
                input_placeholder="Say something to Rem...",
                on_submit=handle_chat_submit,
                border_color=border_color,
                emote_icon=icon,
                auto_hide=None
            )

        self.show_speech_bubble(
            "Subaru-kun! What is on your mind? Rem is listening carefully~",
            actions=[("✕ Close", self.return_to_idle)],
            with_input=True,
            input_placeholder="Type a message to Rem...",
            on_submit=handle_chat_submit,
            auto_hide=None
        )

    def show_antigravity_reply(self):
        self.motion_state = "alert"
        actions = [
            ("⚡ Approve", lambda: self.send_reply_to_antigravity("Approve")),
            ("Continue", lambda: self.send_reply_to_antigravity("Continue")),
            ("✕ Close", self.return_to_idle)
        ]
        self.show_speech_bubble(
            "Subaru-kun, what would you like to tell Antigravity?",
            actions=actions,
            with_input=True,
            on_submit=self.send_reply_to_antigravity,
            auto_hide=None
        )

    def find_antigravity_hwnd(self):
        found = []
        if not HAS_WIN32:
            return None

        def enum_callback(hwnd, extra):
            if win32gui.IsWindowVisible(hwnd):
                title = win32gui.GetWindowText(hwnd).lower()
                if any(kw in title for kw in ["antigravity", "vitlife", "excited-newton", "visual studio code", "cursor", "chrome"]):
                    if "antigravity" in title or "excited-newton" in title:
                        found.insert(0, hwnd)
                    else:
                        found.append(hwnd)
            return True

        try:
            win32gui.EnumWindows(enum_callback, None)
        except Exception:
            pass

        return found[0] if found else None

    def send_reply_to_antigravity(self, text):
        if not text or not str(text).strip():
            return
        
        clean_text = str(text).strip()
        self.clear_speech_bubble()
        self.motion_state = "happy"
        self.show_speech_bubble(f"🚀 Sent to Antigravity:\n\"{clean_text[:60]}\"", auto_hide=4)
        self.root.after(4000, self.return_to_idle)

        def bg_send():
            prev_hwnd = None
            if HAS_WIN32:
                try:
                    prev_hwnd = win32gui.GetForegroundWindow()
                except Exception:
                    pass

            target_hwnd = self.find_antigravity_hwnd()
            if target_hwnd and HAS_WIN32:
                try:
                    win32gui.ShowWindow(target_hwnd, win32con.SW_RESTORE)
                    win32gui.SetForegroundWindow(target_hwnd)
                    time.sleep(0.12)
                except Exception:
                    pass

            if HAS_AUTOMATION:
                try:
                    pyperclip.copy(clean_text)
                    time.sleep(0.06)
                    pyautogui.hotkey('ctrl', 'v')
                    time.sleep(0.06)
                    pyautogui.press('enter')
                except Exception as e:
                    print(f"Automation error: {e}")

            if prev_hwnd and prev_hwnd != target_hwnd and HAS_WIN32:
                try:
                    time.sleep(0.1)
                    win32gui.SetForegroundWindow(prev_hwnd)
                except Exception:
                    pass

        threading.Thread(target=bg_send, daemon=True).start()

    def return_to_idle(self):
        self.clear_speech_bubble()
        self.motion_state = "idle"

    def say_random_quote(self):
        quote = get_quote(category='idle')
        self.show_speech_bubble(quote, actions=[("💬 Chat", self.show_interactive_chat), ("✕", self.return_to_idle)], auto_hide=7)

    def focus_antigravity_window(self):
        self.return_to_idle()
        target = self.find_antigravity_hwnd()
        if target and HAS_WIN32:
            try:
                win32gui.ShowWindow(target, win32con.SW_RESTORE)
                win32gui.SetForegroundWindow(target)
            except Exception:
                pass

    def hide_window(self):
        self.root.withdraw()
        self.root.after(10000, self.root.deiconify)

    def quit_app(self):
        if self.observer:
            self.observer.stop()
        if self.brain:
            self.brain.stop()
        if self.watcher:
            self.watcher.stop()
        self.root.destroy()
        sys.exit(0)

    def run(self):
        self.root.mainloop()


if __name__ == "__main__":
    app = AutonomousRemCompanion()
    app.run()
