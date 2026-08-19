import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isInternalCollegeSender,
  isCollegeOpportunityEmail,
  stripEmailQuotes,
  cleanTitle,
  extractRegistrationLink,
  determineCategory,
  extractOrganizer,
  extractEventDate,
  extractTimeline,
  extractPosterUrl,
  parseEmailToCardPayload,
  parseEmailWithAI,
  scanCollegeInboxAndIngest
} from './emailPipeline.js';

test('isInternalCollegeSender correctly validates college domain senders', () => {
  assert.equal(isInternalCollegeSender('ieee@vitbhopal.ac.in'), true);
  assert.equal(isInternalCollegeSender('IEEE Student Branch <ieee@vitbhopal.ac.in>'), true);
  assert.equal(isInternalCollegeSender('dsw@subdomain.vitbhopal.ac.in'), true);
  assert.equal(isInternalCollegeSender('spammer@gmail.com'), false);
  assert.equal(isInternalCollegeSender('fake@vitbhopal.ac.in.attacker.com'), false);
  assert.equal(isInternalCollegeSender(''), false);
  assert.equal(isInternalCollegeSender(null), false);
});

test('isCollegeOpportunityEmail filters emails accurately', () => {
  const validSender = 'placementoffice@vitbhopal.ac.in';
  const externalSender = 'random@gmail.com';

  assert.equal(isCollegeOpportunityEmail('Placement Opportunity 2026', 'Campus recruitment details', validSender), true);
  assert.equal(isCollegeOpportunityEmail('Placement Opportunity 2026', 'Campus recruitment details', externalSender), false);
  assert.equal(isCollegeOpportunityEmail('Security Alert: Password Reset', 'Hackathon details', validSender), false);
});

test('stripEmailQuotes removes quoted reply chains and header blocks', () => {
  const emailWithQuotes = `Greetings VITians!
Join us for the Annual Hackathon.

On Mon, Aug 10, 2026 at 10:00 AM IEEE Club <ieee@vitbhopal.ac.in> wrote:
> Previous reply text
> More quotes`;

  const cleaned = stripEmailQuotes(emailWithQuotes);
  assert.equal(cleaned.includes('Annual Hackathon'), true);
  assert.equal(cleaned.includes('Previous reply text'), false);
  assert.equal(cleaned.includes('wrote:'), false);
});

test('stripEmailQuotes handles divider lines and original message blocks', () => {
  const emailWithDividers = `Official Notice: Workshop Registration.

-----Original Message-----
From: Placement Office
Sent: Monday, August 10, 2026`;

  const cleaned = stripEmailQuotes(emailWithDividers);
  assert.equal(cleaned.includes('Official Notice: Workshop Registration.'), true);
  assert.equal(cleaned.includes('Original Message'), false);
});

test('cleanTitle strips email prefixes and brackets', () => {
  assert.equal(cleanTitle('Fwd: Re: [ANNOUNCEMENT] Urgent: IEEE Recruitment'), 'IEEE Recruitment');
  assert.equal(cleanTitle('Reg: Workshop Details'), 'Workshop Details');
});

test('extractRegistrationLink extracts and cleans valid URLs', () => {
  const body = 'Register here: https://forms.gle/abc123xyz. For questions email us.';
  assert.equal(extractRegistrationLink(body), 'https://forms.gle/abc123xyz');
});

test('determineCategory identifies target categories', () => {
  assert.equal(determineCategory('Join the 24-hr Hackathon'), 'Hackathon');
  assert.equal(determineCategory('Core Team Recruitment 2026'), 'Recruitment');
  assert.equal(determineCategory('Placement Drive for Tech Role'), 'Placement');
  assert.equal(determineCategory('AI/ML Hands-on Workshop'), 'Workshop');
  assert.equal(determineCategory('Music Fest 2026'), 'Cultural');
  assert.equal(determineCategory('General Tech Talk'), 'Technical');
});

test('extractOrganizer determines club or department name', () => {
  assert.equal(extractOrganizer('Event organized by IEEE Club in LHC', ''), 'IEEE Club');
  assert.equal(extractOrganizer('Placement drive details', 'Placement Office'), 'CDC Placement Cell');
});

test('extractEventDate parses date strings or defaults to current date', () => {
  const dateStr = extractEventDate('Event scheduled for 15th Aug 2026 at LHC');
  assert.equal(dateStr, '15th Aug 2026');
});

test('extractTimeline extracts agenda items', () => {
  const body = `Event Schedule:
• 10:00 AM - Opening Ceremony
• 02:00 PM - Coding Round`;
  const timeline = extractTimeline(body);
  assert.ok(timeline.length >= 2);
  assert.equal(timeline[0].time, '10:00 AM');
  assert.equal(timeline[0].activity, 'Opening Ceremony');
});

test('extractPosterUrl handles attachments and HTML img tags', () => {
  const attachments = [
    { contentType: 'image/png', content: Buffer.from('test-image-data') }
  ];
  const posterFromAtt = extractPosterUrl(attachments, '');
  assert.equal(posterFromAtt.startsWith('data:image/png;base64,'), true);

  const html = '<div><img src="https://res.cloudinary.com/demo/poster.jpg"></div>';
  const posterFromHtml = extractPosterUrl([], html);
  assert.equal(posterFromHtml, 'https://res.cloudinary.com/demo/poster.jpg');
});

test('parseEmailToCardPayload generates valid event card structure', () => {
  const result = parseEmailToCardPayload(
    'Hackathon 2026 Announcement',
    'Join our 24h Hackathon on 20th Sep 2026. Register at https://devfolio.co/hack2026.',
    '',
    'acm@vitbhopal.ac.in',
    []
  );
  assert.equal(result.type, 'event');
  assert.ok(result.payload.id.startsWith('auto_evt_'));
  assert.equal(result.payload.category, 'Hackathon');
  assert.equal(result.payload.registrationLink, 'https://devfolio.co/hack2026');
});

test('parseEmailWithAI falls back gracefully without API key', async () => {
  const result = await parseEmailWithAI(
    'Workshop Notice',
    'Hands-on Web Dev Workshop on 12th Oct 2026.',
    '',
    'ieee@vitbhopal.ac.in'
  );
  assert.ok(result);
  assert.ok(result.type);
  assert.ok(result.payload);
});

test('scanCollegeInboxAndIngest returns missing credentials when unconfigured', async () => {
  const res = await scanCollegeInboxAndIngest(null, { user: '', password: '' });
  assert.equal(res.success, false);
  assert.equal(res.reason, 'Missing credentials');
});
