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

const PAPERS_FILE = path.join(__dirname, '..', 'server', 'data', 'papers.json');
const apiKey = process.env.Gemini_API_Key || process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_KEY;

if (!apiKey) {
  console.error('❌ Gemini API key missing.');
  process.exit(1);
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function callGeminiVision(base64Data, mimeType, maxRetries = 3) {
  const payload = {
    contents: [
      {
        parts: [
          { inlineData: { mimeType, data: base64Data } },
          {
            text: `You are a precise university exam question paper OCR text extraction engine. Extract ALL visible text, questions, and markings from this paper.
Return ONLY valid JSON:
{
  "courseCode": "Course code if visible, or UNKNOWN",
  "courseTitle": "Course title if visible, or UNKNOWN",
  "examType": "CAT-1, CAT-2, MTE, or TEE",
  "year": "Academic year (e.g. 2026-27)",
  "month": "Month if visible (e.g. August, July)",
  "fullText": "Complete extracted questions and text"
}`
          }
        ]
      }
    ],
    generationConfig: { responseMimeType: "application/json", temperature: 0.05 }
  };

  const endpoints = [
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`
  ];

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    for (const ep of endpoints) {
      try {
        const res = await fetch(ep, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (res.ok) {
          const data = await res.json();
          let txt = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (txt) {
            txt = txt.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
            return JSON.parse(txt);
          }
        } else if (res.status === 429) {
          const wait = (attempt + 1) * 4000;
          console.warn(`  ⚠️ Rate limit 429. Sleeping ${wait / 1000}s...`);
          await sleep(wait);
          break;
        }
      } catch (e) {
        // continue to next endpoint
      }
    }
  }
  return null;
}

async function fetchImageBase64(url) {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const contentType = res.headers.get('content-type') || 'image/jpeg';
    return { base64: buffer.toString('base64'), mimeType: contentType };
  } catch (e) {
    return null;
  }
}

async function runOCRBatch() {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const db = client.db(process.env.MONGODB_DB_NAME || 'vitlife');
  const papersCol = db.collection('papers');

  // Find papers needing OCR
  const pendingPapers = await papersCol.find({
    $or: [{ fullText: { $exists: false } }, { fullText: '' }, { fullText: null }, { fullText: { $regex: /^.{0,50}$/ } }]
  }).toArray();

  console.log(`📑 Found ${pendingPapers.length} papers in MongoDB Atlas needing OCR text extraction.`);

  let processed = 0;
  let success = 0;

  for (const paper of pendingPapers) {
    processed++;
    console.log(`[${processed}/${pendingPapers.length}] Extracting OCR for ${paper._id} (${paper.courseCode} - ${paper.examType})...`);

    const img = await fetchImageBase64(paper.url);
    if (!img) {
      console.warn(`  ⚠️ Could not download image for ${paper._id}`);
      continue;
    }

    const ocr = await callGeminiVision(img.base64, img.mimeType);
    if (ocr && ocr.fullText && ocr.fullText.length > 20) {
      success++;
      const updates = { fullText: ocr.fullText };
      if (ocr.courseTitle && ocr.courseTitle !== 'UNKNOWN' && ocr.courseTitle.length > paper.courseTitle.length) {
        updates.courseTitle = ocr.courseTitle;
      }
      if (ocr.month && ocr.month !== 'UNKNOWN') {
        updates.month = ocr.month;
      }
      if (ocr.year && ocr.year !== 'UNKNOWN') {
        updates.year = ocr.year;
      }

      await papersCol.updateOne({ _id: paper._id }, { $set: updates });
      console.log(`  ✅ Extracted ${ocr.fullText.length} chars text & updated DB.`);
    } else {
      console.log(`  ℹ️ OCR empty or unreadable.`);
    }

    // Rate-limit buffer (stay under 15 RPM)
    await sleep(4000);
  }

  // Update local papers.json backup
  const allFinalPapers = await papersCol.find({}).toArray();
  fs.writeFileSync(PAPERS_FILE, JSON.stringify(allFinalPapers, null, 2), 'utf-8');
  console.log(`🎉 Batch OCR complete! Updated ${success}/${processed} papers in MongoDB Atlas.`);

  await client.close();
}

runOCRBatch().catch(console.error);
