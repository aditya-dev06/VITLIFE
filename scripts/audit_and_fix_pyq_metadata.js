import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read .env and .env.local files directly
function loadEnv() {
  const envFiles = [
    path.join(__dirname, '..', '.env.local'),
    path.join(__dirname, '..', '.env')
  ];
  for (const envPath of envFiles) {
    if (fs.existsSync(envPath)) {
      const envLines = fs.readFileSync(envPath, 'utf-8').split('\n');
      for (const line of envLines) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
          const [key, ...vals] = trimmed.split('=');
          const val = vals.join('=').trim().replace(/^["']|["']$/g, '');
          if (key && !process.env[key.trim()]) {
            process.env[key.trim()] = val;
          }
        }
      }
    }
  }
}

loadEnv();

const PAPERS_FILE = path.join(__dirname, '..', 'server', 'data', 'papers.json');

// Gemini API Key lookup
const apiKey = process.env.Gemini_API_Key || process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_KEY;

if (!apiKey) {
  console.error('❌ ERROR: Gemini API key environment variable is not set.');
  process.exit(1);
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Call Gemini 2.5 Flash / Flash-Latest Vision API with retries & rate limiting
 */
async function callGeminiVision(base64Data, mimeType, maxRetries = 5) {
  const payload = {
    contents: [
      {
        parts: [
          {
            inlineData: {
              mimeType,
              data: base64Data
            }
          },
          {
            text: `You are a precise university exam question paper metadata auditor. Read the document image header and text carefully.
Return ONLY a raw valid JSON object (no markdown formatting, no backticks) with these exact fields:
{
  "courseCode": "The subject/course code if visible (e.g. MAT2005, CSE2001, ECE3004), or 'UNKNOWN'",
  "courseTitle": "The full subject/course title if visible, or 'UNKNOWN'",
  "examType": "CAT-1 if header states CAT-1 / CAT 1 / CAT-I / Continuous Assessment Test 1. CAT-2 if header states CAT-2 / CAT 2 / Continuous Assessment Test 2. MTE if header states Mid Term Exam / MTE. TEE if header states Term End Exam / TEE. Otherwise 'UNKNOWN'",
  "year": "Academic year if visible (e.g. 2025-26, 2024-25), or 'UNKNOWN'",
  "month": "Short month if visible (e.g. Jul, Nov, Dec, May), or null",
  "semester": 0,
  "fullText": "Complete verbatim text extracted from the document including questions and numbers"
}`
          }
        ]
      }
    ],
    generationConfig: {
      responseMimeType: "application/json",
      temperature: 0.05
    }
  };

  const candidateEndpoints = [
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`,
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=${apiKey}`
  ];

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    for (const endpoint of candidateEndpoints) {
      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (response.ok) {
          const resData = await response.json();
          const jsonText = resData.candidates?.[0]?.content?.parts?.[0]?.text;
          if (jsonText) {
            return JSON.parse(jsonText);
          }
        } else if (response.status === 429) {
          const backoff = (attempt + 1) * 5000;
          console.warn(`  ⚠️ Rate limited (HTTP 429). Waiting ${backoff / 1000}s (Attempt ${attempt + 1}/${maxRetries})...`);
          await sleep(backoff);
          break; // Try next attempt loop
        } else {
          const errBody = await response.text();
          console.warn(`  ⚠️ Endpoint error (${response.status}): ${errBody.substring(0, 100)}`);
        }
      } catch (e) {
        console.warn(`  ⚠️ Fetch exception: ${e.message}`);
      }
    }
  }
  return null;
}

/**
 * Download paper image from URL and convert to Base64
 */
async function fetchPaperImageBase64(paperUrl) {
  try {
    let url = paperUrl;
    if (url.startsWith('/uploads/')) {
      const baseUploadsDir = path.resolve(__dirname, '..', 'server', 'uploads');
      const safeFilename = path.basename(url.replace(/\\/g, '/'));
      const localPath = path.resolve(baseUploadsDir, safeFilename);
      if (localPath.startsWith(baseUploadsDir) && fs.existsSync(localPath)) {
        const fileBuffer = fs.readFileSync(localPath);
        const ext = path.extname(localPath).toLowerCase();
        const mimeType = ext === '.pdf' ? 'application/pdf' : (ext === '.png' ? 'image/png' : 'image/jpeg');
        return { base64: fileBuffer.toString('base64'), mimeType };
      }
      return null;
    }

    if (!url.startsWith('https://') && !url.startsWith('http://')) {
      return null;
    }

    const res = await fetch(url);
    if (!res.ok) return null;
    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const contentType = res.headers.get('content-type') || 'image/jpeg';
    return { base64: buffer.toString('base64'), mimeType: contentType };
  } catch (e) {
    console.error(`  ❌ Failed to download paper image (${paperUrl}):`, e.message);
    return null;
  }
}

