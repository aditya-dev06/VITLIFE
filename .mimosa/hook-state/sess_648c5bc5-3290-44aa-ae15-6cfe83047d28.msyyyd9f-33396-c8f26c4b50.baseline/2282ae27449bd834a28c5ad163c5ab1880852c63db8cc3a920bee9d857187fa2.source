import { MongoClient } from 'mongodb';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { scanCollegeInboxAndIngest, parseEmailToCardPayload } from '../server/services/emailPipeline.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.join(path.dirname(__dirname), '.env');

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  envContent.split(/\r?\n/).forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const idx = trimmed.indexOf('=');
      if (idx !== -1) {
        const key = trimmed.substring(0, idx).trim();
        const val = trimmed.substring(idx + 1).trim().replace(/^["']|["']$/g, '');
        if (key && !process.env[key]) {
          process.env[key] = val;
        }
      }
    }
  });
}

const MONGODB_URI = process.env.MONGODB_URI;

async function run() {
  console.log('====================================================');
  console.log('🚀 AUTOMATED COLLEGE EMAIL EVENT & OPPORTUNITY PIPELINE');
  console.log('====================================================');

  let client;
  let db;

  if (MONGODB_URI) {
    try {
      client = new MongoClient(MONGODB_URI);
      await client.connect();
      db = client.db();
      console.log('✅ Connected to MongoDB Atlas successfully.');
    } catch (err) {
      console.error('❌ Failed to connect to MongoDB:', err.message);
    }
  } else {
    console.warn('⚠️ MONGODB_URI not configured in .env. Test mode execution.');
  }

  // Check if a sample payload argument was passed
  const testArg = process.argv.find(arg => arg.startsWith('--test-email='));

  if (testArg) {
    const rawText = testArg.split('=')[1] || '';
    console.log('\n🧪 Running Test Extraction on Provided Payload...');
    const card = parseEmailToCardPayload(
      'Announcement: IEEE Student Recruitment & Hackathon 2026',
      rawText || 'Register now for the IEEE Hackathon at LHC-102. Fill Google form: https://forms.gle/sampleLink2026',
      '',
      'ieee@vitbhopal.ac.in'
    );
    console.log('\n✨ Extracted Live Card Result:');
    console.dir(card, { depth: null });
  } else {
    // Run direct IMAP Inbox fetch
    const result = await scanCollegeInboxAndIngest(db);
    console.log('\n📊 Pipeline Result:', result);
  }

  if (client) {
    await client.close();
  }

  console.log('====================================================');
  console.log('🏁 Pipeline execution finished.');
  console.log('====================================================');
  process.exit(0);
}

run().catch(err => {
  console.error('Fatal Pipeline Execution Error:', err);
  process.exit(1);
});
