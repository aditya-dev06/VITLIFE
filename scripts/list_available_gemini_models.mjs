import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function loadEnv() {
  const envFiles = [
    path.join(__dirname, '..', '.env.local'),
    path.join(__dirname, '..', '.env')
  ];
  for (const envPath of envFiles) {
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf-8');
      envContent.split(/\r?\n/).forEach(line => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
          const firstEqual = trimmed.indexOf('=');
          if (firstEqual !== -1) {
            const key = trimmed.substring(0, firstEqual).trim();
            const val = trimmed.substring(firstEqual + 1).trim().replace(/^['"]|['"]$/g, '');
            if (!process.env[key] || process.env[key] === '[SENSITIVE]') {
              process.env[key] = val;
            }
          }
        }
      });
    }
  }
}

loadEnv();

const apiKey = process.env.Gemini_API_Key || process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_KEY;

async function listModels() {
  console.log('Listing available models for API key...');
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
  console.log('List models HTTP status:', res.status);
  const data = await res.json();
  if (data.models) {
    console.log(`Found ${data.models.length} models:`);
    for (const m of data.models) {
      if (m.supportedGenerationMethods?.includes('generateContent')) {
        console.log(`  - ${m.name} (${m.displayName})`);
      }
    }
  } else {
    console.log('Error/Response:', data);
  }
}

listModels().catch(console.error);