async function auditAndFixPYQMetadata() {
  console.log('================================================================');
  console.log('🔍 Rate-Limit Resilient Direct Gemini Vision Audit on PYQs');
  console.log('================================================================\n');

  if (!fs.existsSync(PAPERS_FILE)) {
    console.error(`❌ Papers file not found at ${PAPERS_FILE}`);
    process.exit(1);
  }

  const papers = JSON.parse(fs.readFileSync(PAPERS_FILE, 'utf-8'));
  console.log(`Loaded ${papers.length} paper records from server/data/papers.json.\n`);

  let scannedCount = 0;
  let skippedCount = 0;
  let successCount = 0;
  let reclassifiedCatCount = 0;
  let metadataFixedCount = 0;

  for (let i = 0; i < papers.length; i++) {
    const paper = papers[i];

    // Skip papers that ALREADY have extracted fullText (>100 chars)
    if (paper.fullText && paper.fullText.length > 100) {
      skippedCount++;
      continue;
    }

    scannedCount++;
    console.log(`[${i + 1}/${papers.length}] Auditing paper: ${paper._id || paper.courseCode} (${paper.courseCode} - ${paper.examType || 'UNKNOWN'})...`);

    if (!paper.url) {
      console.warn(`  ⚠️ Skipping paper ${paper._id}: No image URL.`);
      continue;
    }

    // Rate-limiting delay: 4.2 seconds between calls (staying strictly under 14 RPM)
    await sleep(4200);

    const imgData = await fetchPaperImageBase64(paper.url);
    if (!imgData) {
      console.warn(`  ⚠️ Unable to retrieve image buffer for ${paper.url}`);
      continue;
    }

    const ocrResult = await callGeminiVision(imgData.base64, imgData.mimeType);
    if (!ocrResult) {
      console.warn(`  ❌ Vision OCR failed for ${paper._id}`);
      continue;
    }

    successCount++;
    let updated = false;
    const diffs = [];

    // 1. Check CAT-1 / CAT-2 vs MTE reclassification
    if (ocrResult.examType && ocrResult.examType !== 'UNKNOWN') {
      const detectedExamType = ocrResult.examType.toUpperCase();
      if ((detectedExamType === 'CAT-1' || detectedExamType === 'CAT-2') && paper.examType === 'MTE') {
        diffs.push(`examType: "${paper.examType}" -> "${detectedExamType}"`);
        paper.examType = detectedExamType;
        reclassifiedCatCount++;
        updated = true;
      } else if (detectedExamType !== paper.examType && (detectedExamType === 'CAT-1' || detectedExamType === 'CAT-2' || detectedExamType === 'TEE' || detectedExamType === 'MTE')) {
        diffs.push(`examType: "${paper.examType}" -> "${detectedExamType}"`);
        paper.examType = detectedExamType;
        updated = true;
      }
    }

    // 2. Check courseCode mismatch
    if (ocrResult.courseCode && ocrResult.courseCode !== 'UNKNOWN') {
      const cleanCode = ocrResult.courseCode.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
      if (cleanCode && cleanCode !== paper.courseCode && /^[A-Z]{3,4}\d{3,4}$/.test(cleanCode)) {
        diffs.push(`courseCode: "${paper.courseCode}" -> "${cleanCode}"`);
        paper.courseCode = cleanCode;
        updated = true;
      }
    }

    // 3. Check courseTitle correction if stored title is generic or missing
    if (ocrResult.courseTitle && ocrResult.courseTitle !== 'UNKNOWN' && ocrResult.courseTitle.length > 3) {
      const cleanTitle = ocrResult.courseTitle.trim();
      if (!paper.courseTitle || paper.courseTitle.toLowerCase() === 'scanned question paper' || paper.courseTitle.toLowerCase() === paper.courseCode.toLowerCase()) {
        diffs.push(`courseTitle: "${paper.courseTitle || ''}" -> "${cleanTitle}"`);
        paper.courseTitle = cleanTitle;
        updated = true;
      }
    }

    // 4. Update fullText if missing
    if (ocrResult.fullText && ocrResult.fullText.length > 10) {
      paper.fullText = ocrResult.fullText;
      updated = true;
    }

    if (updated) {
      metadataFixedCount++;
      console.log(`  ✅ UPDATED [${paper.courseCode}]: ${diffs.join(' | ')}`);
      // Save progressively after each update
      fs.writeFileSync(PAPERS_FILE, JSON.stringify(papers, null, 2), 'utf-8');
    } else {
      console.log(`  ✓ Verified matching: ${paper.courseCode} (${paper.examType})`);
    }
  }

  // Final save
  fs.writeFileSync(PAPERS_FILE, JSON.stringify(papers, null, 2), 'utf-8');

  console.log('\n================================================================');
  console.log('🎉 AUDIT COMPLETE — PYQ METADATA RE-EXTRACTION REPORT');
  console.log('================================================================');
  console.log(`• Previously Extracted (Skipped): ${skippedCount}`);
  console.log(`• Remaining Papers Scanned: ${scannedCount}`);
  console.log(`• Vision OCR Successes: ${successCount}`);
  console.log(`• CAT-1 / CAT-2 Reclassifications: ${reclassifiedCatCount}`);
  console.log(`• Total Records Repaired & Updated: ${metadataFixedCount}`);
  console.log(`• Updated JSON File: server/data/papers.json`);
  console.log('================================================================\n');
}

auditAndFixPYQMetadata().catch((err) => {
  console.error('Fatal audit error:', err);
  process.exit(1);
});
