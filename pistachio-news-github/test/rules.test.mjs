import test from 'node:test';
import assert from 'node:assert/strict';
import { ENERGY, POWER, FILTERS, prepare, kindOf, rank, dedupe, clusterStories, relatedReads, sameStory, SECTIONS } from '../src/rules.mjs';

const src = (section, extra = {}) => ({ name: 'Test Source', section, kind: 'news', ...extra });
const raw = (title, extra = {}) => ({ title, summary: '', link: 'https://example.com/' + encodeURIComponent(title), date: '2026-10-22T08:00:00Z', ...extra });

test('energy terms match whole words in four languages', () => {
  for (const t of ['Strompreis steigt erneut', 'El precio de la luz se dispara', 'Bollette, cosa cambia', 'Gas prices surge', 'Energiewende in Gefahr', 'Il PUN scende']) assert.ok(ENERGY.test(t), t);
  for (const t of ['Gastronomie in Essen', 'La Banca centrale europea alza i tassi', 'Guest list for the gala']) assert.ok(!ENERGY.test(t), t);
  assert.ok(POWER.test('Germany’s aFRR prices fall as batteries flood the balancing market'));
});

test('a general feed keeps a story as energy news only when the headline or the summary clearly says so', () => {
  const s = src('energy.it', { lang: 'it', filter: ['energy'] });
  assert.ok(prepare(raw('Bollette della luce, cosa cambia da gennaio'), s));
  assert.equal(prepare(raw('Tlc, le compagnie chiedono frequenze gratis', { summary: 'Si parla anche di energia.' }), s), null);
  assert.ok(prepare(raw('Il governo prepara la manovra', { summary: 'Tetto al prezzo del gas, bollette e rinnovabili al centro del decreto.' }), s));
});

test('live blogs, cartoons, sport and repeated titles are cleaned up', () => {
  const s = src('front.ideas', { kind: 'opinion' });
  assert.equal(prepare(raw('Ukraine war live: talks resume in Geneva'), s), null);
  assert.equal(prepare(raw('Ben Jennings on the budget – cartoon'), s), null);
  assert.equal(prepare(raw('Harry Kane is the best footballer in the world', {}), src('front.de', { lang: 'de' })), null);
  assert.equal(prepare(raw('El Roto: promesas'), src('front.es', { lang: 'es' })), null);
  const doubled = prepare(raw('El potaje de la izquierda El potaje de la izquierda'), src('front.es', { lang: 'es' }));
  assert.equal(doubled.title, 'El potaje de la izquierda');
  const upi = prepare(raw('Watch: Escaped emu found on trail Escaped emu found on trail'), src('fun.odd', { kind: 'odd' }));
  assert.equal(upi.title, 'Escaped emu found on trail');
});

test('Guardian-style "Headline | Author" becomes a byline, letters are pushed down', () => {
  const s = src('front.ideas', { kind: 'opinion' });
  const a = prepare(raw('Israel needs to rethink itself | Dahlia Scheindlin'), s);
  assert.equal(a.title, 'Israel needs to rethink itself');
  assert.equal(a.author, 'Dahlia Scheindlin');
  const l = prepare(raw('Learning maths matters more than ever | Letters'), s);
  assert.equal(l.author, 'Letters');
  assert.ok(l.score < a.score);
  const q = prepare(raw('El debate | ¿Se está desmadrando la moda masculina?'), src('front.es', { lang: 'es', kind: 'opinion' }));
  assert.equal(q.title, 'El debate | ¿Se está desmadrando la moda masculina?');
});

test('feed boilerplate is removed from summaries', () => {
  const a = prepare(raw('Gas behind 90% of rise in bills', { summary: 'Wholesale costs drove bills up. The post Gas behind 90% of rise in bills appeared first on Carbon Brief.' }), src('energy.world'));
  assert.equal(a.summary, 'Wholesale costs drove bills up.');
  const r = prepare(raw('Bear wanders through library', { summary: 'submitted by /u/someone [link] [comments]' }), src('fun.odd', { kind: 'odd' }));
  assert.equal(r.summary, '');
});

test('country columns skip English versions; opinion is recognised from the address', () => {
  assert.equal(prepare(raw('The Role of Nuclear in the Energy Transition'), src('energy.it', { lang: 'it' })), null);
  assert.ok(prepare(raw('Nucleare, un ruolo marginale nella transizione'), src('energy.it', { lang: 'it' })));
  assert.equal(kindOf({ title: 'Why it matters', link: 'https://www.theguardian.com/commentisfree/2026/oct/21/x' }), 'opinion');
  assert.equal(kindOf({ title: 'Kommentar zum Haushalt: Zu wenig Mut', link: 'https://x.de/a' }), 'opinion');
  assert.equal(kindOf({ title: 'Nothing special', link: 'https://x.de/a' }, 'satire'), 'satire');
});

test('reflective pieces outrank plain reports on the front page', () => {
  const s = src('front.de', { lang: 'de' });
  const report = prepare(raw('Polizei: 40 Festnahmen bei Protest in Paris'), s);
  const essay = prepare(raw('Warum die Proteste in Frankreich mehr über die Krise der Demokratie verraten'), { ...s, kind: 'analysis' });
  assert.ok(essay.score > report.score);
});

