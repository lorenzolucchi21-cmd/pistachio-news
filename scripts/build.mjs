import fs from 'node:fs';
import { setTimeout as sleep } from 'node:timers/promises';
import { parseFeed, parseEvents, rausgegangenLinks, eventCategory, englishFriendly, ogImage, parseWikiFeatured, upgradeImage } from './feeds.mjs';
import { prepare, dedupe, rank, SECTIONS, clusterStories, pickLead, relatedReads, sameStory, ENERGY, POWER } from '../src/rules.mjs';
import { translateHeadlines } from './translate.mjs';

const config = JSON.parse(fs.readFileSync('config/sources.json', 'utf8'));
const UA = 'Mozilla/5.0 (compatible; PistachioNews/1.0)';
const now = new Date();
const DAY = 864e5;

// Source entries in config/sources.json:
//  - "urls":   public RSS/Atom feeds, read directly.
//  - "search": a Google News query; only headlines and links are taken (each story keeps its real publisher name).
//  - "section": where the stories appear, e.g. "front.de" (front page, Germany column). See SECTIONS in src/rules.mjs.
//  - "filter": optional rules from FILTERS in src/rules.mjs, e.g. ["energy"] keeps only energy stories of a general feed.
const EDITIONS = { en: ['en-GB', 'GB', 'GB:en'], us: ['en-US', 'US', 'US:en'], de: ['de', 'DE', 'DE:de'], es: ['es', 'ES', 'ES:es'], it: ['it', 'IT', 'IT:it'] };
const googleFeed = (q, lang = 'en', when = '3d') => {
  const [hl, gl, ceid] = EDITIONS[lang] || EDITIONS.en;
  return `https://news.google.com/rss/search?q=${encodeURIComponent(`${q} when:${when}`)}&hl=${hl}&gl=${gl}&ceid=${ceid}`;
};
const sources = config.sources.map(s => ({ ...s, urls: [...(s.urls || []), ...(s.search ? [googleFeed(s.search, s.lang, s.when)] : [])] }));
if (new Set(sources.map(s => s.name)).size !== sources.length) throw new Error('Duplicate source names in config/sources.json');
for (const s of sources) if (!SECTIONS[s.section]) throw new Error(`Unknown section "${s.section}" for ${s.name}`);
const byName = new Map(sources.map(s => [s.name, s]));
const feedUrls = new Set(sources.flatMap(s => s.urls));
const realImage = u => (u && !feedUrls.has(u) ? u : '');
const blocked = new Set((config.blockedPublishers || []).map(n => n.toLowerCase()));
const allowed = a => !blocked.has(String(a.source).toLowerCase());
const inWindow = a => { const d = new Date(a.date); return d >= new Date(now - SECTIONS[a.section].days * DAY) && d <= new Date(+now + 3 * 36e5); };

async function get(url, { accept = 'application/rss+xml, application/atom+xml, application/xml, text/xml;q=0.9, */*;q=0.5', maxBytes = 6_000_000, timeout = 15000, retries = 2 } = {}) {
  for (let attempt = 0; ; attempt++) {
    try {
      const r = await fetch(url, { signal: AbortSignal.timeout(timeout), headers: { 'User-Agent': UA, Accept: accept, 'Accept-Language': 'en,de;q=0.8,es;q=0.6,it;q=0.6' } });
      if (!r.ok) { const e = new Error('HTTP ' + r.status); e.stop = r.status < 429 && r.status !== 408; throw e; }
      const reader = r.body.getReader();
      const chunks = [];
      let size = 0;
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value); size += value.length;
        if (size > maxBytes) { await reader.cancel(); break; }
      }
      return { body: Buffer.concat(chunks).toString('utf8'), url: r.url || url };
    } catch (e) {
      if (e.stop || attempt >= retries) throw e;
      await sleep(800 * 2 ** attempt);
    }
  }
}
const fetched = new Map();
const fetchOnce = (url, opts) => { if (!fetched.has(url)) fetched.set(url, get(url, opts)); return fetched.get(url); };
async function pool(items, n, fn) {
  let i = 0;
  await Promise.all(Array.from({ length: n }, async () => { while (i < items.length) { const k = i++; await fn(items[k], k); } }));
}
const errText = e => String(e.cause?.code || e.message || e).slice(0, 60);

