/**
 * vitChat AI Human Humor & Campus Banter Engine
 * 
 * Provides authentic, hilarious, human-like Indian college student responses
 * across Hinglish and English. Banned from corporate chatbot fluff and robotic tropes.
 */

// Curated authentic human campus dialogue patterns across multiple diverse domains
const HUMAN_CAMPUS_DATABASE = {
  nameRoastsHinglish: [
    (name) => `${name} group me aise expert banta hai jaise Shark Tank ka chautha judge yahi ho 💀 Shakal dekh ke lagta hai calculator me bhi syntax error la dega.`,
    (name) => `${name} bhai, itna overconfidence kahan se laate ho? Teri baatein sun ke lagta hai dimag pe airplane mode laga hua hai 😭💀`,
    (name) => `${name} reels dekh ke khud ko alpha male samajh raha hai, jabki dukan pe 5 rupaye ka change maangte hue iski aawaz kaanpti hai 💀🤡`,
    (name) => `Isko lagta hai bina padhe 50 LPA ka package iske ghar pe parcel ho jayega 💀 Chill kar ${name} bhai.`,
    (name) => `${name} bhai se ek basic puzzle solve nahi hoti aur chale hain chat me gyaan baatne 💀💅`,
    (name) => `${name} ki baaton me utna hi dum hai jitna ₹50 wale Bluetooth headphones ke bass me hota hai 😭🔥`,
    (name) => `${name} bhai chup ho ja, teri baatein sun ke background me clown music bajne lagta hai 🤡💀`
  ],

  nameRoastsEnglish: [
    (name) => `${name} is talking a lot for someone who needs Google to solve 2+2 under pressure 💀`,
    (name) => `${name} acts like the main character when in reality they wouldn't even make the background credits 💀🗿`,
    (name) => `I would roast ${name}, but their life decisions and search history are already doing all the heavy lifting 😭💀`,
    (name) => `${name} has the confidence of a full-stack developer with the skills of a 'Hello World' tutorial 💀🔥`
  ],

  attendanceHinglish: [
    `Pehle time pe uthna seekh lo bhai, proxy ke bharose degree nahi milti 💀🗿`,
    `Subah 8 baje alarm bajta hai toh bhai phone ko hi dushman samajh leta hai 😭💀`
  ],

  examHinglish: [
    `Exam se 2 ghante pehle YouTube pe 'One Shot Full Syllabus in 15 Minutes' dekhne se topper nahi banega bhai 💀🗿`,
    `Quiz me tukke maar ke bhai aise chill kar raha hai jaise rank 1 aayi ho 😭🤡`
  ],

  campusLifeHinglish: [
    `Wahi roz ka scene — aadhe log so rahe hain, aadhe reel scroll kar rahe hain, aur baaki group me bakwaas 💀`,
    `Group me sab ek dusre ko gyaan de rahe hain jaise sabke paas 5 saal ka CEO experience ho 😭🔥`
  ],

  simpingHinglish: [
    `6 ghante tak novel likh ke tujhe sirf 'K' mil raha hai? 💀 Thoda self-respect pe bhi invest kar le bhai 😭🤡`,
    `Crush ko impress karne ke chakkar me bhai ne apna career side character bana diya hai 💀💅`
  ],

  placementHinglish: [
    `Resume me 'Expert in Communication' likhne ke baad viva me 'yes sir, no sir' bolne wala banda yahi hai 💀🤡`,
    `Bina ek line code likhe bhai 50 LPA ke dream dekh raha hai 💀 Chill kar.`
  ],

  summarizeHinglish: [
    `📋 **Chat Summary:**\n• 90% bina sar-pair ki bakchodi\n• 10% random planning jo kabhi execute nahi hogi 💀`,
    `📋 **TL;DR:**\n• Group me sab ek dusre pe hass rahe hain aur productive kaam 0% hua hai 😭💀`
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
