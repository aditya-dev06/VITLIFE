import subprocess, sys, os
os.chdir(os.path.dirname(os.path.abspath(__file__)))

# Ensure sprites exist
if not os.path.exists('sprites/rem_idle.png'):
    subprocess.run([sys.executable, 'process_sprites.py'])

# Launch companion without console
subprocess.Popen([sys.executable, 'rem_companion.py'],
                 creationflags=0x08000000)  # CREATE_NO_WINDOW