// ---- 1. Articles ----
const results = new Map();
await pool(sources, 8, async s => {
  const articles = [];
  let reached = 0, error = '';
  for (const url of s.urls) {
    try {
      const { body, url: finalUrl } = await fetchOnce(url);
      reached++;
      let raws = parseFeed(body, finalUrl, { usePublisher: !!s.usePublisher });
      if (s.max) raws = raws.slice(0, s.max);
      for (const raw of raws) {
        if (raw.premium) continue;
        const a = prepare({ ...raw, image: realImage(raw.image), source: raw.source || s.name.split(' · ')[0] }, s);
        if (a && inWindow(a) && allowed(a)) articles.push(a);
      }
    } catch (e) { error = errText(e); }
  }
  results.set(s.name, { name: s.name, section: s.section, articles, reached, error });
});
const reachedCount = [...results.values()].filter(r => r.reached).length;
if (!reachedCount) { console.error('No source could be reached; keeping the previous archive and not publishing.'); process.exit(1); }

let previous = {};
try { previous = JSON.parse(fs.readFileSync('data/archive.json', 'utf8')); } catch { /* first run */ }

// Earlier stories are re-checked against the current rules, so rule changes also clean up the archive.
const earlier = (previous.articles || []).flatMap(a => {
  const s = byName.get(a.origin);
  const p = s && prepare({ ...a, image: realImage(a.image) }, s);
  return p ? [{ ...p, source: a.source, titleEn: a.titleEn, imgChecked: a.imgChecked }] : [];
});
const known = new Map(earlier.map(a => [a.link, a]));
const fresh = [...results.values()].flatMap(r => r.articles).map(a => {
  const old = known.get(a.link);
  return old ? { ...a, titleEn: old.titleEn, image: a.image || old.image, imgChecked: old.imgChecked } : a;
});
let archived = dedupe([...fresh, ...earlier].filter(a => inWindow(a) && allowed(a)));
// Keep the archive compact: at most 150 stories per section.
const sectionCount = {};
archived = archived.filter(a => (sectionCount[a.section] = (sectionCount[a.section] || 0) + 1) <= 150);

const toTranslate = archived.filter(a => byName.get(a.origin)?.translate);
const translation = await translateHeadlines(toTranslate);
console.log(`Translations: ${translation.translated} new, ${translation.failed} failed, ${translation.remaining} still untranslated.`);

