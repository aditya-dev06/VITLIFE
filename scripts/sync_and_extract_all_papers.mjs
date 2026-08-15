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

// Course Catalog Mapping for clean, canonical course titles & departments
const COURSE_CATALOG = {
  'CSE3006': { title: 'Computer Networks', dept: 'CSE' },
  'PLA1004': { title: 'Competitive Coding Practices', dept: 'CSE' },
  'PLA1006': { title: 'Aptitude and Logical Reasoning', dept: 'General' },
  'ECE2002': { title: 'Digital Logic Design', dept: 'ECE' },
  'CSE3011': { title: 'Python Programming', dept: 'CSE' },
  'CHY1006': { title: 'Environmental Sustainability', dept: 'Chemistry' },
  'CHY1001': { title: 'Engineering Chemistry', dept: 'Chemistry' },
  'MAT3002': { title: 'Applied Linear Algebra', dept: 'Mathematics' },
  'MAT2001': { title: 'Statistics for Engineers', dept: 'Mathematics' },
  'MAT2002': { title: 'Discrete Mathematics and Graph Theory', dept: 'Mathematics' },
  'MAT1001': { title: 'Calculus and Linear Algebra', dept: 'Mathematics' },
  'MAT2003': { title: 'Differential Equations and Transforms', dept: 'Mathematics' },
  'MAT2004': { title: 'Operations Research', dept: 'Mathematics' },
  'MAT2005': { title: 'Numerical Methods for Engineers', dept: 'Mathematics' },
  'MAT3003': { title: 'Complex Variables and Linear Algebra', dept: 'Mathematics' },
  'MAT3004': { title: 'Probability and Stochastic Processes', dept: 'Mathematics' },
  'CSE2001': { title: 'Computer Architecture and Organization', dept: 'CSE' },
  'CSE2002': { title: 'Data Structures and Algorithms', dept: 'CSE' },
  'CSE2003': { title: 'Object Oriented Programming', dept: 'CSE' },
  'CSE2004': { title: 'Database Management Systems', dept: 'CSE' },
  'CSE2006': { title: 'Microprocessor and Interfacing', dept: 'CSE' },
  'CSE3001': { title: 'Software Engineering', dept: 'CSE' },
  'CSE3003': { title: 'Operating Systems', dept: 'CSE' },
  'CSE3004': { title: 'Design and Analysis of Algorithms', dept: 'CSE' },
  'CSE3007': { title: 'Theory of Computation', dept: 'CSE' },
  'CSE3010': { title: 'Cloud Computing and Security', dept: 'CSE' },
  'CSE3015': { title: 'Cryptography and Network Security', dept: 'CSE' },
  'CSE3016': { title: 'Artificial Intelligence', dept: 'AI' },
  'CSE3017': { title: 'Machine Learning', dept: 'AI' },
  'CSE4003': { title: 'Big Data Analytics', dept: 'CSE' },
  'ECE3004': { title: 'Microprocessors and Microcontrollers', dept: 'ECE' },
  'ECE3005': { title: 'Signals and Systems', dept: 'ECE' },
  'ECE4006': { title: 'VLSI Design', dept: 'ECE' },
  'EEE1001': { title: 'Basic Electrical and Electronics Engineering', dept: 'EEE' },
  'PHY1001': { title: 'Engineering Physics', dept: 'Physics' },
  'PHY1003': { title: 'Physics for Information Sciences', dept: 'Physics' },
  'ENG1004': { title: 'Effective Technical Communication', dept: 'Humanities' },
  'ENG2005': { title: 'Advanced English Communication', dept: 'Humanities' },
  'HUM1002': { title: 'Ethics and Values', dept: 'Humanities' },
  'UHV0001': { title: 'Universal Human Values', dept: 'Humanities' },
  'MGT1002': { title: 'Principles of Management', dept: 'Management' }
};

// Helper: infer department from course code
function getDeptFromCode(code) {
  if (!code) return 'General';
  const prefix = code.substring(0, 3).toUpperCase();
  if (prefix === 'CSE' || prefix === 'CSA' || prefix === 'CSD' || prefix === 'CSG') return 'CSE';
  if (prefix === 'ECE' || prefix === 'EAC') return 'ECE';
  if (prefix === 'MAT') return 'Mathematics';
  if (prefix === 'PHY') return 'Physics';
  if (prefix === 'CHY') return 'Chemistry';
  if (prefix === 'BIO' || prefix === 'BMT') return 'BioTech';
  if (prefix === 'MEE' || prefix === 'MEA') return 'Mechanical';
  if (prefix === 'EEE') return 'EEE';
  if (prefix === 'MCA') return 'MCA';
  if (prefix === 'ENG' || prefix === 'HUM' || prefix === 'UHV' || prefix === 'SST') return 'Humanities';
  if (prefix === 'PLA') return 'General';
  return 'Engineering';
}

