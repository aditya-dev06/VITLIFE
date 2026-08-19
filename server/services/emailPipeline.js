import imapSimple from 'imap-simple';
import { simpleParser } from 'mailparser';
import crypto from 'crypto';
import { GoogleGenerativeAI } from '@google/generative-ai';

// High-confidence email filter keywords for official college announcements
const EVENT_KEYWORDS = [
  'event', 'recruitment', 'hackathon', 'workshop', 'placement', 'internship',
  'contest', 'fest', 'webinar', 'audition', 'symposium', 'registration',
  'opportunity', 'bootcamp', 'guest lecture', 'seminar', 'challenge', 'hack'
];

const EXCLUDED_KEYWORDS = [
  'security alert', 'password reset', 'your account', 'verification code',
  'unsubscribe', 'spam', 'personal note', 'leave request'
];

// Pre-compiled Regex Patterns for High Performance
const RE_EMAIL_ANGLE_BRACKETS = /<([^>]+)>/;
const RE_URL = /https?:\/\/[^\s<">]+/gi;
const RE_TITLE_PREFIX = /^(?:fwd|re|reg|announcement|urgent)\b[\s:]*|^\[.*?\]\s*/i;
const RE_ORGANIZER_BY = /(?:organized by|by|club|society|cell|branch)\s+([A-Z0-9\s]{3,30}?)(?=\s+(?:in|at|on|for)\b|[\n.,;-]|$)/i;
const RE_EVENT_DATE = /\b(\d{1,2}(?:st|nd|rd|th)?\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s*(?:\d{2,4})?|\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}\/\d{2,4})\b/i;
const RE_TIMELINE_LINE = /\b(\d{1,2}(?::\d{2})?\s*(?:am|pm|AM|PM)?(?:\s*(?:-|to)\s*\d{1,2}(?::\d{2})?\s*(?:am|pm|AM|PM)?)?)\b[\s:|-]+(.+)/i;
const RE_IMG_SRC = /<img[^>]+src=["']([^"']+)["']/gi;
const RE_HTML_TAGS = /<[^>]*>?/gm;
const RE_MULTI_WHITESPACE = /\s+/g;
const RE_MULTI_NEWLINES = /\n{3,}/g;
const RE_PHONE_NUMBER = /^\+?91[\s\d-]{8,}|\d{10}/;

// Quote Stripping & Header Regexes
const RE_QUOTE_ON_WROTE = /^On\s+.*wrote:?$/i;
const RE_QUOTE_LINE_PREFIX = /^>/;
const RE_HEADER_FROM = /^From:\s+/i;
const RE_HEADER_DATE = /^Date:\s+/i;
const RE_HEADER_ORIGINAL_MSG = /^---+?\s*Original Message\s*---+?/i;
const RE_HEADER_DIVIDER = /^_{5,}|^-{5,}/;
const RE_CODE_FENCE_JSON = /^```json\s*|```$/g;

// Cached GoogleGenerativeAI client instance
const genAIClientCache = new Map();

function getGenAIClient(apiKey) {
  if (!genAIClientCache.has(apiKey)) {
    genAIClientCache.set(apiKey, new GoogleGenerativeAI(apiKey));
  }
  return genAIClientCache.get(apiKey);
}

/**
 * Check if the sender is an official college email address (@vitbhopal.ac.in)
 */
export function isInternalCollegeSender(sender = '') {
  if (!sender || typeof sender !== 'string') return false;
  const lowerSender = sender.toLowerCase().trim();
  
  // Extract email address inside angle brackets if present e.g. "IEEE Club <ieee@vitbhopal.ac.in>"
  const emailMatch = lowerSender.match(RE_EMAIL_ANGLE_BRACKETS) || [null, lowerSender];
  const emailAddress = (emailMatch[1] || lowerSender).trim();

  // Must end strictly with @vitbhopal.ac.in or subdomains
  return emailAddress.endsWith('@vitbhopal.ac.in') || emailAddress.endsWith('.vitbhopal.ac.in');
}

/**
 * Filter function to determine if an email is an official college event or opportunity notice
 */
