import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PAPERS_FILE = path.join(__dirname, '..', 'server', 'data', 'papers.json');

function auditAndFixPYQDeterministic() {
  console.log('================================================================');
  console.log('🔍 Starting Deterministic PYQ Audit & CAT-1 Reclassification');
  console.log('================================================================\n');

  if (!fs.existsSync(PAPERS_FILE)) {
    console.error(`❌ Papers file not found at ${PAPERS_FILE}`);
    process.exit(1);
  }

  const papers = JSON.parse(fs.readFileSync(PAPERS_FILE, 'utf-8'));
  console.log(`Loaded ${papers.length} paper records from server/data/papers.json.\n`);

  let cat1Count = 0;
  let cat2Count = 0;
  let mteCount = 0;
  let teeCount = 0;
  let fixedCount = 0;

  for (let i = 0; i < papers.length; i++) {
    const paper = papers[i];
    let updated = false;
    const diffs = [];

    const fullText = (paper.fullText || '').toLowerCase();
    const title = (paper.courseTitle || '').toLowerCase();
    const urlStr = (paper.url || '').toLowerCase();
    const code = (paper.courseCode || '').toUpperCase().replace(/[^A-Z0-9]/g, '');

    // 1. Course Code Sanitization
    if (code !== paper.courseCode) {
      diffs.push(`courseCode: "${paper.courseCode}" -> "${code}"`);
      paper.courseCode = code;
      updated = true;
    }

    // 2. Exam Type Reclassification (Detect CAT-1, CAT-2, MTE, TEE)
    const combinedStr = `${fullText} ${title} ${urlStr}`;

    const isCat1 = /\b(cat[\s\-_]*1|cat[\s\-_]*i\b|continuous[\s\-_]*assessment[\s\-_]*test[\s\-_]*1)\b/i.test(combinedStr);
    const isCat2 = /\b(cat[\s\-_]*2|cat[\s\-_]*ii\b|continuous[\s\-_]*assessment[\s\-_]*test[\s\-_]*2)\b/i.test(combinedStr);
    const isTee = /\b(tee|term[\s\-_]*end)\b/i.test(combinedStr);

    let targetExamType = paper.examType || 'MTE';

    if (isCat1 && targetExamType !== 'CAT-1') {
      targetExamType = 'CAT-1';
    } else if (isCat2 && targetExamType !== 'CAT-2') {
      targetExamType = 'CAT-2';
    } else if (isTee && targetExamType === 'MTE' && !isCat1 && !isCat2) {
      targetExamType = 'TEE';
    }

    if (targetExamType !== paper.examType) {
      diffs.push(`examType: "${paper.examType}" -> "${targetExamType}"`);
      paper.examType = targetExamType;
      updated = true;
    }

    // Tally stats
    if (paper.examType === 'CAT-1') cat1Count++;
    else if (paper.examType === 'CAT-2') cat2Count++;
    else if (paper.examType === 'TEE') teeCount++;
    else mteCount++;

    if (updated) {
      fixedCount++;
      console.log(`  ✅ REPAIRED [${paper.courseCode}]: ${diffs.join(' | ')}`);
    }
  }

  // Save back to papers.json
  fs.writeFileSync(PAPERS_FILE, JSON.stringify(papers, null, 2), 'utf-8');

  console.log('\n================================================================');
  console.log('🎉 AUDIT COMPLETE — DETERMINISTIC PYQ SUMMARY REPORT');
  console.log('================================================================');
  console.log(`• Total Papers Processed: ${papers.length}`);
  console.log(`• Total Records Repaired: ${fixedCount}`);
  console.log(`• CAT-1 Papers: ${cat1Count}`);
  console.log(`• CAT-2 Papers: ${cat2Count}`);
  console.log(`• MTE Papers:   ${mteCount}`);
  console.log(`• TEE Papers:   ${teeCount}`);
  console.log(`• Updated JSON File: server/data/papers.json`);
  console.log('================================================================\n');
}

auditAndFixPYQDeterministic();
