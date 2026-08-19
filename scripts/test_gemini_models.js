import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env.local');
  if (fs.existsSync(envPath)) {
    const envLines = fs.readFileSync(envPath, 'utf-8').split('\n');
    for (const line of envLines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
        const [key, ...vals] = trimmed.split('=');
        const val = vals.join('=').trim().replace(/^["']|["']$/g, '');
        if (key && !process.env[key.trim()]) {
          process.env[key.trim()] = val;
        }
      }
    }
  }
}

loadEnv();

const apiKey = process.env.Gemini_API_Key || process.env.GEMINI_API_KEY;

async function checkModels() {
  console.log('Testing Gemini API key...');
  const res = await fetch('https://generativelanguage.googleapis.com/v1beta/models', {
    headers: { 'x-goog-api-key': apiKey || '' },
    redirect: 'manual'
  });
  console.log(`Status: ${res.status}`);
  if (res.ok) {
    const data = await res.json();
    const models = (data.models || []).map(m => m.name);
    console.log('Available models for key:');
    console.log(models);
  } else {
    console.error(await res.text());
  }
}

checkModels().catch(console.error);