export function isCollegeOpportunityEmail(subject = '', bodyText = '', sender = '') {
  // 1. Strict Internal Sender Check: REJECT any external email domain (non-@vitbhopal.ac.in)
  if (!isInternalCollegeSender(sender)) {
    return false;
  }

  const fullText = `${subject} ${bodyText} ${sender}`.toLowerCase();
  
  // 2. Check exclusions
  for (let i = 0; i < EXCLUDED_KEYWORDS.length; i++) {
    if (fullText.includes(EXCLUDED_KEYWORDS[i])) return false;
  }

  // 3. Check matching keywords
  for (let i = 0; i < EVENT_KEYWORDS.length; i++) {
    if (fullText.includes(EVENT_KEYWORDS[i])) return true;
  }

  return false;
}

/**
 * Strip quoted email reply chains, headers, and signatures (e.g. "On Mon, Jun 22... wrote:")
 */
export function stripEmailQuotes(text = '') {
  if (!text || typeof text !== 'string') return '';

  // Fast-path: if text contains no quote markers, return trimmed text
  if (
    !text.includes('wrote:') &&
    !text.includes('From:') &&
    !text.includes('Date:') &&
    !text.includes('>') &&
    !text.includes('---') &&
    !text.includes('____')
  ) {
    return text.trim();
  }

  const lines = text.split(/\r?\n/);
  const cleanLines = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      cleanLines.push(line);
      continue;
    }

    // Stop at email quote markers or reply headers
    if (RE_QUOTE_ON_WROTE.test(trimmed)) break;
    if (RE_HEADER_ORIGINAL_MSG.test(trimmed)) break;
    if (RE_HEADER_DIVIDER.test(trimmed)) break;
    if (RE_QUOTE_LINE_PREFIX.test(trimmed)) continue; // skip inline quotes
    if (cleanLines.length > 3 && (RE_HEADER_FROM.test(trimmed) || RE_HEADER_DATE.test(trimmed))) break; // skip nested header blocks
    if (trimmed.startsWith('Placement Office <') || trimmed.startsWith('Placement Office placementoffice@')) continue;

    cleanLines.push(line);
  }

  return cleanLines.join('\n').replace(RE_MULTI_NEWLINES, '\n\n').trim();
}

/**
 * Clean email subject string
 */
export function cleanTitle(subject = '') {
  if (!subject || typeof subject !== 'string') return '';
  let cleaned = subject.trim();
  let prev = '';
  while (cleaned !== prev) {
    prev = cleaned;
    cleaned = cleaned.replace(RE_TITLE_PREFIX, '').trim();
  }
  return cleaned;
}

/**
 * Extract registration URLs from text
 */
export function extractRegistrationLink(text = '') {
  if (!text || typeof text !== 'string') return '';
  const matches = text.match(RE_URL) || [];
  
  for (const url of matches) {
    const lower = url.toLowerCase();
    if (
      lower.includes('forms.gle') ||
      lower.includes('docs.google.com/forms') ||
      lower.includes('unstop.com') ||
      lower.includes('devfolio.co') ||
      lower.includes('typeform.com') ||
      lower.includes('register') ||
      lower.includes('linktr.ee') ||
      lower.includes('bit.ly') ||
      lower.includes('youtube.com/@placement')
    ) {
      return url.replace(/[.,;)]+$/, '');
    }
  }
  
  return matches[0] ? matches[0].replace(/[.,;)]+$/, '') : '';
}

/**
 * Determine category
 */
export function determineCategory(text = '') {
  const lower = text.toLowerCase();
  if (lower.includes('hackathon') || lower.includes('coding') || lower.includes('contest')) return 'Hackathon';
  if (lower.includes('recruitment') || lower.includes('audition') || lower.includes('hiring')) return 'Recruitment';
  if (lower.includes('placement') || lower.includes('internship') || lower.includes('job')) return 'Placement';
  if (lower.includes('workshop') || lower.includes('bootcamp') || lower.includes('hands-on')) return 'Workshop';
  if (lower.includes('fest') || lower.includes('cultural') || lower.includes('music')) return 'Cultural';
  return 'Technical';
}

/**
 * Determine club/organizer name
 */
