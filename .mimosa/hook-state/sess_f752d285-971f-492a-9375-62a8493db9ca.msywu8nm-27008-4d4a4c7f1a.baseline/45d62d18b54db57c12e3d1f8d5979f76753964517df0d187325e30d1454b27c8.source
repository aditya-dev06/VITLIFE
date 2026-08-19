import json
import os
import time
import threading
import glob
from dataclasses import dataclass
from enum import Enum
from typing import Callable, Optional, Dict

class EventType(Enum):
    IDLE = 'idle'
    WORKING = 'working'
    NEEDS_INPUT = 'needs_input'
    TASK_DONE = 'task_done'
    ERROR = 'error'

@dataclass
class AgentEvent:
    type: EventType
    title: str
    body: str

class AntigravityWatcher:
    def __init__(self, callback: Callable[[AgentEvent], None]):
        self.callback = callback
        self.running = False
        self.thread = None
        self.file_handles: Dict[str, any] = {}
        self.base_dir = r"C:\Users\Aditya Prakash\.gemini\antigravity\brain"
        self.last_event_time = 0
        self.debounce_seconds = 0.5

    def start(self):
        self.running = True
        self.thread = threading.Thread(target=self._tail_loop, daemon=True)
        self.thread.start()

    def _discover_transcripts(self):
        """Finds all transcript.jsonl files modified in the last 24 hours."""
        pattern = os.path.join(self.base_dir, "*", ".system_generated", "logs", "transcript.jsonl")
        files = glob.glob(pattern)
        now = time.time()
        # Keep files active in last 24 hours
        active_files = [f for f in files if (now - os.path.getmtime(f)) < 86400]
        return sorted(active_files, key=os.path.getmtime, reverse=True)

    def _tail_loop(self):
        # 1. Initialize file handles at current EOF so we don't replay old history
        for file_path in self._discover_transcripts():
            try:
                fh = open(file_path, 'r', encoding='utf-8', errors='ignore')
                fh.seek(0, os.SEEK_END)
                self.file_handles[file_path] = fh
                print(f"[Watcher] Tailing: {os.path.basename(os.path.dirname(os.path.dirname(os.path.dirname(file_path))))}")
            except Exception as e:
                pass

        scan_interval = 0
        while self.running:
            try:
                # Periodically discover newly created conversation transcripts
                scan_interval += 1
                if scan_interval >= 10:
                    scan_interval = 0
                    for file_path in self._discover_transcripts():
                        if file_path not in self.file_handles:
                            try:
                                fh = open(file_path, 'r', encoding='utf-8', errors='ignore')
                                fh.seek(0, os.SEEK_END)
                                self.file_handles[file_path] = fh
                                print(f"[Watcher] New transcript found: {file_path}")
                            except Exception:
                                pass

                # Read new lines from all watched file handles
                for file_path, fh in list(self.file_handles.items()):
                    try:
                        while self.running:
                            line = fh.readline()
                            if not line:
                                break
                            
                            line = line.strip()
                            if not line:
                                continue

                            try:
                                step = json.loads(line)
                                event = self._classify(step)
                                if event:
                                    # Debounce repeated rapid events
                                    now = time.time()
                                    if now - self.last_event_time > self.debounce_seconds or event.type == EventType.NEEDS_INPUT:
                                        self.last_event_time = now
                                        self.callback(event)
                            except Exception as json_err:
                                pass
                    except Exception:
                        pass

                time.sleep(0.25)
            except Exception as loop_err:
                time.sleep(0.5)

    def _classify(self, step: dict) -> Optional[AgentEvent]:
        source = step.get('source', '')
        step_type = step.get('type', '')
        status = step.get('status', '')
        content_raw = step.get('content', '')
        content = str(content_raw) if content_raw is not None else ""
        error = step.get('error')
        error_code = step.get('error_code')
        tool_calls = step.get('tool_calls', [])

        # 1. Error alerts
        if error or error_code or step_type == 'ERROR_MESSAGE':
            err_msg = str(error) if error else "An error occurred during execution."
            return AgentEvent(EventType.ERROR, "Attention Required", err_msg[:120])
        
        # 2. Plan review / feedback requested (CRITICAL ALERT)
        if step_type == 'CODE_ACTION' and ('RequestFeedback' in content or 'implementation_plan.md' in content):
            return AgentEvent(EventType.NEEDS_INPUT, "Plan Review Required", "Subaru-kun, please review the implementation plan to proceed!")

        # 3. Interactive questions from Antigravity (CRITICAL ALERT)
        if step_type == 'PLANNER_RESPONSE':
            tool_names = [t.get('name') for t in tool_calls if isinstance(t, dict)]
            if 'ask_question' in tool_names:
                return AgentEvent(EventType.NEEDS_INPUT, "Question from Antigravity", "Antigravity needs you to pick an option!")
            
            if tool_calls:
                first_tool = tool_names[0] if tool_names else "tools"
                return AgentEvent(EventType.WORKING, "Working", f"Antigravity is running {first_tool}...")
            
            # Final text response generated for user (Turn complete!)
            if content and not tool_calls and source == 'MODEL':
                # Strip markdown/tags preview
                clean_preview = content.replace('<USER_REQUEST>', '').replace('</USER_REQUEST>', '').strip()
                preview = clean_preview[:110] + ('...' if len(clean_preview) > 110 else '')
                return AgentEvent(EventType.NEEDS_INPUT, "Antigravity Answered", preview)

        # 4. User inputs
        if source == 'USER_EXPLICIT' and step_type == 'USER_INPUT':
            return AgentEvent(EventType.WORKING, "Processing", "Rem heard your request!")

        # 5. Background task/command completions
        if step_type == 'RUN_COMMAND':
            if status == 'DONE':
                return AgentEvent(EventType.TASK_DONE, "Command Completed", "Terminal command finished execution!")
            elif status == 'RUNNING':
                return AgentEvent(EventType.WORKING, "Running Command", "Command is currently executing in background...")

        return None

    def stop(self):
        self.running = False
        for fh in self.file_handles.values():
            try:
                fh.close()
            except Exception:
                pass
        self.file_handles.clear()
        if self.thread:
            self.thread.join(timeout=1.0)
