import math
import time
import random
from enum import Enum
from typing import Tuple, Optional


class MotionState(Enum):
    IDLE = "idle"
    WALK_LEFT = "walk_left"
    WALK_RIGHT = "walk_right"
    FLOATING = "floating"
    SITTING = "sitting"
    DRAGGED = "dragged"
    ALERT = "alert"
    HAPPY = "happy"


class RemAnimator:
    def __init__(self, screen_w: int, screen_h: int, win_w: int, win_h: int, initial_x: int, initial_y: int):
        self.screen_w = screen_w
        self.screen_h = screen_h
        self.win_w = win_w
        self.win_h = win_h
        
        # Physics coordinates & velocities
        self.x = float(initial_x)
        self.y = float(initial_y)
        self.vx = 0.0
        self.vy = 0.0
        
        # Floor (taskbar level)
        self.floor_y = float(screen_h - win_h - 40)
        self.gravity = 0.6
        self.friction = 0.92
        self.walk_speed = 1.6
        
        # State machine
        self.state = MotionState.IDLE
        self.state_time = 0.0
        self.state_duration = 5.0
        
        # Animation frame tickers
        self.anim_tick = 0
        self.frame_idx = 0
        self.hover_phase = 0.0
        self.is_dragged = False
        self.perch_target_y: Optional[float] = None

    def set_dragged(self, is_dragged: bool):
        self.is_dragged = is_dragged
        if is_dragged:
            self.state = MotionState.DRAGGED
            self.vx = 0.0
            self.vy = 0.0
        else:
            # Check if dropped in mid-air
            if self.y < self.floor_y - 20:
                self.state = MotionState.FLOATING
            else:
                self.state = MotionState.IDLE

    def update(self, dt: float = 0.02) -> Tuple[int, int, str, int]:
        """Updates physics, behavior, and returns (win_x, win_y, sprite_name, frame_idx)."""
        self.state_time += dt
        self.anim_tick += 1

        if not self.is_dragged:
            self._update_behavior(dt)
            self._update_physics(dt)

        # Determine active sprite and animation frame
        sprite_name, frame = self._get_active_frame()

        return int(self.x), int(self.y), sprite_name, frame

    def _update_behavior(self, dt: float):
        """Autonomous behavior picker for idle wandering, floating, and perching."""
        if self.state in [MotionState.ALERT, MotionState.HAPPY]:
            return

        if self.state_time >= self.state_duration:
            self.state_time = 0.0
            
            # If floating in mid-air, stay floating or float gently
            if self.y < self.floor_y - 80:
                self.state = MotionState.FLOATING
                self.state_duration = random.uniform(4.0, 8.0)
                return

            # Choose next ground behavior
            choice = random.random()
            if choice < 0.45:
                self.state = MotionState.IDLE
                self.vx = 0.0
                self.state_duration = random.uniform(3.0, 7.0)
            elif choice < 0.72:
                self.state = MotionState.WALK_LEFT
                self.vx = -self.walk_speed
                self.state_duration = random.uniform(2.5, 5.0)
            else:
                self.state = MotionState.WALK_RIGHT
                self.vx = self.walk_speed
                self.state_duration = random.uniform(2.5, 5.0)

    def _update_physics(self, dt: float):
        """Kinematics, gravity, floating oscillations, and screen boundary collision."""
        if self.state == MotionState.FLOATING:
            self.hover_phase += dt * 3.0
            # Gentle sinusoidal hover
            self.vy = math.sin(self.hover_phase) * 0.8
            # Slow gentle drift towards floor
            self.y += 0.35
            if self.y >= self.floor_y:
                self.y = self.floor_y
                self.vy = 0.0
                self.state = MotionState.IDLE
        elif self.state == MotionState.SITTING:
            self.vx = 0.0
            self.vy = 0.0
        else:
            # Gravity on ground / mid-air
            if self.y < self.floor_y:
                self.vy += self.gravity
                self.y += self.vy
                if self.y >= self.floor_y:
                    self.y = self.floor_y
                    self.vy = 0.0
            else:
                self.y = self.floor_y
                self.vy = 0.0

        # Horizontal movement
        self.x += self.vx

        # Screen boundary collisions
        min_x = 10
        max_x = self.screen_w - self.win_w - 10
        if self.x <= min_x:
            self.x = min_x
            if self.state == MotionState.WALK_LEFT:
                self.state = MotionState.WALK_RIGHT
                self.vx = self.walk_speed
        elif self.x >= max_x:
            self.x = max_x
            if self.state == MotionState.WALK_RIGHT:
                self.state = MotionState.WALK_LEFT
                self.vx = -self.walk_speed

    def _get_active_frame(self) -> Tuple[str, int]:
        """Maps current state to sprite frame index."""
        if self.state == MotionState.DRAGGED:
            return "float", (self.anim_tick // 8) % 6
        elif self.state == MotionState.FLOATING:
            return "float", (self.anim_tick // 10) % 6
        elif self.state == MotionState.WALK_LEFT:
            return "walk_left", (self.anim_tick // 6) % 4
        elif self.state == MotionState.WALK_RIGHT:
            return "walk_right", (self.anim_tick // 6) % 4
        elif self.state == MotionState.SITTING:
            return "sit", 0
        elif self.state == MotionState.ALERT:
            return "alert", 0
        elif self.state == MotionState.HAPPY:
            return "happy", 0
        else:  # IDLE
            return "idle", (self.anim_tick // 18) % 4
