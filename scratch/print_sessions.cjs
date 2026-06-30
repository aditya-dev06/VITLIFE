const fs = require('fs');
const { MongoClient } = require('mongodb');

// Parse .env file manually
let mongoUri = "mongodb://127.0.0.1:27017/opportunity_hub";
try {
  const envContent = fs.readFileSync('.env', 'utf-8');
  const match = envContent.match(/MONGODB_URI=(.*)/);
  if (match && match[1]) {
    mongoUri = match[1].trim();
  }
} catch (e) {
  console.log("Could not read .env file, using default.");
}

async function main() {
  console.log("Connecting to:", mongoUri);
  const client = new MongoClient(mongoUri);
  try {
    await client.connect();
    const db = client.db();
    const sessions = await db.collection('sessions').find({}).toArray();
    console.log("=== ACTIVE SESSIONS IN DATABASE ===");
    console.log(sessions);
  } catch (err) {
    console.error("Error connecting to MongoDB:", err.message);
  } finally {
    await client.close();
  }
}

main();
