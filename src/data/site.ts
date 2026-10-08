/**
 * ─────────────────────────────────────────────────────────────
 *  SITE CONTENT — edit everything the visitor reads, here.
 * ─────────────────────────────────────────────────────────────
 */

export const site = {
  name: 'Ybrain Photography',
  tagline: 'Photography studio',
  description:
    'Ybrain Photography — weddings, couples, maternity, newborn, portraits and celebrations, photographed with honesty, warmth and light.',
  established: '2026',

  /** WhatsApp number in international format, digits only (91 = India). ⚠️ REPLACE */
  whatsapp: '919000000000',
  phoneDisplay: '+91 90000 00000',
  email: 'hello@ybrainphotography.com',
  instagram: 'https://www.instagram.com/',
  instagramHandle: '@ybrainphotography',

  studio: {
    line1: 'Ybrain Studio',
    line2: 'Kerala, India',
    note: 'Available for travel worldwide',
    hours: 'Mon – Sat · 10am – 7pm',
  },
};

/** Gallery categories — photos come from files named <id>-NN-*.jpg in src/photos/ */
export const categories = [
  { id: 'weddings', name: 'Weddings', blurb: 'The whole day, told honestly — rituals, nerves, laughter and all.' },
  { id: 'couples', name: 'Couples', blurb: 'Pre-weddings and getaways, from city nights to foggy mountain roads.' },
  { id: 'maternity', name: 'Maternity', blurb: 'Soft, airy sessions for the months of waiting.' },
  { id: 'newborn', name: 'Newborn', blurb: 'Tiny hands, sleepy faces, slow and safe sessions.' },
  { id: 'portraits', name: 'Portraits', blurb: 'Editorial portraits with colour, character and light.' },
  { id: 'celebrations', name: 'Celebrations', blurb: 'Parties, trips and the joy in between.' },
] as const;

/** Hero slideshow — photo slots, in order */
export const heroSlides = [
  { slot: 'portraits-01', caption: 'Marigold', kind: 'Portrait' },
  { slot: 'couples-02', caption: 'The twirl', kind: 'Couple' },
  { slot: 'weddings-01', caption: 'Petal shower', kind: 'Wedding' },
  { slot: 'newborn-02', caption: 'Forehead to forehead', kind: 'Newborn' },
  { slot: 'couples-07', caption: 'City lights', kind: 'Couple' },
];

/** Featured stories — each is a short series of photos */
export const stories = [
  { title: 'Awaited', kind: 'Maternity session', place: 'Ybrain Studio', slots: ['maternity-01', 'maternity-05', 'maternity-07'],
    text: 'A white room, soft fabric and a lot of waiting. A quiet session made for the months before hello.' },
  { title: 'Mani & Lakshmi', kind: 'Wedding', place: 'Lakeside', slots: ['weddings-04', 'weddings-02', 'weddings-03'],
    text: 'Fresh flowers on the sleeves, mist on the water, and two people who could not stop laughing.' },
  { title: 'After dark', kind: 'Couple travel shoot', place: 'Sapa, Vietnam', slots: ['couples-05', 'couples-07', 'couples-06'],
    text: 'Fog, headlights and a mountain town at night — a getaway shoot that felt like a film still.' },
  { title: 'First days', kind: 'Newborn session', place: 'At home', slots: ['newborn-02', 'newborn-07', 'newborn-03'],
    text: 'Tiny fingers, deep sleep, and the softest light we could find. Slow, safe and unhurried.' },
  { title: 'The twirl', kind: 'Couple portraits', place: 'Studio', slots: ['couples-02', 'couples-04', 'couples-03'],
    text: 'A slice of window light on the floor, a lehenga that would not stay still.' },
];

export const process = [
  { n: '01', title: 'Say hello', text: 'Send a WhatsApp with your date and a few words about you. We reply within a day.' },
  { n: '02', title: 'Plan together', text: 'A call or a studio visit to talk about you, your people and the feeling you want to keep.' },
  { n: '03', title: 'The shoot', text: 'We guide gently and stay out of the way, so the photos look like you on your best day.' },
  { n: '04', title: 'Your gallery', text: 'A first preview within a week, the full edited gallery and albums after.' },
];