export function extractOrganizer(text = '', sender = '') {
  const senderStr = sender || '';
  if (senderStr.includes('CDC') || senderStr.includes('Placement')) return 'CDC Placement Cell';
  if (senderStr.includes('IEEE')) return 'IEEE Student Branch';
  if (senderStr.includes('ACM')) return 'ACM Student Chapter';
  if (senderStr.includes('Student Welfare') || senderStr.includes('ad2.sw') || senderStr.includes('dsw')) return 'Student Welfare Cell';

  const match = text.match(RE_ORGANIZER_BY);
  if (match && match[1]) {
    const org = match[1].trim();
    if (org.length >= 3) return org;
  }

  return 'VIT Bhopal Campus';
}

/**
 * Extract event date string
 */
export function extractEventDate(text = '') {
  if (!text || typeof text !== 'string') return new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const match = text.match(RE_EVENT_DATE);
  if (match) {
    return match[0];
  }
  return new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/**
 * Extract event schedule timeline from email body (Sanitized against raw email quotes)
 */
export function extractTimeline(text = '') {
  const unquoted = stripEmailQuotes(text);
  const lines = unquoted.split(/[\r\n;\.]+/);
  const timeline = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    
    // Ignore lines that look like quoted email headers or phone numbers
    if (
      trimmed.includes('Placement Office') ||
      trimmed.includes('wrote:') ||
      trimmed.includes('On ') ||
      trimmed.includes('LPA+') ||
      trimmed.includes('leetcode') ||
      RE_PHONE_NUMBER.test(trimmed)
    ) {
      continue;
    }

    const match = trimmed.match(RE_TIMELINE_LINE);
    if (match && match[1] && match[2]) {
      const timeStr = match[1].trim();
      const activity = match[2].trim();
      if (activity.length > 3 && activity.length < 90 && !activity.toLowerCase().includes('http')) {
        timeline.push({ time: timeStr, activity });
      }
    }
  }

  return timeline;
}

/**
 * Extract poster image URL or base64 data URI from attachments & HTML
 */
export function extractPosterUrl(attachments = [], htmlText = '') {
  if (Array.isArray(attachments)) {
    for (const att of attachments) {
      if (att && att.contentType && att.contentType.startsWith('image/')) {
        if (att.content) {
          const base64 = att.content.toString('base64');
          return `data:${att.contentType};base64,${base64}`;
        }
      }
    }
  }

  if (htmlText) {
    let match;
    RE_IMG_SRC.lastIndex = 0;
    while ((match = RE_IMG_SRC.exec(htmlText)) !== null) {
      const src = match[1];
      if (src && !src.includes('tracker') && !src.includes('pixel') && !src.includes('beacon')) {
        return src;
      }
    }
  }

  return '';
}

/**
 * AI Model Structured Email Extractor (using Gemini API or AI Rule Synthesizer)
 */