// ---- 2. Events around Essen ----
const eventCache = previous.eventCache || {};
const eventStatus = [];
let events = [];
const isoDate = s => String(s).replace(/([+-]\d{2})(\d{2})$/, '$1:$2');
for (const src of config.events || []) {
  try {
    const { body, url } = await fetchOnce(src.url, { accept: 'text/html' });
    let found = [];
    if (src.type === 'rausgegangen') {
      const links = rausgegangenLinks(body, url, src.max || 20);
      await pool(links, 3, async link => {
        let ev = eventCache[link];
        if (!ev || now - Date.parse(ev.fetchedAt) > 2 * DAY) {
          try {
            const r = await get(link, { accept: 'text/html', retries: 1 });
            const e = parseEvents(r.body, link, { city: src.city, source: src.name })[0];
            ev = { ...(e || {}), ok: !!e, fetchedAt: now.toISOString() };
            eventCache[link] = ev;
          } catch { /* keep the cached copy, if any */ }
        }
        if (ev?.ok) found.push({ ...ev, link, source: src.name });
      });
    } else {
      found = parseEvents(body, url, { city: src.city, source: src.name });
    }
    events.push(...found);
    eventStatus.push({ name: src.name, section: 'culture.events', status: 'ok', error: '', found: found.length });
  } catch (e) {
    eventStatus.push({ name: src.name, section: 'culture.events', status: 'unreachable', error: errText(e), found: 0 });
  }
}
for (const [k, v] of Object.entries(eventCache)) if (now - Date.parse(v.fetchedAt) > 30 * DAY) delete eventCache[k];
const today = new Date(now); today.setHours(0, 0, 0, 0);
const seenEvents = new Map();
const NOT_AN_OUTING = /\b(reservation|reservierung|booth|stand \w*\d\w*|signing session|signierstunde|webinar|online|livestream|ticket ?upgrade|parking|parken)\b/i;
events = events.map(e => ({ ...e, start: isoDate(e.start), end: e.end ? isoDate(e.end) : '' }))
  .filter(e => {
    const start = Date.parse(e.start), end = Date.parse(e.end || e.start);
    if (Number.isNaN(start) || !/^https?:\/\//.test(e.link) || NOT_AN_OUTING.test(`${e.title} ${e.venue}`)) return false;
    // Multi-day events (exhibitions) only while running and if they started recently; otherwise they crowd the list.
    return Math.max(start, end) >= +today && start <= +now + 21 * DAY && (end - start < 2 * DAY || start >= +today - 7 * DAY);
  })
  .sort((a, b) => Date.parse(a.start) - Date.parse(b.start))
  // A series (same title on several dates) is listed once, on its next date.
  .filter(e => {
    const k = e.title.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '');
    const first = seenEvents.get(k);
    if (first) { if (first.start.slice(0, 10) !== e.start.slice(0, 10)) first.more = (first.more || 0) + 1; return false; }
    seenEvents.set(k, e);
    return true;
  })
  .slice(0, 90)
  .map(e => ({ title: e.title, start: e.start, end: e.end, allDay: !/T\d/.test(e.start), venue: e.venue, city: e.city, image: upgradeImage(e.image), link: e.link, summary: e.summary, free: e.free, category: eventCategory(e), english: englishFriendly(e), source: e.source.split(' · ')[0], more: e.more }));

// ---- 3. Wikipedia facts for the lighter side ----
let facts = previous.facts || null, factsStatus = 'ok', factsError = '';
try {
  const ymd = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Berlin', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now).replace(/-/g, '/');
  const { body } = await get(`https://en.wikipedia.org/api/rest_v1/feed/featured/${ymd}`, { accept: 'application/json' });
  facts = { date: ymd, ...parseWikiFeatured(JSON.parse(body)) };
} catch (e) { factsStatus = 'unreachable'; factsError = errText(e); }

// ---- 4. Page layout ----
const bySection = {};
for (const a of archived) (bySection[a.section] ||= []).push(a);
const recent = (a, days) => now - new Date(a.date) < days * DAY;
const titleMatches = re => a => re.test(a.title);
const from = (...secs) => secs.flatMap(s => bySection[s] || []);

function picker() {
  const used = new Set();
  return (section, extra = [], n = SECTIONS[section].out) => {
    const seen = new Set();
    const pool = [...(bySection[section] || []), ...extra].filter(a => !seen.has(a.link) && seen.add(a.link));
    const out = [];
    for (const a of rank(pool, section, now)) {
      if (out.length >= n) break;
      if (used.has(a.link)) continue;
      // Several outlets reporting the same event: keep the best-ranked report. Opinion pieces are always distinct reads.
      if (a.kind === 'news' && out.some(b => b.kind === 'news' && sameStory(a, b))) continue;
      out.push(a);
    }
    out.forEach(a => used.add(a.link));
    return out;
  };
}

