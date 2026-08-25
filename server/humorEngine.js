/**
 * vitChat AI Human Humor & Campus Banter Engine
 * 
 * Provides authentic, hilarious, human-like Indian college student responses
 * across Hinglish and English. Banned from corporate chatbot fluff and robotic tropes.
 */

// Curated authentic human campus dialogue patterns
const HUMAN_CAMPUS_DATABASE = {
  nameRoastsHinglish: [
    (name) => `${name} bhai, pehle 8:30 wali class me time pe pahuch ja, roast baad me le liyo 💀🗿`,
    (name) => `${name} ko roast karke kya faayda, uski 74.8% attendance dekh ke lagta hai VTOP pehle hi roast kar chuka hai 😭💀`,
    (name) => `${name} bhai se ek 5-mark Moodle quiz solve nahi hota aur chale hain chat me chaud dikhane 💀🤡`,
    (name) => `Arre ${name} bhai, itna overconfidence kahan se laate ho? CAT-1 ke marks toh abhi tak check nahi kiye tune 💀🔥`,
    (name) => `Isko lagta hai 6.8 CGPA aur zero coding ke saath Google seedha hostel room me offer letter fenkegi 💀🗿`,
    (name) => `${name} bhai tu wahi hai na jo mass bunk ke din bhi pehli bench pe jaake baith jata hai? 😭🤡`,
    (name) => `${name} tu pehle Underbelly ka udhar chuka, fir aake yahan gyaan baatna 💀💅`,
    (name) => `${name} bhai ki attendance aur battery dono 2% pe chal rahi hai 🤫💀`
  ],

  nameRoastsEnglish: [
    (name) => `${name} you're literally one attendance percentage away from getting debarred, chill out 💀`,
    (name) => `I would roast ${name} but honestly their 6.2 CGPA and 8:30 AM alarms are already doing that 💀🗿`,
    (name) => `${name} is talking a lot for someone who submitted their assignment at 11:59:59 PM with a corrupted PDF 😭💀`,
    (name) => `${name} chill bro, even VTOP servers have a higher success rate than your semester goals 💀🔥`,
    (name) => `${name} sitting here acting all sigma while their attendance is clutching 74.9% for dear life 🗿💀`
  ],

  attendanceHinglish: [
    `75% attendance criteria dekh ke ro rahe ho? Pehle class jana shuru karo, proxy har roz nahi lagti 💀🗿`,
    `Bhai 8:30 AM wali class ke liye AB02 tak daud lagate hue aadhi aatma nikal jaati hai 😭💀`,
    `Attendance 68% pe hai aur bhai ko lagta hai warden debarment list se naam hata dega 🤡💀`,
    `Kal subah AB02 ki 8:30 wali class me proxy lagwane ka sapna dekh rahe ho? Faculty ne pehle hi biometric laga diya hai 💀🔥`
  ],

  examHinglish: [
    `Kal subah CAT exam hai aur bhai ko ab yaad aa raha hai ki syllabus me 5 module the 💀😭`,
    `Exam se 2 ghante pehle YouTube pe 'One Shot Full Syllabus in 15 Minutes' dekhne se 9 CGPA nahi aayegi bhai 💀🗿`,
    `Moodle quiz me 10 me se 2 number laake bhai chill kar raha hai jaise placement ho gayi ho 😭🤡`,
    `FAT exam ka wait mat kar bhai, abhi bhi waqt hai backlogs ki fee jama kar de 💀💸`
  ],

  campusLifeHinglish: [
    `Aadha campus AB02 ke samne Maggi pe zinda hai, aur baaki aadha VTOP refresh karte hue 💀 Classic VIT Bhopal scene 😭`,
    `Wahi roz ka drama — 8:30 ki class, Nescafe ki cold coffee, aur attendance check karte hue collective depression 💀🗿`,
    `Campus me sab shaant hai kyunki aadhe log so rahe hain aur aadhe assignment copy-paste karne me busy hain 😭🔥`,
    `Underbelly me Maggi khatam ho gayi hai, hostel me Wi-Fi down hai. Survival mode on hai bhai 💀🏕️`
  ],

  simpingHinglish: [
    `Pehle apni 6.8 CGPA aur 70% attendance sambhal le bhai, fir romance sochna 💀🤡`,
    `Bhai crush ko dekh ke muskurane se placement nahi lagti, thoda LeetCode bhi khol liya kar 😭💀`,
    `Bandi toh dur ki baat hai, pehle 8:30 AM wali class me time pe pahuch ke dikha 💀🗿`
  ],

  placementHinglish: [
    `Placement prep? Bhai, half the batch is still trying to figure out which hostel block they're in 💀 Calm down.`,
    `DSA ke 2 question karke bhai ko lag raha hai ki Sundar Pichai khud refer karne aayega 💀🤡`,
    `Resume me 'Proficient in Python (print hello world)' likhne walo ko 40 LPA nahi milta bhai 😭💀`
  ],

  summarizeHinglish: [
    `📋 **Chat Summary:**\n• 95% bakchodi aur chill\n• 5% attendance panic\n• Exactly 0% padhai completed 💀`,
    `📋 **TL;DR:**\n• Aadha group proxy maang raha hai\n• Aadha assignment ke solutions\n• Aur ek banda bina wajah roast maang raha hai 😭💀`
  ]
};

