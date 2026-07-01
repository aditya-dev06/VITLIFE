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
console.log('MONGODB_URI:', MONGODB_URI ? 'FOUND' : 'NOT FOUND');

async function test() {
  if (!MONGODB_URI) {
    const localPath = path.resolve('server/data/papers.json');
    if (fs.existsSync(localPath)) {
      const papers = JSON.parse(fs.readFileSync(localPath, 'utf-8'));
      console.log(`Local papers count: ${papers.length}`);
      const pvPapers = papers.filter(p => p._id.startsWith('pv_'));
      console.log(`PV papers count: ${pvPapers.length}`);
    }
    return;
  }

  const client = new MongoClient(MONGODB_URI);
  try {
    await client.connect();
    console.log('Connected to MongoDB.');
    const db = client.db();
    const count = await db.collection('papers').countDocuments();
    console.log(`Total papers in MongoDB: ${count}`);
    
    const pvCount = await db.collection('papers').countDocuments({ _id: /^pv_/ });
    console.log(`PassVitian papers in MongoDB: ${pvCount}`);

    const sample = await db.collection('papers').find({ _id: /^pv_/ }).limit(1).toArray();
    console.log('Sample PassVitian paper:', JSON.stringify(sample, null, 2));

  } catch (err) {
    console.error('Error during test:', err);
  } finally {
    await client.close();
  }
}

test();