const worldNews = (bySection['front.world'] || []).filter(a => recent(a, 1.5));
const clusters = clusterStories(worldNews, { now });
const readsPool = from('front.ideas', 'front.long', 'front.de', 'front.es', 'front.it', 'energy.analysis').filter(a => recent(a, 7) && a.kind !== 'news');
const front = picker();
const big = clusters.slice(0, 3).map(c => {
  const lead = pickLead(c.articles);
  const others = new Set([lead.source.toLowerCase()]);
  const coverage = c.articles.filter(a => a !== lead && !others.has(a.source.toLowerCase()) && others.add(a.source.toLowerCase())).slice(0, 4);
  return { lead, outlets: c.outlets, coverage, related: relatedReads(c, readsPool) };
});
const frontPage = {
  big,
  more: clusters.slice(3, 12).map(c => ({ ...pickLead(c.articles), outlets: c.outlets })),
  ideas: front('front.ideas', [], 16),
  long: front('front.long'),
  de: front('front.de'), es: front('front.es'), it: front('front.it')
};

const energy = picker();
const energyLead = energy('energy.world', [], 5);
const energyPage = {
  lead: energyLead,
  power: energy('energy.power', (bySection['energy.world'] || []).filter(titleMatches(POWER))),
  analysis: energy('energy.analysis', [...from('front.ideas', 'front.long').filter(titleMatches(ENERGY)), ...(bySection['energy.world'] || []).filter(a => a.kind !== 'news')]),
  de: energy('energy.de', from('front.de').filter(titleMatches(ENERGY))),
  es: energy('energy.es', from('front.es').filter(titleMatches(ENERGY))),
  it: energy('energy.it', from('front.it').filter(titleMatches(ENERGY))),
  more: energy('energy.world', [], 9)
};

const culture = picker();
const culturePage = {
  ideas: culture('culture.ideas'), arts: culture('culture.arts'),
  de: culture('culture.de'), es: culture('culture.es'), it: culture('culture.it'),
  essen: culture('culture.essen'), events, haunts: config.haunts || []
};

const fun = picker();
const funPage = {
  florida: fun('fun.florida'), odd: fun('fun.odd'), good: fun('fun.good'),
  de: fun('fun.de'), es: fun('fun.es'), it: fun('fun.it'), satire: fun('fun.satire'), facts
};

// ---- 5. Pictures: articles shown without a feed image get the publisher's own preview image (og:image) ----
const shown = [
  ...big.flatMap(b => [b.lead]), ...frontPage.ideas, ...frontPage.long, ...['de', 'es', 'it'].map(k => frontPage[k][0]),
  ...energyPage.lead, ...energyPage.power.slice(0, 4), ...energyPage.analysis.slice(0, 4), ...energyPage.more, ...['de', 'es', 'it'].map(k => energyPage[k][0]),
  ...culturePage.ideas, ...culturePage.arts, ...culturePage.essen, ...['de', 'es', 'it'].map(k => culturePage[k][0]),
  ...funPage.florida, ...funPage.odd, ...funPage.good, ...funPage.satire, ...['de', 'es', 'it'].map(k => funPage[k][0])
].filter(Boolean);
const needImage = [...new Set(shown)].filter(a => !a.image && !a.imgChecked && !a.link.startsWith('https://news.google.com/')).slice(0, 150);
await pool(needImage, 6, async a => {
  try {
    const r = await get(a.link, { accept: 'text/html', maxBytes: 400_000, timeout: 10000, retries: 0 });
    a.image = ogImage(r.body, r.url);
  } catch { /* no picture; a placeholder is shown */ }
  a.imgChecked = true;
});
console.log(`Preview images: looked up ${needImage.length}, found ${needImage.filter(a => a.image).length}.`);

// ---- 6. Output ----
const pub = a => a && ({ title: a.title, titleEn: a.titleEn, summary: a.summary, link: a.link, date: a.date, source: a.source, author: a.author || undefined, image: a.image || undefined, lang: a.lang, kind: a.kind, metered: a.metered || undefined, outlets: a.outlets });
const pubList = l => l.map(pub);
const shownCount = {};
const countShown = l => l.forEach(a => { if (a?.origin) shownCount[a.origin] = (shownCount[a.origin] || 0) + 1; });
[frontPage.ideas, frontPage.long, frontPage.de, frontPage.es, frontPage.it, frontPage.more, big.map(b => b.lead), big.flatMap(b => b.coverage), big.flatMap(b => b.related),
  ...Object.values(energyPage), ...['ideas', 'arts', 'de', 'es', 'it', 'essen'].map(k => culturePage[k]), ...['florida', 'odd', 'good', 'de', 'es', 'it', 'satire'].map(k => funPage[k])].forEach(countShown);
