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

async function run() {
  const client = new MongoClient(MONGODB_URI);
  try {
    await client.connect();
    const db = client.db();
    const papers = await db.collection('papers').find().toArray();
    console.log('Total papers:', papers.length);
    
    const uploaderCounts = {};
    papers.forEach(p => {
      uploaderCounts[p.uploadedBy] = (uploaderCounts[p.uploadedBy] || 0) + 1;
    });
    console.log('Uploader counts:', uploaderCounts);
    
    // Find admin emails or papers created by admin
    // Let's check users collection to find who the admin is
    const admins = await db.collection('users').find({ role: 'admin' }).toArray();
    const adminEmails = admins.map(u => u.email);
    console.log('Admin emails:', adminEmails);
    
    // Let's delete papers where uploadedBy matches admin emails
    if (adminEmails.length > 0) {
      const deleteResult = await db.collection('papers').deleteMany({ uploadedBy: { $in: adminEmails } });
      console.log('Deleted papers by admin:', deleteResult.deletedCount);
    }
    
    // Also check if there's any paper with uploadedBy: 'admin@vitbhopal.edu' or 'admin@example.com' or literal 'Admin'
    const fallbackAdmins = ['admin@example.com', 'admin@vitbhopal.edu', 'admin@gmail.com', 'Admin'];
    const deleteResult2 = await db.collection('papers').deleteMany({ uploadedBy: { $in: fallbackAdmins } });
    console.log('Deleted papers by fallback admins:', deleteResult2.deletedCount);
    
  } finally {
    await client.close();
  }
}

run();
