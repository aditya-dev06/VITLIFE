async function inspectPV() {
  const res = await fetch('https://passvitian.in/api/list-papers');
  const data = await res.json();
  const papers = data.papers || [];
  console.log(`Total PassVitian papers: ${papers.length}`);
  console.log('Sample PassVitian papers structure:');
  console.log(JSON.stringify(papers.slice(0, 10), null, 2));

  const uniqueKeys = new Set();
  for (const p of papers) {
    Object.keys(p).forEach(k => uniqueKeys.add(k));
  }
  console.log('All available keys in paper objects:', Array.from(uniqueKeys));
}

inspectPV().catch(console.error);