const inArchive = {};
for (const a of archived) inArchive[a.origin] = (inArchive[a.origin] || 0) + 1;

const data = {
  generatedAt: now.toISOString(),
  pages: {
    front: {
      big: big.map(b => ({ lead: pub(b.lead), outlets: b.outlets, coverage: b.coverage.map(a => ({ source: a.source, link: a.link, title: a.title })), related: pubList(b.related) })),
      more: pubList(frontPage.more), ideas: pubList(frontPage.ideas), long: pubList(frontPage.long), de: pubList(frontPage.de), es: pubList(frontPage.es), it: pubList(frontPage.it)
    },
    energy: Object.fromEntries(Object.entries(energyPage).map(([k, v]) => [k, pubList(v)])),
    culture: { ...Object.fromEntries(['ideas', 'arts', 'de', 'es', 'it', 'essen'].map(k => [k, pubList(culturePage[k])])), events, haunts: culturePage.haunts },
    fun: { ...Object.fromEntries(['florida', 'odd', 'good', 'de', 'es', 'it', 'satire'].map(k => [k, pubList(funPage[k])])), facts }
  },
  sources: [
    ...[...results.values()].map(r => ({ name: r.name, section: r.section, status: r.reached ? 'ok' : 'unreachable', error: r.reached ? '' : r.error, archived: inArchive[r.name] || 0, shown: shownCount[r.name] || 0 })),
    ...eventStatus.map(e => ({ name: e.name, section: e.section, status: e.status, error: e.error, archived: e.found, shown: events.filter(x => x.source === e.name.split(' · ')[0]).length })),
    { name: 'Wikipedia · Featured', section: 'fun.facts', status: factsStatus, error: factsError, archived: facts ? 1 : 0, shown: facts ? 1 : 0 }
  ]
};

const archiveOut = {
  generatedAt: now.toISOString(),
  articles: archived.map(a => ({ title: a.title, titleEn: a.titleEn, summary: a.summary, link: a.link, date: a.date, source: a.source, author: a.author || undefined, image: a.image || undefined, imgChecked: a.imgChecked || undefined, origin: a.origin })),
  eventCache, facts
};

fs.mkdirSync('data', { recursive: true });
fs.mkdirSync('site', { recursive: true });
fs.writeFileSync('data/archive.json', JSON.stringify(archiveOut, null, 1) + '\n');
fs.writeFileSync('site/news.json', JSON.stringify(data));
const inline = s => s.replace(/<\/script/gi, '<\\/script');
const html = fs.readFileSync('src/template.html', 'utf8')
  .replace('/*STYLE*/', () => fs.readFileSync('src/style.css', 'utf8'))
  .replace('/*APP*/', () => inline(fs.readFileSync('src/app.js', 'utf8')))
  .replace('/*DATA*/', () => JSON.stringify(data).replace(/</g, '\\u003c').replace(/\u2028|\u2029/g, ' '));
fs.writeFileSync('site/index.html', html);
fs.copyFileSync('src/logo.svg', 'site/logo.svg');

console.log(`Reached ${reachedCount}/${sources.length} feeds; ${archived.length} stories in the archive; ${events.length} upcoming events; ${clusters.length} story clusters.`);
for (const r of results.values()) if (!r.reached) console.log(`UNREACHABLE ${r.name}: ${r.error}`);
for (const e of eventStatus) if (e.status !== 'ok') console.log(`UNREACHABLE ${e.name}: ${e.error}`);
