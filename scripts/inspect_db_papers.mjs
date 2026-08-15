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

async function inspect() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('No MONGODB_URI found in env');
    return;
  }
  console.log('Connecting to MongoDB...');
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db(process.env.MONGODB_DB_NAME || 'vitlife');
  const count = await db.collection('papers').countDocuments();
  console.log(`Total papers in MongoDB: ${count}`);

  const papers = await db.collection('papers').find({}).limit(5).toArray();
  console.log('Sample MongoDB paper:', JSON.stringify(papers[0], null, 2));

  // Check how many have missing or incomplete metadata
  const missingCode = await db.collection('papers').countDocuments({ $or: [{ courseCode: 'UNKNOWN' }, { courseCode: { $exists: false } }, { courseCode: '' }] });
  const missingTitle = await db.collection('papers').countDocuments({ $or: [{ courseTitle: 'Unknown' }, { courseTitle: { $exists: false } }, { courseTitle: '' }, { courseTitle: 'Scanned Question Paper' }] });
  const missingFullText = await db.collection('papers').countDocuments({ $or: [{ fullText: { $exists: false } }, { fullText: '' }, { fullText: null }] });
  const shortFullText = await db.collection('papers').countDocuments({ $expr: { $lt: [{ $strLenCP: { $ifNull: ["$fullText", ""] } }, 50] } });

  console.log(`\nMetadata Audit in Database:`);
  console.log(`- Missing / Unknown Course Code: ${missingCode}`);
  console.log(`- Missing / Generic Course Title: ${missingTitle}`);
  console.log(`- Missing FullText (No OCR): ${missingFullText}`);
  console.log(`- Short/Incomplete FullText (<50 chars): ${shortFullText}`);

  await client.close();
}

inspect().catch(console.error);
