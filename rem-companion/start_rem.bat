@echo off
title Rem Companion
cd /d "%~dp0"
pip install Pillow watchdog pyautogui pystray pywin32 --quiet 2>nul
if not exist sprites\rem_idle.png (
    echo Processing sprites...
    python process_sprites.py
)
echo Starting Rem...
python rem_companion.py
