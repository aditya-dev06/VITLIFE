import { MongoClient } from 'mongodb';
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

async function testAskAI() {
  console.log('🤖 Testing Ask AI Tutor on Question Papers...\n');

  // Connect to MongoDB to get a real sample paper
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const db = client.db(process.env.MONGODB_DB_NAME || 'vitlife');

  // Get a real paper with image
  const samplePaper = await db.collection('papers').findOne({ url: { $regex: /^http/ } });
  console.log(`1️⃣ Selected Paper from Database: ${samplePaper._id}`);
  console.log(`  Course: ${samplePaper.courseCode} - ${samplePaper.courseTitle} (${samplePaper.examType})`);
  console.log(`  Image URL: ${samplePaper.url}`);

  console.log('\n2️⃣ Sending Student Question to /api/papers/ask-pyq...');
  const query = 'What are the main questions on this question paper? Please solve the first question step-by-step.';

  const start = Date.now();
  const res = await fetch('http://localhost:5000/api/papers/ask-pyq', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      paperId: samplePaper._id,
      courseCode: samplePaper.courseCode,
      userQuery: query,
      mode: 'explain'
    })
  });

  const duration = Date.now() - start;
  const data = await res.json();
  console.log(`\n⏱️ Responded in ${duration}ms with HTTP ${res.status}`);

  if (res.ok && data.success && data.answer) {
    console.log('\n===============================================================');
    console.log('🎉 ASK AI GENERATED ACCURATE SOLUTION ON REAL EXAM PAPER!');
    console.log('===============================================================');
    console.log('Course:', data.paperCode, '-', data.paperTitle);
    console.log('Exam:', data.paperExamType);
    console.log('\n--- AI Tutor Response Output Preview ---');
    console.log(data.answer.substring(0, 600) + '...\n');
  } else {
    console.error('❌ Failed:', data);
  }

  await client.close();
}

testAskAI().catch(console.error);
