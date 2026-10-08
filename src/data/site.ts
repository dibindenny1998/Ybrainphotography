/**
 * ─────────────────────────────────────────────────────────────
 *  SITE CONTENT — edit everything the visitor reads, here.
 *  Anything marked TODO is waiting for real details.
 * ─────────────────────────────────────────────────────────────
 */

export const site = {
  name: 'Ybrain Photography',
  description:
    'Ybrain Photography — wedding, couple, maternity, newborn and portrait photographer in Thrissur, Kerala, with a new photography studio. Unhurried, honest and full of light.',

  phone: '9562914467',
  phoneDisplay: '+91 95629 14467',
  /** International format, digits only */
  whatsapp: '919562914467',
  email: 'hello@ybrainphotography.com', // TODO: confirm email
  instagram: 'https://www.instagram.com/ybrain_photography/',
  instagramHandle: '@ybrain_photography',

  studio: {
    opened: '3 October 2026',
    address: ['Ybrain Photography Studio', 'F62C+PPM, Thrissur', 'Kerala, India'], // TODO: add the street name when ready
    city: 'Thrissur',
    plusCode: '7J2RF62C+PPM',
    geo: { lat: 10.45184, lng: 76.2218 },
    mapUrl: 'https://www.google.com/maps/search/?api=1&query=7J2RF62C%2BPPM',
    hours: [
      ['Monday – Saturday', '10:00 – 19:00'],
      ['Sunday', 'By appointment'],
    ],
  },
};

export const nav = [
  { href: '/portfolio/', label: 'Portfolio' },
  { href: '/stories/', label: 'Stories' },
  { href: '/studio/', label: 'Studio' },
  { href: '/pricing/', label: 'Pricing' },
  { href: '/about/', label: 'About' },
  { href: '/contact/', label: 'Contact' },
];

/** Gallery categories — photos come from files named <id>-NN-*.jpg in src/photos/ */
export const categories = [
  { id: 'weddings', name: 'Weddings' },
  { id: 'couples', name: 'Couples' },
  { id: 'maternity', name: 'Maternity' },
  { id: 'newborn', name: 'Newborn' },
  { id: 'portraits', name: 'Portraits' },
  { id: 'celebrations', name: 'Celebrations' },
] as const;

/** Home page: the large hero photographs (they slowly cross-fade) */
export const heroPhotos = ['portraits-02', 'couples-02', 'newborn-02', 'weddings-05'];

/** Home page: three hand-picked frames */
export const selected = [
  { slot: 'couples-03', title: 'The dance', kind: 'Couples' },
  { slot: 'maternity-01', title: 'Awaited', kind: 'Maternity' },
  { slot: 'couples-07', title: 'City lights', kind: 'Couples' },
];

/** Stories — each gets its own page at /stories/<slug>/ */
export const stories = [
  {
    slug: 'awaited', title: 'Awaited', kind: 'Maternity', place: 'Ybrain Studio',
    cover: 'maternity-01', photos: ['maternity-04', 'maternity-02', 'maternity-05', 'maternity-03', 'maternity-07', 'maternity-06'],
    intro: 'A white room, soft fabric and a lot of waiting.',
    text: 'We kept everything simple for this session: one window, a veil of tulle and a few flowers. The rest was hers — the stillness, the quiet smiles, the way she kept looking up as if she could already hear a small voice.',
  },
  {
    slug: 'mani-and-lakshmi', title: 'Mani & Lakshmi', kind: 'Wedding', place: 'Lakeside',
    cover: 'weddings-02', photos: ['weddings-04', 'weddings-03', 'weddings-01'],
    intro: 'Flowers on the sleeves, mist on the water.',
    text: 'An early start by the lake, a light fog that refused to lift, and two people who could not stop laughing at each other. We mostly just stayed out of the way.',
  },
  {
    slug: 'after-dark', title: 'After dark', kind: 'Couple travel', place: 'Sapa, Vietnam',
    cover: 'couples-05', photos: ['couples-06', 'couples-07', 'celebrations-01', 'celebrations-02', 'celebrations-04'],
    intro: 'Fog, headlights and a mountain town at night.',
    text: 'A getaway shoot that turned into a film still. Cold air, warm street lights, a crowded dance floor — and a couple who were happiest when they forgot the camera was there.',
  },
  {
    slug: 'first-days', title: 'First days', kind: 'Newborn', place: 'At home',
    cover: 'newborn-02', photos: ['newborn-01', 'newborn-07', 'newborn-03', 'newborn-06', 'newborn-05', 'newborn-08'],
    intro: 'Ten tiny fingers and the softest light we could find.',
    text: 'Newborn sessions are slow on purpose. We work around feeds and naps, keep the room warm and quiet, and let the little details — a grip, a yawn, a crease of a foot — tell the story.',
  },
  {
    slug: 'the-twirl', title: 'The twirl', kind: 'Couple portraits', place: 'Studio',
    cover: 'couples-02', photos: ['couples-04', 'couples-03', 'couples-01'],
    intro: 'A slice of window light and a lehenga that would not stay still.',
    text: 'A single shaft of afternoon light on a concrete floor was all we needed. She spun, he laughed, and the light did the rest.',
  },
];

