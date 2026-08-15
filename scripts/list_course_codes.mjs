import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PAPERS_FILE = path.join(__dirname, '..', 'server', 'data', 'papers.json');
const papers = JSON.parse(fs.readFileSync(PAPERS_FILE, 'utf-8'));

const codes = new Set();
for (const p of papers) {
  if (p.courseCode) codes.add(p.courseCode.toUpperCase());
}

console.log(`Unique course codes in dataset (${codes.size}):`);
console.log(Array.from(codes).sort().join(', '));