// Helper: infer semester from course code
function getSemesterFromCode(code) {
  if (!code) return 1;
  const match = code.match(/\d/);
  if (!match) return 1;
  const level = parseInt(match[0], 10);
  if (level === 1) return 1;
  if (level === 2) return 3;
  if (level === 3) return 5;
  if (level === 4) return 7;
  return 1;
}

// Helper: normalize exam type
function normalizeExamType(raw) {
  if (!raw) return 'CAT-1';
  const str = raw.toString().toUpperCase().trim();
  if (str.includes('CAT 1') || str.includes('CAT-1') || str.includes('CAT1') || str.includes('CAT-I') || str.includes('CAT I')) return 'CAT-1';
  if (str.includes('CAT 2') || str.includes('CAT-2') || str.includes('CAT2') || str.includes('CAT-II') || str.includes('CAT II')) return 'CAT-2';
  if (str.includes('TEE') || str.includes('TERM END') || str.includes('FAT') || str.includes('FINAL')) return 'TEE';
  if (str.includes('MID') || str.includes('MTE')) return 'MTE';
  return 'CAT-1';
}

// Helper: extract month from date string
function getMonthFromDateStr(dateStr) {
  if (!dateStr) return null;
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const shortMonths = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  
  for (let i = 0; i < months.length; i++) {
    if (dateStr.toLowerCase().includes(months[i].toLowerCase()) || dateStr.toLowerCase().includes(shortMonths[i].toLowerCase())) {
      return months[i];
    }
  }

  // Check YYYY-MM-DD
  const m = dateStr.match(/^\d{4}-(\d{2})-\d{2}/);
  if (m) {
    const monthNum = parseInt(m[1], 10);
    if (monthNum >= 1 && monthNum <= 12) {
      return months[monthNum - 1];
    }
  }
  return null;
}