/** The studio */
export const studioSessions = [
  { name: 'Maternity', text: 'Soft, airy sessions with gowns, fabric and window light.' },
  { name: 'Newborn & baby', text: 'A warm, quiet room made for the smallest guests.' },
  { name: 'Portraits', text: 'Individual, family and editorial portraits.' },
  { name: 'And more', text: 'Pre-wedding, couple and celebration shoots — just ask.' },
];

export const process = [
  { n: '01', title: 'Say hello', text: 'Send us a message with your date and a few words about you. We reply within a day.' },
  { n: '02', title: 'Plan together', text: 'A call or a visit to the studio to talk about your people, places and the feeling you want to keep.' },
  { n: '03', title: 'The shoot', text: 'We guide gently and stay out of the way, so you look like yourselves on your best day.' },
  { n: '04', title: 'Your photographs', text: 'A first preview within a week, then the full edited gallery and albums.' },
];

/**
 * Client words. TODO: add real quotes (e.g. from Google reviews).
 * The section stays hidden on the site until this list has entries.
 * Example: { quote: 'They made us feel completely at ease…', name: 'Anjali & Rahul', kind: 'Wedding' }
 */
export const testimonials: { quote: string; name: string; kind: string }[] = [];

/** Category list on the home page (cover photo + one line each) */
export const shoots = [
  { id: 'weddings', name: 'Weddings', cover: 'weddings-02', line: 'The whole day, told honestly.' },
  { id: 'couples', name: 'Couples', cover: 'couples-02', line: 'Pre-weddings, getaways and city nights.' },
  { id: 'maternity', name: 'Maternity', cover: 'maternity-04', line: 'Soft, airy sessions for the months of waiting.' },
  { id: 'newborn', name: 'Newborn', cover: 'newborn-07', line: 'Tiny hands, sleepy faces, slow sessions.' },
  { id: 'portraits', name: 'Portraits', cover: 'portraits-01', line: 'Colour, character and good light.' },
  { id: 'celebrations', name: 'Celebrations', cover: 'celebrations-02', line: 'Parties, trips and the joy in between.' },
];

/**
 * Starting prices. ⚠️ TODO: replace every "₹XX,XXX" with your real starting price,
 * and adjust what is included. Set `featured: true` on the one to highlight.
 */
export const packages = [
  {
    name: 'Studio session', from: '₹XX,XXX', note: 'Maternity · baby · portraits',
    includes: ['1–2 hours at the Ybrain studio', 'Outfit changes & props', 'Gentle posing guidance', 'XX edited photographs'],
  },
  {
    name: 'Couple & pre-wedding', from: '₹XX,XXX', note: 'On location', featured: true,
    includes: ['Half day on location', 'Planning call & location ideas', 'XX edited photographs', 'Short highlight reel (optional)'],
  },
  {
    name: 'Wedding day', from: '₹XX,XXX', note: 'Full day coverage',
    includes: ['Getting ready to send-off', 'Two photographers', 'Online gallery', 'Heirloom album options'],
  },
];

/** Frequently asked questions — ⚠️ TODO: check every answer matches how you work */
export const faqs = [
  { q: 'How do we book a date?', a: 'Send us a WhatsApp or use the contact form with your date and session type. Once we confirm availability, a booking advance reserves your date.' },
  { q: 'When will we get our photographs?', a: 'A small preview within about a week, and the full edited gallery a few weeks after the session. Wedding albums take a little longer.' },
  { q: 'Do you travel outside Kerala?', a: 'Yes — we photograph across India and abroad. Travel and stay are planned with you and quoted separately.' },
  { q: 'What should we wear?', a: 'Comfortable outfits in colours you love, avoiding big logos. For studio sessions we can share ideas and some outfits or fabrics are available at the studio.' },
  { q: 'Is the studio safe for newborns?', a: 'The newborn room is kept warm, quiet and clean. Sessions follow your baby’s pace — feeds and naps come first — and we never force a pose.' },
  { q: 'Can we visit the studio before booking?', a: 'Of course. Message us to fix a time; we are happy to show you the space and sample albums.' },
];

/** The founder — ⚠️ TODO: check the wording; the photo is src/photos/founder-01-*.jpg */
export const founder = {
  name: 'Yadhu Krishnan',
  first: 'Yadhu',
  last: 'Krishnan',
  role: 'Founder & photographer',
  photo: 'founder-01',
  short: 'Ybrain was started by Yadhu Krishnan with one simple idea: photographs should feel like the people in them — not like a pose someone was told to hold.',
  long: [
    'Ybrain was started by Yadhu Krishnan with one simple idea: photographs should feel like the people in them — not like a pose someone was told to hold.',
    'From wedding mornings to a newborn’s first week, Yadhu keeps every session calm and unhurried, with gentle guidance and plenty of room for the real moments. Since 3 October 2026, that work has a home of its own — the Ybrain studio.',
  ],
};
