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

async function testGemini() {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
  const payload = {
    contents: [
      {
        parts: [{ text: 'Solve in 2 sentences: What is the Shannon Capacity Theorem in Computer Networks?' }]
      }
    ]
  };

  const start = Date.now();
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  const duration = Date.now() - start;
  const data = await res.json();
  console.log(`Status: ${res.status} in ${duration}ms`);
  console.log('Result:', data.candidates?.[0]?.content?.parts?.[0]?.text);
}

testGemini().catch(console.error);