export async function parseEmailWithAI(subject = '', bodyText = '', htmlText = '', sender = '', attachments = []) {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  const cleanBody = stripEmailQuotes(bodyText);
  const posterUrl = extractPosterUrl(attachments, htmlText);

  // If Gemini API Key is available, use Google Generative AI Model
  if (apiKey) {
    try {
      console.log('[Email Pipeline] 🧠 Invoking Gemini AI Model for Email Structuring...');
      const genAI = getGenAIClient(apiKey);
      const model = genAI.getGenerativeAIModel({
        model: 'gemini-1.5-flash',
        systemInstruction: 'You are an AI Event & Opportunity Synthesizer for VIT Bhopal University. Analyze official campus email announcements and extract structured details as valid JSON.',
        generationConfig: {
          responseMimeType: 'application/json',
          maxOutputTokens: 1024
        }
      });

      const extractedLink = extractRegistrationLink(`${bodyText} ${htmlText}`);
      
      // Optimize prompt length: normalize whitespace & cap clean body at 2,000 chars
      const truncatedBody = cleanBody.replace(RE_MULTI_WHITESPACE, ' ').trim().substring(0, 2000);

      const prompt = `Sender: ${sender}
Subject: ${subject}
Extracted Link Hint: ${extractedLink || 'None'}
Body Content:
${truncatedBody}

Return JSON adhering strictly to this schema:
{
  "isValidAnnouncement": true,
  "title": "Clean, concise title",
  "clubName": "Official Club or Cell Name (e.g. Placement Cell, IEEE, ACM, Student Welfare)",
  "category": "Hackathon | Recruitment | Placement | Workshop | Cultural | Technical",
  "date": "Aug 15, 2026",
  "time": "10:00 AM",
  "venue": "VIT Bhopal Campus or LHC-102 or Online",
  "registrationLink": "https://...",
  "description": "Clean 2-3 sentence summary without quoted email headers.",
  "timeline": [
    { "time": "10:00 AM", "activity": "Opening Ceremony" }
  ]
}`;

      // Wrap in 12s timeout race to handle network stalls gracefully
      const aiPromise = model.generateContent(prompt);
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Gemini API request timed out after 12s')), 12000)
      );

      const result = await Promise.race([aiPromise, timeoutPromise]);
      let rawText = result.response.text().trim();

      if (rawText.startsWith('```')) {
        rawText = rawText.replace(RE_CODE_FENCE_JSON, '').trim();
      }

      const jsonResponse = JSON.parse(rawText);

      if (jsonResponse && jsonResponse.isValidAnnouncement) {
        const title = jsonResponse.title || cleanTitle(subject);
        const isOpp = jsonResponse.category === 'Placement' || jsonResponse.category === 'Recruitment';

        if (isOpp) {
          return {
            type: 'opportunity',
            payload: {
              id: `auto_${crypto.createHash('sha256').update(title + jsonResponse.date).digest('hex').substring(0, 16)}`,
              title,
              company: jsonResponse.clubName || 'Placement Office',
              role: jsonResponse.category,
              type: 'Full-time / Internship',
              location: jsonResponse.venue || 'VIT Bhopal Campus',
              stipend: 'As per announcement',
              experience: 'Students / All Batches',
              category: 'Placements',
              applyUrl: jsonResponse.registrationLink || extractedLink || 'https://vtop.vitbhopal.ac.in/',
              description: jsonResponse.description,
              postedDate: 'Just Now',
              posterUrl: posterUrl || '',
              tags: [jsonResponse.category, 'Official']
            }
          };
        }

        return {
          type: 'event',
          payload: {
            id: `auto_evt_${crypto.createHash('sha256').update(title + jsonResponse.date).digest('hex').substring(0, 16)}`,
            title,
            clubName: jsonResponse.clubName || extractOrganizer(subject, sender),
            category: jsonResponse.category || 'Technical',
            date: jsonResponse.date || extractEventDate(bodyText),
            time: jsonResponse.time || 'Check Announcement Details',
            venue: jsonResponse.venue || 'VIT Bhopal Campus',
            description: jsonResponse.description,
            registrationLink: jsonResponse.registrationLink || extractedLink || '#',
            posterUrl: posterUrl || '',
            posterUrls: posterUrl ? [posterUrl] : [],
            timeline: Array.isArray(jsonResponse.timeline) ? jsonResponse.timeline : [],
            status: 'Active',
            featured: true,
            pinned: true,
            createdAt: new Date().toISOString()
          }
        };
      }
    } catch (err) {
      console.error('[Email Pipeline] AI Model Error, falling back to rule synthesizer:', err.message);
    }
  }

  // Fallback: AI Structured Rule Synthesizer
  return parseEmailToCardPayload(subject, bodyText, htmlText, sender, attachments);
}

/**
 * Standard Structured Parser Fallback
 */
