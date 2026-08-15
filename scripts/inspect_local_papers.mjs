import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PAPERS_FILE = path.join(__dirname, '..', 'server', 'data', 'papers.json');

const papers = JSON.parse(fs.readFileSync(PAPERS_FILE, 'utf-8'));
console.log(`Total papers in server/data/papers.json: ${papers.length}`);

let missingCode = 0;
let genericTitle = 0;
let missingFullText = 0;
let hasFullText = 0;
let examTypes = {};

for (const p of papers) {
  if (!p.courseCode || p.courseCode === 'UNKNOWN') missingCode++;
  if (!p.courseTitle || p.courseTitle.toLowerCase().includes('scanned') || p.courseTitle === 'Unknown') genericTitle++;
  if (!p.fullText || p.fullText.length < 50) missingFullText++;
  else hasFullText++;

  const et = p.examType || 'UNKNOWN';
  examTypes[et] = (examTypes[et] || 0) + 1;
}

console.log(`\nAudit of server/data/papers.json:`);
console.log(`- Total: ${papers.length}`);
console.log(`- Papers with FullText (Already OCR'd): ${hasFullText}`);
console.log(`- Papers missing/short FullText: ${missingFullText}`);
console.log(`- Papers with generic title: ${genericTitle}`);
console.log(`- Papers with missing course code: ${missingCode}`);
console.log(`- Exam Types distribution:`, examTypes);
console.log(`\nSample paper:`, JSON.stringify(papers[0], null, 2));
