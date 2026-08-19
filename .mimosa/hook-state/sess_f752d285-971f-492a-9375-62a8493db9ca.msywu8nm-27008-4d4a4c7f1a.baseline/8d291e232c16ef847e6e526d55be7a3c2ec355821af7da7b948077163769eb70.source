import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

if (process.env.VERCEL) {
  console.log('===========================================================');
  console.log('Vercel environment detected.');
  console.log('Skipping postinstall frontend build and Python setup.');
  console.log('Vercel will build the frontend during its static-build phase.');
  console.log('===========================================================');
  process.exit(0);
}

console.log('=========================================');
console.log('RUNNING POSTINSTALL BUILD & SETUP...');
console.log('=========================================');

try {
  console.log('> Building frontend...');
  execSync('npm run build', { stdio: 'inherit' });
} catch (err) {
  console.error('Frontend build failed:', err);
  process.exit(1);
}

try {
  console.log('> Setting up Python virtual environment...');
  const setupScript = path.join(__dirname, 'setup-venv.js');
  execSync(`node "${setupScript}"`, { stdio: 'inherit' });
} catch (err) {
  console.warn('Python virtual environment setup failed, proceeding anyway:', err);
}

console.log('=========================================');
console.log('POSTINSTALL BUILD & SETUP COMPLETE');
console.log('=========================================');