test('the lighter side keeps silly stories and drops grim ones', () => {
  assert.ok(FILTERS.floridaMan('Florida man arrested for riding alligator into Walmart'));
  assert.ok(!FILTERS.floridaMan('Florida man killed in crash'));
  assert.ok(!FILTERS.floridaMan('Florida woman arrested after trying to pick up child from school while drunk'));
  assert.equal(prepare(raw('Man shot dead in bizarre dispute'), src('fun.odd', { kind: 'odd' })), null);
  const funny = prepare(raw('Escaped emu found wandering a bike trail'), src('fun.odd', { kind: 'odd' }));
  const plain = prepare(raw('Town council approves budget'), src('fun.odd', { kind: 'odd' }));
  assert.ok(funny.score > plain.score);
});

test('ranking caps how many stories one outlet places at the top', () => {
  const s = src('front.ideas', { kind: 'opinion' });
  const items = [1, 2, 3, 4].map(i => ({ ...prepare(raw('Opinion piece number ' + i), s), origin: 'Big' }))
    .concat([{ ...prepare(raw('A different voice'), s), origin: 'Small', score: -5 }]);
  const ranked = rank(items, 'front.ideas', new Date('2026-10-22T10:00:00Z'));
  assert.equal(ranked.slice(0, 4).filter(a => a.origin === 'Big').length, 3);
  assert.equal(ranked[3].origin, 'Small');
  assert.equal(SECTIONS['fun.satire'].perSource, 2);
});

test('dedupe removes repeated links and headlines within a section', () => {
  const s = src('front.ideas');
  const a = prepare(raw('Same headline'), s), b = { ...a, link: a.link + '?utm_source=rss' }, c = { ...a, link: 'https://other.org/x' };
  assert.equal(dedupe([a, b, c]).length, 1);
});

test('sameStory spots one event reported by two outlets', () => {
  assert.ok(sameStory({ title: 'La CNMC respalda la subasta de 600 MW de cogeneración y pide más garantías para asegurar la competencia' },
    { title: 'La CNMC avala subasta de cogeneración de 600 MW, pero recomienda salvaguardas para garantizar la competencia' }));
  assert.ok(!sameStory({ title: 'La CNMC avala la subasta de cogeneración' }, { title: 'Iberdrola invierte en eólica marina en Alemania' }));
});

const W = (title, source, summary = '', hoursAgo = 2) => ({ title, source, summary, link: 'https://n.example/' + encodeURIComponent(source + title), date: new Date(Date.parse('2026-10-22T12:00:00Z') - hoursAgo * 36e5).toISOString(), image: 'https://img.example/x.jpg' });
const world = [
  W('North Korea prepares to restart propaganda loudspeakers as ties sour with South', 'The Guardian', 'Kim Yo Jong warns propaganda loudspeakers aimed at South Korea are ready to restart along the border'),
  W('North Korea says it will resume propaganda broadcasts across border into South Korea', 'NPR', 'North Korea plans to resume anti-Seoul propaganda broadcasts along the armed border'),
  W('North Korea to resume propaganda broadcasts, South Korea urges dialogue', 'Al Jazeera', 'Pyongyang plans to resume broadcasting anti-South Korean propaganda along the border'),
  W('Celebrity shark guided out of South Korea canal refuses to swim out to sea', 'BBC News', 'The shark became an unlikely sensation after being spotted in a canal in Busan'),
  W('Large crowds watch as rescuers try to save stranded shark in South Korea', 'Euronews', 'Officials in Busan made a third attempt to guide the trapped shark from the canal to the sea'),
  W('Meta fined $25bn over user data privacy in New Mexico', 'BBC News', 'A jury in New Mexico fined Meta over privacy'),
  W('Why has Meta been fined $25bn in New Mexico?', 'Al Jazeera', 'Meta fined in New Mexico privacy case'),
  W('Tesla beats earnings projections', 'The Guardian', 'Musk floats merger'),
  // A realistic day has hundreds of unrelated stories; rare words are what tie a story together.
  ...Array.from({ length: 60 }, (_, i) => W(`Unrelated report ${i} on topic${i} in region${i}`, `Outlet ${i % 7}`, `Details about item${i} and place${i}`))
];

test('stories are grouped by event and ranked by how many outlets cover them', () => {
  const clusters = clusterStories(world, { now: new Date('2026-10-22T12:00:00Z') });
  const nk = clusters[0];
  assert.equal(nk.outlets, 3);
  assert.ok(nk.articles.every(a => /North Korea/.test(a.title)), 'the shark story is not part of the North Korea story');
  const shark = clusters.find(c => c.articles.some(a => /shark/.test(a.title)));
  assert.equal(shark.articles.length, 2);
  const meta = clusters.find(c => c.articles.some(a => /Meta/.test(a.title)));
  assert.equal(meta.articles.length, 2);
  assert.equal(nk.lead.source, 'The Guardian');
  assert.ok(nk.keys.includes('korea') && nk.keys.includes('propaganda'));
});

test('go-deeper reads must be about the same story', () => {
  const [nk] = clusterStories(world, { now: new Date('2026-10-22T12:00:00Z') });
  const pool = [
    { title: 'Why North Korea’s propaganda war with the South is back', summary: 'Kim Yo Jong and the loudspeakers on the border', source: 'The Conversation' },
    { title: 'Witkoff pushes Putin to restart peace talks', summary: 'Russia ready to resume negotiations', source: 'Foreign Policy' },
    { title: 'The case for a four-day week', summary: 'Work less, live more', source: 'The Guardian' },
    ...Array.from({ length: 150 }, (_, i) => ({ title: `Column ${i} about subject${i}`, summary: `Thoughts on matter${i}`, source: 'Filler' }))
  ];
  const reads = relatedReads(nk, pool);
  assert.deepEqual(reads.map(r => r.source), ['The Conversation']);
});