export function parseEmailToCardPayload(subject = '', bodyText = '', htmlText = '', sender = '', attachments = []) {
  const unquotedBody = stripEmailQuotes(bodyText);
  const title = cleanTitle(subject);
  const category = determineCategory(`${subject} ${unquotedBody}`);
  const organizer = extractOrganizer(`${subject} ${unquotedBody}`, sender);
  const registrationLink = extractRegistrationLink(`${unquotedBody} ${htmlText}`);
  const eventDate = extractEventDate(unquotedBody);
  const timeline = extractTimeline(unquotedBody);
  const posterUrl = extractPosterUrl(attachments, htmlText);
  
  // Clean snippet description without quoted email thread noise
  const cleanBody = unquotedBody
    .replace(RE_HTML_TAGS, '')
    .replace(RE_MULTI_WHITESPACE, ' ')
    .trim();
  
  let snippet = cleanBody.length > 250 ? cleanBody.substring(0, 250) + '...' : cleanBody;

  if (timeline.length > 0) {
    const timelineText = '\n\n🗓️ Agenda Timeline:\n' + timeline.map(item => `• ${item.time}: ${item.activity}`).join('\n');
    snippet += timelineText;
  }

  const isOpportunity = category === 'Placement';

  if (isOpportunity) {
    return {
      type: 'opportunity',
      payload: {
        id: `auto_${crypto.createHash('sha256').update(title + eventDate).digest('hex').substring(0, 16)}`,
        title,
        company: organizer,
        role: category,
        type: 'Full-time / Internship',
        location: 'VIT Bhopal Campus',
        stipend: 'As per email notice',
        experience: 'All Batches',
        category: 'Placements',
        applyUrl: registrationLink || 'https://vtop.vitbhopal.ac.in/',
        description: snippet || 'Official campus opportunity notice. Check registration link for details.',
        postedDate: 'Just Now',
        posterUrl: posterUrl || '',
        tags: [category, organizer, 'Official']
      }
    };
  }

  return {
    type: 'event',
    payload: {
      id: `auto_evt_${crypto.createHash('sha256').update(title + eventDate).digest('hex').substring(0, 16)}`,
      title,
      clubName: organizer,
      category,
      date: eventDate,
      time: timeline[0] ? timeline[0].time : 'Check Link Details',
      venue: 'VIT Bhopal Campus',
      description: snippet || 'Official campus event announcement.',
      registrationLink: registrationLink || '#',
      posterUrl: posterUrl || '',
      posterUrls: posterUrl ? [posterUrl] : [],
      timeline: timeline.length > 0 ? timeline : [],
      status: 'Active',
      featured: true,
      pinned: true,
      createdAt: new Date().toISOString()
    }
  };
}

/**
 * Controlled Concurrency Async Map Helper
 */
async function mapConcurrent(items, concurrency, fn) {
  const results = [];
  const executing = [];
  for (const item of items) {
    const p = Promise.resolve().then(() => fn(item));
    results.push(p);
    if (concurrency <= items.length) {
      const e = p.then(() => executing.splice(executing.indexOf(e), 1));
      executing.push(e);
      if (executing.length >= concurrency) {
        await Promise.race(executing);
      }
    }
  }
  return Promise.all(results);
}

/**
 * IMAP Inbox Scanner Engine
 */
