import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.dirname(__dirname);
const venvDir = path.join(rootDir, 'venv');

console.log('=========================================');
console.log('SETTING UP PYTHON VIRTUAL ENVIRONMENT...');
console.log('=========================================');

const runCmd = (cmd, args) => new Promise((resolve) => {
  console.log(`> Running: ${cmd} ${args.join(' ')}`);
  // Use shell: false so Node automatically escapes and quotes paths containing spaces
  const child = spawn(cmd, args, { stdio: 'inherit', shell: false });
  child.on('close', (code) => resolve(code === 0));
});

async function main() {
  // 1. Create venv if not exists
  if (!fs.existsSync(venvDir)) {
    console.log('Virtual environment not found. Creating one...');
    let ok = await runCmd('python3', ['-m', 'venv', 'venv']);
    if (!ok) {
      ok = await runCmd('python', ['-m', 'venv', 'venv']);
    }
    if (!ok) {
      console.error('ERROR: Failed to create Python virtual environment. Please ensure Python is installed.');
      process.exit(1);
    }
  } else {
    console.log('Virtual environment already exists.');
  }

  // 2. Install requirements
  console.log('Installing dependencies...');
  const pipPath = process.platform === 'win32'
    ? path.join(venvDir, 'Scripts', 'pip.exe')
    : path.join(venvDir, 'bin', 'pip');

  if (fs.existsSync(pipPath)) {
    const ok = await runCmd(pipPath, ['install', '-r', 'requirements.txt']);
    if (!ok) {
      console.error('ERROR: Failed to install Python dependencies in virtual environment.');
      process.exit(1);
    }
  } else {
    console.log('Pip not found in virtual environment. Trying system fallback with --break-system-packages...');
    let ok = await runCmd('pip3', ['install', '--break-system-packages', '-r', 'requirements.txt']);
    if (!ok) {
      ok = await runCmd('pip', ['install', '--break-system-packages', '-r', 'requirements.txt']);
    }
    if (!ok) {
      console.error('ERROR: Failed to install Python dependencies globally.');
      process.exit(1);
    }
  }

  console.log('=========================================');
  console.log('PYTHON VIRTUAL ENVIRONMENT SETUP COMPLETE');
  console.log('=========================================');
}

main();
