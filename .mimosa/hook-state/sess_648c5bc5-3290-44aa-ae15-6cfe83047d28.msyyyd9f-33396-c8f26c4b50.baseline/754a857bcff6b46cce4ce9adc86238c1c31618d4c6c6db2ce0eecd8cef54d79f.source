import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PAPERS_FILE = path.join(__dirname, '..', 'server', 'data', 'papers.json');

async function syncPassVitianExamTypes() {
  console.log('================================================================');
  console.log('🌐 Fetching PassVitian API paper list to reclassify CAT-1/CAT-2 papers');
  console.log('================================================================\n');

  try {
    const res = await fetch('https://passvitian.in/api/list-papers');
    if (!res.ok) {
      throw new Error(`HTTP ${res.status} ${res.statusText}`);
    }
    const data = await res.json();
    const fetchedPapers = data.papers || [];
    console.log(`Fetched ${fetchedPapers.length} papers from PassVitian API.\n`);

    if (!fs.existsSync(PAPERS_FILE)) {
      console.error(`❌ Papers file not found at ${PAPERS_FILE}`);
      process.exit(1);
    }

    const localPapers = JSON.parse(fs.readFileSync(PAPERS_FILE, 'utf-8'));
    console.log(`Loaded ${localPapers.length} local paper records.\n`);

    // Build URL map from PassVitian papers
    const pvMap = new Map();
    for (const p of fetchedPapers) {
      const u = (p.secure_url || p.url || '').trim().toLowerCase();
      if (u) {
        pvMap.set(u, p);
      }
    }

    let cat1Count = 0;
    let cat2Count = 0;
    let repairedCount = 0;

    for (const paper of localPapers) {
      const u = (paper.url || '').trim().toLowerCase();
      const matchPV = pvMap.get(u);

      let detectedExamType = null;

      if (matchPV) {
        const pType = (matchPV.paperType || '').trim().toUpperCase();
        const pName = (matchPV.paperName || '').trim().toUpperCase();
        const combinedStr = `${pType} ${pName}`;

        if (/\b(CAT[\s\-_]*1|CAT[\s\-_]*I\b|CAT1)\b/.test(combinedStr)) {
          detectedExamType = 'CAT-1';
        } else if (/\b(CAT[\s\-_]*2|CAT[\s\-_]*II\b|CAT2)\b/.test(combinedStr)) {
          detectedExamType = 'CAT-2';
        } else if (pType === 'TEE' || /\bTEE\b/.test(pName)) {
          detectedExamType = 'TEE';
        } else if (pType === 'MTE' || /\bMTE\b/.test(pName)) {
          detectedExamType = 'MTE';
        }
      }

      // Also check local title / fullText
      const localStr = `${paper.courseTitle || ''} ${paper.fullText || ''}`.toUpperCase();
      if (!detectedExamType || detectedExamType === 'MTE') {
        if (/\b(CAT[\s\-_]*1|CAT[\s\-_]*I\b|CAT1)\b/.test(localStr)) {
          detectedExamType = 'CAT-1';
        } else if (/\b(CAT[\s\-_]*2|CAT[\s\-_]*II\b|CAT2)\b/.test(localStr)) {
          detectedExamType = 'CAT-2';
        }
      }

      if (detectedExamType && detectedExamType !== paper.examType) {
        console.log(`  ✅ RECLASSIFIED [${paper.courseCode}]: "${paper.examType}" -> "${detectedExamType}" (PV: "${matchPV?.paperType || ''}" | "${matchPV?.paperName || ''}")`);
        paper.examType = detectedExamType;
        repairedCount++;
      }

      if (paper.examType === 'CAT-1') cat1Count++;
      if (paper.examType === 'CAT-2') cat2Count++;
    }

    // Save updated local papers
    fs.writeFileSync(PAPERS_FILE, JSON.stringify(localPapers, null, 2), 'utf-8');

    console.log('\n================================================================');
    console.log('🎉 RECLASSIFICATION SUMMARY');
    console.log('================================================================');
    console.log(`• Total Papers Examined: ${localPapers.length}`);
    console.log(`• Total Exam Types Repaired: ${repairedCount}`);
    console.log(`• Total CAT-1 Papers: ${cat1Count}`);
    console.log(`• Total CAT-2 Papers: ${cat2Count}`);
    console.log(`• Updated JSON File: server/data/papers.json`);
    console.log('================================================================\n');
  } catch (err) {
    console.error('❌ Error syncing with PassVitian API:', err.message);
  }
}

syncPassVitianExamTypes();