export async function scanCollegeInboxAndIngest(db, config = {}) {
  const user = config.user || process.env.EMAIL_IMAP_USER || process.env.EMAIL_USER;
  const password = config.password || process.env.EMAIL_IMAP_PASS || process.env.EMAIL_PASS;
  const host = config.host || process.env.EMAIL_IMAP_HOST || 'imap.gmail.com';

  const imapConfig = {
    imap: {
      user: user ? user.trim() : '',
      password: password ? password.trim() : '',
      host: host ? host.trim() : 'imap.gmail.com',
      port: 993,
      tls: true,
      tlsOptions: { rejectUnauthorized: false, servername: 'imap.gmail.com' },
      authTimeout: 10000,
      connTimeout: 10000
    }
  };

  if (!imapConfig.imap.user || !imapConfig.imap.password) {
    console.log('[Email Pipeline] ⚠️ IMAP Credentials missing (EMAIL_IMAP_USER / EMAIL_IMAP_PASS). Direct inbox fetch skipped.');
    return { success: false, reason: 'Missing credentials' };
  }

  console.log(`[Email Pipeline] 📬 Connecting to Google Workspace IMAP (${imapConfig.imap.user})...`);
  
  let connection;
  let ingestedCount = 0;

  try {
    connection = await imapSimple.connect(imapConfig);
    await connection.openBox('INBOX');

    let searchCriteria = ['UNSEEN'];
    const fetchOptions = { bodies: ['HEADER'], struct: true, markSeen: false };

    let messages = await connection.search(searchCriteria, fetchOptions);
    if (!messages || messages.length === 0) {
      console.log('[Email Pipeline] ℹ️ No unread emails found. Fast-scanning recent inbox messages from past 7 days...');
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 7);
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const dateStr = `${pastDate.getDate()}-${months[pastDate.getMonth()]}-${pastDate.getFullYear()}`;
      searchCriteria = [['SINCE', dateStr]];
      messages = await connection.search(searchCriteria, fetchOptions);
    }

    const targetMessages = messages.slice(-30); // Inspect 30 most recent messages
    console.log(`[Email Pipeline] 🔍 Fast-scanning ${targetMessages.length} recent headers out of ${messages.length} total messages...`);

    // Pre-filter headers and deduplicate against existing DB records to avoid redundant body downloads & Gemini AI calls
    const qualifiedItems = [];
    for (const item of targetMessages) {
      const headerPart = item.parts.find(p => p.which === 'HEADER');
      const header = headerPart ? headerPart.body : {};
      const subject = Array.isArray(header.subject) ? header.subject[0] : (header.subject || '');
      const sender = Array.isArray(header.from) ? header.from[0] : (header.from || '');

      if (isCollegeOpportunityEmail(subject, '', sender)) {
        const title = cleanTitle(subject);
        
        // Fast DB deduplication check
        if (db) {
          try {
            const existingEvent = await db.collection('events').findOne({ title });
            const existingOpp = await db.collection('opportunities').findOne({ title });
            if (existingEvent || existingOpp) {
              console.log(`[Email Pipeline] ⏩ Skipping already ingested announcement: "${title}"`);
              continue;
            }
          } catch (dbErr) {
            // Non-critical check failure, continue processing
          }
        }

        qualifiedItems.push({ item, subject, sender });
      }
    }

    console.log(`[Email Pipeline] 🎯 Found ${qualifiedItems.length} new candidate announcement(s) to fetch & structure.`);

    // Download email part data sequentially over IMAP connection to maintain socket stability
    const downloadedEmails = [];
    for (const { item, subject, sender } of qualifiedItems) {
      try {
        const struct = item.attributes ? item.attributes.struct : null;
        const parts = struct ? imapSimple.getParts(struct) : [];
        const mainPart = Array.isArray(parts) && parts.length > 0
          ? (parts.find(p => p && (p.type === 'text' || p.subtype === 'plain' || p.subtype === 'html')) || parts[0])
          : null;
        const fullParts = mainPart ? await connection.getPartData(item, mainPart) : '';
        const parsed = await simpleParser(fullParts);

        downloadedEmails.push({
          subject,
          sender,
          text: parsed.text || '',
          html: parsed.html || '',
          attachments: parsed.attachments || []
        });
      } catch (err) {
        console.error('[Email Pipeline] Error downloading email part data:', err.message);
      }
    }

    // Process downloaded emails through AI Structuring & DB Ingestion with controlled concurrency (3 parallel workers)
    await mapConcurrent(downloadedEmails, 3, async (email) => {
      try {
        const card = await parseEmailWithAI(email.subject, email.text, email.html, email.sender, email.attachments);
        console.log(`[Email Pipeline] ✨ Ingested official college card: "${card.payload.title}" (${card.type})`);

        if (card.type === 'event' && db) {
          await db.collection('events').updateOne(
            { title: card.payload.title },
            { $set: card.payload },
            { upsert: true }
          );
          ingestedCount++;
        } else if (card.type === 'opportunity' && db) {
          await db.collection('opportunities').updateOne(
            { title: card.payload.title },
            { $set: card.payload },
            { upsert: true }
          );
          ingestedCount++;
        }
      } catch (err) {
        console.error('[Email Pipeline] Error processing card payload:', err.message);
      }
    });

    console.log(`[Email Pipeline] ✅ Successfully processed inbox and posted ${ingestedCount} live cards.`);
    connection.end();
    return { success: true, count: ingestedCount };
  } catch (err) {
    console.error('[Email Pipeline] ❌ IMAP Fetch Error:', err.message);
    if (connection) connection.end();
    return { success: false, error: err.message };
  }
}
