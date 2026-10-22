import { XMLParser } from 'fast-xml-parser';
import * as heModule from 'he';

const he = heModule.default ?? heModule;

const parser = new XMLParser({
  ignoreAttributes: false, attributeNamePrefix: '@_', removeNSPrefix: true, parseTagValue: false,
  trimValues: true, processEntities: false, maxNestedTags: 5000,
  stopNodes: ['*.summary', '*.content', '*.title', '*.description', '*.encoded', '*.creator', '*.abstract']
});
const list = v => v == null ? [] : Array.isArray(v) ? v : [v];
const text = v => typeof v === 'string' ? v : v?.['#text'] || '';
function flat(node) {
  if (typeof node === 'string') return node;
  if (Array.isArray(node)) return node.map(flat).join(' ');
  if (node && typeof node === 'object') return Object.entries(node).filter(([k]) => !k.startsWith('@_')).map(([, v]) => flat(v)).join(' ');
  return '';
}
export const plain = v => he.decode(he.decode(flat(v).replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')).replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim();
export const abs = (v, base) => { if (!v) return ''; try { const u = new URL(he.decode(String(v)), base); return /^https?:$/.test(u.protocol) && !u.username ? u.href : ''; } catch { return ''; } };

// Asks image services for a sharper (BBC) or lighter (Rausgegangen originals) version of the picture.
export function upgradeImage(u) {
  if (!u) return '';
  if (/^https:\/\/ichef\.bbci\.co\.uk\//.test(u)) return u.replace(/\/(standard|news)\/\d{2,3}\//, '/$1/976/');
  if (/^https:\/\/s3\.eu-central-1\.amazonaws\.com\/rausgegangen\//.test(u)) return `https://imageflow.rausgegangen.de/url/${u.replace('https://', 'https%3A//')}?width=480&height=300&mode=crop&format=webp`;
  return u;
}

function bestImage(it, base) {
  const media = [...list(it.content), ...list(it.group?.content)].filter(v => v?.['@_url'] && (!v['@_medium'] || v['@_medium'] === 'image') && (!v['@_type'] || /^image\//.test(v['@_type'])));
  media.sort((a, b) => (+b['@_width'] || 0) - (+a['@_width'] || 0));
  const thumb = list(it.thumbnail)[0] || list(it.group?.thumbnail)[0];
  const enc = list(it.enclosure).find(v => /^image\//.test(v?.['@_type'] || '') || /\.(jpe?g|png|webp)(\?|$)/i.test(v?.['@_url'] || ''));
  const html = he.decode(he.decode(text(it.description) + ' ' + text(it.encoded) + ' ' + text(it.content)));
  const emb = html.match(/<img\b[^>]*\bsrc\s*=\s*["']([^"']+)["']/i)?.[1];
  return upgradeImage(abs(media[0]?.['@_url'] || enc?.['@_url'] || thumb?.['@_url'] || emb, base));
}

export function parseFeed(xml, base, { usePublisher = false } = {}) {
  const p = parser.parse(xml.replace(/<!DOCTYPE[^>[]*(\[[\s\S]*?\])?\s*>/i, ''));
  const isAtom = Object.hasOwn(p, 'feed');
  if (!isAtom && !p.rss?.channel && !p.RDF) throw new Error('not an RSS/Atom feed');
  const items = list(isAtom ? p.feed.entry : p.rss?.channel ? p.rss.channel.item : p.RDF?.item);
  const google = base.startsWith('https://news.google.com/');
  // Without namespace prefixes, media:title / media:description share a name with title / description; keep the first.
  const one = v => (Array.isArray(v) ? v[0] : v);
  return items.map(it => {
    const alt = list(it.link).find(l => !l?.['@_rel'] || l['@_rel'] === 'alternate');
    const link = abs(isAtom ? alt?.['@_href'] : text(one(it.link)) || (it.guid?.['@_isPermaLink'] !== 'false' ? text(it.guid) : ''), base);
    const publisher = plain(it.source);
    let title = plain(one(it.title));
    // Google News appends " - Publisher" to headlines and repeats the headline as its description.
    if (google && publisher && title.endsWith(' - ' + publisher)) title = title.slice(0, -(publisher.length + 3));
    const author = isAtom ? plain(list(it.author)[0]?.name) : plain(one(it.creator) || (typeof it.author === 'string' ? it.author : it.author?.name));
    return {
      title,
      summary: google ? '' : plain(one(it.summary) || one(it.description) || one(it.abstract) || one(it.encoded) || one(it.content)).slice(0, 600),
      link, date: text(it.pubDate || it.published || it.date || it.updated),
      source: usePublisher && publisher ? publisher : '',
      author, image: google ? '' : bestImage(it, base),
      premium: String(text(it.premium)).trim() === 'true'
    };
  });
}

// ---- Events (schema.org JSON-LD) ----

function jsonBlocks(html) {
  const out = [];
  for (const m of html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try { out.push(JSON.parse(m[1].trim())); } catch { /* malformed block */ }
  }
  return out;
}
function walk(node, fn) {
  if (Array.isArray(node)) node.forEach(n => walk(n, fn));
  else if (node && typeof node === 'object') { fn(node); Object.values(node).forEach(v => walk(v, fn)); }
}
const isType = (n, re) => list(n['@type']).some(t => re.test(String(t)));
const firstImage = v => typeof v === 'string' ? v : Array.isArray(v) ? firstImage(v[0]) : v?.url || '';

export function parseEvents(html, base, { city = '', source = '' } = {}) {
  const events = [];
  const blocks = jsonBlocks(html);
  let category = '';
  for (const b of blocks) walk(b, n => {
    if (isType(n, /^BreadcrumbList$/)) {
      const items = list(n.itemListElement).sort((x, y) => (x.position || 0) - (y.position || 0));
      category = String(items[items.length - 1]?.name || '').trim();
    }
  });
  for (const b of blocks) walk(b, n => {
    if (!isType(n, /Event$/) || !n.name || !n.startDate) return;
    const loc = list(n.location)[0] || {};
    const offers = list(n.offers)[0];
    const price = offers?.price ?? offers?.lowPrice;
    events.push({
      title: he.decode(String(n.name)).replace(/\s+/g, ' ').trim(),
      start: String(n.startDate), end: n.endDate ? String(n.endDate) : '',
      venue: he.decode(String(loc.name || '')).trim(),
      city: String(loc.address?.addressLocality || city || '').trim(),
      image: upgradeImage(abs(firstImage(n.image), base)),
      link: abs(n.url || base, base),
      summary: he.decode(String(n.description || '')).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 220),
      free: price !== undefined && price !== null && price !== '' && Number(price) === 0,
      category, source
    });
  });
  return events;
}

export function rausgegangenLinks(html, base, max = 30) {
  const links = [];
  for (const m of html.matchAll(/href="(\/(?:en\/)?events\/[a-z0-9\-_%]+\/?)"/gi)) {
    const u = abs(m[1], base);
    if (u && !links.includes(u)) links.push(u);
    if (links.length >= max) break;
  }
  return links;
}

const CATEGORY_MAP = [
  [/party|\b(club|clubbing|disco|techno|rave|house music|reggaeton|nightlife|dj|afterwork)\b/i, 'Nightlife'],
  [/konzert|musik|\b(concerts?|music|live|jazz|rock|pop|klassik|classical|oper|opera|festivals?|karaoke|chor|orchestra|philharmoni\w*)\b/i, 'Music'],
  [/markt|märkte|\b(markets?|food|drinks|brunch|wein\w*|wine|tasting|beer|bier\w*|street.?food|kulinar\w*|flea|dinner|kochkurs)\b/i, 'Food & markets'],
  [/kunst|ausstellung|museum|theater|theatre|lesung|literatur|kino|kabarett|führung|kultur|\b(art|exhibitions?|reading|spoken word|shows?|performances?|film|cinema|comedy|dance|tanz|ballett|ballet|tour|culture|vortrag|talk|lecture|poetry|slam)\b/i, 'Culture'],
  [/\b(english|expats?|international|language|sprach\w*|stammtisch|meetup|networking|social|quiz|spieleabend|games|board ?games)\b/i, 'Meet people'],
  [/\b(sports?|active|creative|workshop|yoga|run|running|climbing|bouldering|hike|hiking|wandern|lauf|kurs|course)\b/i, 'Active']
];
export function eventCategory(e) {
  const hay = `${e.category} ${e.title}`;
  for (const [re, label] of CATEGORY_MAP) if (re.test(hay)) return label;
  return 'Other';
}
export const englishFriendly = e => /\b(english|expat|international|language exchange|in english|englischsprachig|pub quiz|open mic)\b/i.test(`${e.title} ${e.summary}`);

// ---- Open Graph image of an article page ----

export function ogImage(html, base) {
  const head = html.slice(0, 300_000);
  const m = head.match(/<meta[^>]+(?:property|name)=["'](?:og:image(?::secure_url)?|twitter:image(?::src)?)["'][^>]*>/i);
  const c = m?.[0].match(/content=["']([^"']+)["']/i)?.[1];
  return c ? abs(c, base) : '';
}

// ---- Wikipedia featured content ----

const GRIM = /\b(kill(ed|ing|s)?|dead|death|deaths|died|murder(ed|s)?|massacres?|attacks?|bomb(s|ing|ed)?|wars?|battles?|invasion|shoot\w*|lockdown|earthquake|crash(ed)?|disasters?|genocide|executed|execution|assassinat\w*|terror\w*|hijack\w*|riots?|famine|plague|epidemic|collapsed?|sank|sinking|fire)\b/i;

export function parseWikiFeatured(j) {
  const link = p => p?.content_urls?.desktop?.page || '';
  const onthisday = (j.onthisday || []).filter(e => !GRIM.test(e.text)).slice(0, 6).map(e => {
    const page = (e.pages || []).find(p => p.thumbnail) || (e.pages || [])[0];
    return { year: e.year, text: e.text, link: link(page), image: page?.thumbnail?.source || '' };
  });
  const dyk = (j.dyk || []).map(d => ({
    text: String(d.text || '').replace(/^\.\.\.\s*/, '… '),
    link: (String(d.html || '').match(/<b[^>]*>\s*<a[^>]+href="([^"]+)"/) || String(d.html || '').match(/href="([^"]+)"/) || [])[1] || ''
  })).filter(d => d.text).slice(0, 8);
  const img = j.image ? { title: plain(j.image.description?.text || j.image.title || '').slice(0, 220), image: j.image.thumbnail?.source || '', link: j.image.file_page || '' } : null;
  return { onthisday, dyk, picture: img };
}
