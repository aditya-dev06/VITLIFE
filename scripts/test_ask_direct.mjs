import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function testAskDirect() {
  console.log('Sending request to /api/papers/ask-pyq...');
  const start = Date.now();
  const res = await fetch('http://localhost:5000/api/papers/ask-pyq', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      courseCode: 'CSE3006',
      userQuery: 'What is the difference between TCP and UDP? Explain in 2 bullet points.',
      mode: 'explain'
    })
  });

  const duration = Date.now() - start;
  console.log(`HTTP Status: ${res.status} in ${duration}ms`);
  const data = await res.json();
  console.log('Success:', data.success);
  console.log('Course:', data.paperCode, '-', data.paperTitle);
  console.log('AI Answer:\n', data.answer);
}

testAskDirect().catch(console.error);
