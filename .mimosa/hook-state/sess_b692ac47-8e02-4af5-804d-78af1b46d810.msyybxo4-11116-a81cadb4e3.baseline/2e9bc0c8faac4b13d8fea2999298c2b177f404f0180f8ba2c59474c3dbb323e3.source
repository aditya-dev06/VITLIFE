import { MongoClient } from 'mongodb';
import fs from 'fs';
import path from 'path';

// Load env variables
const envPath = path.resolve('.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  envContent.split(/\r?\n/).forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const firstEqual = trimmed.indexOf('=');
      if (firstEqual !== -1) {
        const key = trimmed.substring(0, firstEqual).trim();
        const val = trimmed.substring(firstEqual + 1).trim().replace(/^['"]|['"]$/g, '');
        process.env[key] = val;
      }
    }
  });
}

const MONGODB_URI = process.env.MONGODB_URI;

async function check() {
  const client = new MongoClient(MONGODB_URI);
  try {
    await client.connect();
    const db = client.db();
    const count = await db.collection('papers').countDocuments({ _id: /^p_/ });
    console.log('p_ papers count:', count);
    const sample = await db.collection('papers').find({ _id: /^p_/ }).limit(1).toArray();
    console.log('Sample:', JSON.stringify(sample, null, 2));
  } finally {
    await client.close();
  }
}

check();