async function main() {
  console.log('===============================================================');
  console.log('🚀 VIT LIFE: FULL PYQ METADATA EXTRACTION & MONGODB SYNC ENGINE');
  console.log('===============================================================\n');

  // 1. Fetch all upstream papers
  console.log('1️⃣ Fetching complete upstream papers catalog...');
  let upstreamPapers = [];
  try {
    const res = await fetch('https://passvitian.in/api/list-papers');
    if (res.ok) {
      const data = await res.json();
      upstreamPapers = data.papers || [];
      console.log(`  ✅ Fetched ${upstreamPapers.length} papers from remote API.`);
    }
  } catch (e) {
    console.warn(`  ⚠️ Remote API fetch warning: ${e.message}`);
  }

  // 2. Load existing local papers.json
  let localPapers = [];
  if (fs.existsSync(PAPERS_FILE)) {
    try {
      localPapers = JSON.parse(fs.readFileSync(PAPERS_FILE, 'utf-8'));
      console.log(`  ✅ Loaded ${localPapers.length} local papers from papers.json.`);
    } catch (e) {}
  }

  // Map of URL -> existing paper
  const paperByUrl = new Map();
  for (const p of localPapers) {
    if (p.url) paperByUrl.set(p.url.toLowerCase().trim(), p);
  }

  const allMergedPapers = [];
  const processedUrls = new Set();

  // 3. Normalize & merge upstream papers
  for (const raw of upstreamPapers) {
    const url = (raw.secure_url || raw.url || '').trim();
    if (!url) continue;
    const urlKey = url.toLowerCase();
    if (processedUrls.has(urlKey)) continue;
    processedUrls.add(urlKey);

    const existing = paperByUrl.get(urlKey) || {};
    const code = (raw.subjectCode || existing.courseCode || 'UNKNOWN').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    const catalogEntry = COURSE_CATALOG[code] || {};
    
    const title = (raw.subjectName && raw.subjectName.length > 3)
      ? raw.subjectName.trim()
      : (catalogEntry.title || existing.courseTitle || code);

    const examType = normalizeExamType(raw.paperType || existing.examType);
    const dateStr = raw.paperName || existing.createdAt || '2026-08-14';
    const month = getMonthFromDateStr(dateStr) || existing.month || 'August';
    const year = dateStr.startsWith('2026') ? '2026-27' : (existing.year || '2025-26');
    const department = catalogEntry.dept || getDeptFromCode(code) || existing.department || 'CSE';
    const semester = catalogEntry.semester || existing.semester || getSemesterFromCode(code);

    const cleanPaper = {
      _id: existing._id || `p_${raw.id || crypto.randomUUID().substring(0, 16)}`,
      courseCode: code,
      courseTitle: title,
      department: department,
      examType: examType,
      year: year,
      month: month,
      semester: semester,
      url: url,
      fullText: existing.fullText || '',
      uploadedBy: 'Community',
      status: 'approved',
      createdAt: existing.createdAt || new Date().toISOString()
    };

    allMergedPapers.push(cleanPaper);
  }

  // Also include any local-only papers that weren't in upstream
  for (const localP of localPapers) {
    if (localP.url && !processedUrls.has(localP.url.toLowerCase().trim())) {
      processedUrls.add(localP.url.toLowerCase().trim());
      const code = (localP.courseCode || 'UNKNOWN').trim().toUpperCase();
      const catalogEntry = COURSE_CATALOG[code] || {};
      allMergedPapers.push({
        ...localP,
        courseCode: code,
        courseTitle: catalogEntry.title || localP.courseTitle || code,
        department: catalogEntry.dept || getDeptFromCode(code) || localP.department || 'CSE',
        uploadedBy: 'Community',
        status: 'approved'
      });
    }
  }

  console.log(`\n2️⃣ Total normalized papers in catalog: ${allMergedPapers.length}`);

  // 4. Connect to MongoDB Atlas and bulk upsert
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    console.error('❌ MONGODB_URI not found in environment!');
    return;
  }

  console.log('\n3️⃣ Connecting to MongoDB Atlas...');
  const client = new MongoClient(mongoUri);
  await client.connect();
  const db = client.db(process.env.MONGODB_DB_NAME || 'vitlife');
  console.log('  ✅ Connected to MongoDB Atlas Database:', db.databaseName);

  const papersCol = db.collection('papers');

  // Prepare bulk operations
  console.log('4️⃣ Executing Bulk Upsert to MongoDB Atlas...');
  const bulkOps = allMergedPapers.map(paper => ({
    replaceOne: {
      filter: { _id: paper._id },
      replacement: paper,
      upsert: true
    }
  }));

  const bulkResult = await papersCol.bulkWrite(bulkOps, { ordered: false });
  console.log(`  ✅ MongoDB Upsert Complete!`);
  console.log(`     • Matched: ${bulkResult.matchedCount}`);
  console.log(`     • Modified: ${bulkResult.modifiedCount}`);
  console.log(`     • Upserted: ${bulkResult.upsertedCount}`);

  // Create indexes for instant lightning queries
  console.log('\n5️⃣ Ensuring Database Indexes on collection "papers"...');
  await papersCol.createIndex({ courseCode: 1 });
  await papersCol.createIndex({ examType: 1 });
  await papersCol.createIndex({ department: 1 });
  await papersCol.createIndex({ semester: 1 });
  await papersCol.createIndex({ year: 1 });
  await papersCol.createIndex({ status: 1 });
  await papersCol.createIndex({ fullText: 'text', courseTitle: 'text', courseCode: 'text' });
  console.log('  ✅ Indexes created successfully!');

  // Verify total count in MongoDB Atlas
  const finalDbCount = await papersCol.countDocuments();
  console.log(`\n6️⃣ Verification: Total papers now in MongoDB Atlas: ${finalDbCount}`);

  // 5. Update server/data/papers.json
  console.log('7️⃣ Updating local backup file: server/data/papers.json...');
  fs.writeFileSync(PAPERS_FILE, JSON.stringify(allMergedPapers, null, 2), 'utf-8');
  console.log(`  ✅ Saved ${allMergedPapers.length} papers to ${PAPERS_FILE}`);

  // Sample inspection from DB
  const sampleFromDb = await papersCol.find({}).limit(3).toArray();
  console.log('\nSample Verified Records in MongoDB Atlas:');
  console.log(JSON.stringify(sampleFromDb, null, 2));

  await client.close();
  console.log('\n===============================================================');
  console.log('🎉 ALL PAPERS SYNCHRONIZED & STORED IN MAIN DATABASE!');
  console.log('===============================================================\n');
}

main().catch(err => {
  console.error('Fatal sync error:', err);
  process.exit(1);
});
