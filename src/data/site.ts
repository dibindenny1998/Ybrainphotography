/**
 * ─────────────────────────────────────────────────────────────
 *  SITE CONTENT — edit everything the visitor reads, here.
 * ─────────────────────────────────────────────────────────────
 */

export const site = {
  name: 'Ybrain Photography',
  tagline: 'Kerala wedding & portrait photography',
  description:
    'Ybrain Photography — cinematic Kerala wedding, couple, newborn, portrait and event photography from a new, lamp-lit studio in Kerala.',
  established: '2026',

  /** WhatsApp number in international format, digits only (91 = India). ⚠️ REPLACE */
  whatsapp: '919000000000',
  /** Shown to visitors */
  phoneDisplay: '+91 90000 00000',
  email: 'hello@ybrainphotography.com',
  instagram: 'https://www.instagram.com/',
  instagramHandle: '@ybrainphotography',

  studio: {
    line1: 'Ybrain Studio',
    line2: 'Kerala, India',
    hours: 'Mon – Sat · 10am – 7pm',
    note: 'Studio visits by appointment',
    mapUrl: 'https://maps.google.com/?q=Kerala',
  },
};

export const categories = [
  { id: 'weddings', name: 'Weddings', ml: 'കല്യാണം', blurb: 'Temple, church & nikah — the whole day, told whole.' },
  { id: 'couples', name: 'Couples', ml: 'ഒരുമിച്ച്', blurb: 'Pre-weddings, monsoon walks, backwater evenings.' },
  { id: 'newborn', name: 'Newborn', ml: 'കുഞ്ഞ്', blurb: 'Slow, safe, sleepy sessions in the warm studio.' },
  { id: 'portraits', name: 'Portraits', ml: 'മുഖം', blurb: 'Bridal, family and personal portraits in soft light.' },
  { id: 'events', name: 'Events', ml: 'ആഘോഷം', blurb: 'Receptions, mehendi nights, melam and celebrations.' },
] as const;

/** Featured stories — photos come from src/photos/story-0X-cover / story-0X-detail */
export const stories = [
  {
    slot: 'story-01',
    couple: ['Anjali', 'Rahul'],
    type: 'Temple wedding',
    place: 'Guruvayur',
    date: 'January',
    excerpt:
      'A 6:40am muhurtham, three generations on one mandapam, and jasmine everywhere. We arrived before the first lamp was lit and left after the last sadya leaf was folded.',
  },
  {
    slot: 'story-02',
    couple: ['Meera', 'Joseph'],
    type: 'Church wedding & backwaters',
    place: 'Kumarakom',
    date: 'March',
    excerpt:
      'A white-and-gold church ceremony, then an evening drifting on a kettuvallam. The light on the lake did half our work for us.',
  },
  {
    slot: 'story-03',
    couple: ['Fathima', 'Aslam'],
    type: 'Mehendi & nikah',
    place: 'Kozhikode',
    date: 'May',
    excerpt:
      'Two nights of oppana songs, fairy lights and henna-stained laughter — and a quiet, golden nikah the morning after.',
  },
  {
    slot: 'story-04',
    couple: ['Baby Ishaan'],
    type: 'Newborn session',
    place: 'Ybrain Studio',
    date: '12 days old',
    excerpt:
      'Warm room, white noise, a grandmother humming a thaarattu. Three hours, two feeds, and one very sleepy little man.',
  },
];

export const process = [
  { n: '01', title: 'Say hello', text: 'Send us a WhatsApp with your date and a few words about you. We reply within a day.' },
  { n: '02', title: 'Visit the studio', text: 'Coffee, albums to hold, and a long chat about your families, rituals and wishes.' },
  { n: '03', title: 'We plan your day', text: 'Timelines, muhurtham light, family lists — so on the day, you just live it.' },
  { n: '04', title: 'Your story, delivered', text: 'A first preview within a week, the full gallery and heirloom album after.' },
];