/**
 * Cleanse AI text to remove formulaic AI clichés
 */
export function sanitizeHumanTone(text) {
  if (!text) return '';
  let cleaned = text.trim();
  
  // Remove markdown quotes if wrapped
  cleaned = cleaned.replace(/^["']|["']$/g, '').trim();

  // Strip robotic intros
  cleaned = cleaned.replace(/^(as an ai|as a participant|hey there|hello there|bro really thought that|bro is out here|look at bro|imagine thinking)\s*[,:]?\s*/i, '');

  // Strip chatbot conversational ending questions
  cleaned = cleaned.replace(/(what do you think\??|what's up with you\??|how can i help\??|let me know your thoughts\.?|what are you up to\??)$/i, '').trim();

  return cleaned;
}

/**
 * Get authentic human reply based on prompt analysis
 */
export function getAuthenticHumanResponse(prompt, author = 'Student') {
  const p = (prompt || '').toLowerCase().trim();
  const isHinglish = /[a-z]/i.test(p) && (
    p.includes('karo') || p.includes('bhai') || p.includes('kya') || p.includes('hai') ||
    p.includes('nahi') || p.includes('mujhe') || p.includes('tera') || p.includes('tu ') ||
    p.includes('aaj') || p.includes('kal') || p.includes('chud') || p.includes('padhai') ||
    p.includes('shakal') || p.includes('pehle') || p.includes('debar') || p.includes('dekh')
  );

  // 1. Roast a specific person
  const roastMatch = p.match(/(?:roast|cook)\s+([a-zA-Z0-9_]+)/i) || p.match(/([a-zA-Z0-9_]+)\s*(?:ko\s*)?(?:roast|cook)/i);
  if (roastMatch) {
    let targetName = roastMatch[1].trim();
    if (['me', 'mujhe', 'humko', 'myself'].includes(targetName.toLowerCase())) {
      targetName = author || 'Bhai';
    }
    if (targetName && targetName.length >= 2 && !['the', 'this', 'karo', 'kar', 'please'].includes(targetName.toLowerCase())) {
      const list = isHinglish ? HUMAN_CAMPUS_DATABASE.nameRoastsHinglish : HUMAN_CAMPUS_DATABASE.nameRoastsEnglish;
      const fn = list[Math.floor(Math.random() * list.length)];
      return fn(targetName);
    }
  }

  // 2. Attendance
  if (p.includes('attendance') || p.includes('75%') || p.includes('debar') || p.includes('8:30') || p.includes('ab02') || p.includes('proxy')) {
    const list = HUMAN_CAMPUS_DATABASE.attendanceHinglish;
    return list[Math.floor(Math.random() * list.length)];
  }

  // 3. Exam / Study / CAT / FAT
  if (p.includes('exam') || p.includes('cat') || p.includes('fat') || p.includes('padhai') || p.includes('study') || p.includes('moodle') || p.includes('syllabus')) {
    const list = HUMAN_CAMPUS_DATABASE.examHinglish;
    return list[Math.floor(Math.random() * list.length)];
  }

  // 4. Summarize
  if (p.includes('summarize') || p.includes('summary')) {
    const list = HUMAN_CAMPUS_DATABASE.summarizeHinglish;
    return list[Math.floor(Math.random() * list.length)];
  }

  // 5. Romance / Crush / Simping
  if (p.includes('crush') || p.includes('bandi') || p.includes('ladki') || p.includes('single') || p.includes('dating')) {
    const list = HUMAN_CAMPUS_DATABASE.simpingHinglish;
    return list[Math.floor(Math.random() * list.length)];
  }

  // 6. Placements
  if (p.includes('placement') || p.includes('package') || p.includes('internship') || p.includes('dsa') || p.includes('leetcode')) {
    const list = HUMAN_CAMPUS_DATABASE.placementHinglish;
    return list[Math.floor(Math.random() * list.length)];
  }

  // 7. General Campus life / What's happening
  if (p.includes('happening') || p.includes('chal raha') || p.includes('scene') || p.includes('kya haal')) {
    const list = HUMAN_CAMPUS_DATABASE.campusLifeHinglish;
    return list[Math.floor(Math.random() * list.length)];
  }

  // Fallback for general roasts
  if (p.includes('roast') || p.includes('sigma') || p.includes('bully') || p.includes('cook')) {
    const list = isHinglish ? HUMAN_CAMPUS_DATABASE.nameRoastsHinglish : HUMAN_CAMPUS_DATABASE.nameRoastsEnglish;
    const fn = list[Math.floor(Math.random() * list.length)];
    return fn(author || 'Bhai');
  }

  return null;
}
