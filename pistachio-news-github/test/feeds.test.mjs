import test from 'node:test';
import assert from 'node:assert/strict';
import { parseFeed, parseEvents, rausgegangenLinks, eventCategory, englishFriendly, ogImage, parseWikiFeatured, upgradeImage, abs } from '../scripts/feeds.mjs';

const rss = items => `<?xml version="1.0"?><rss version="2.0" xmlns:media="http://search.yahoo.com/mrss/" xmlns:dc="http://purl.org/dc/elements/1.1/"><channel><title>T</title>${items}</channel></rss>`;

test('RSS: picks the largest picture, the author, and ignores media:title duplicates', () => {
  const [a] = parseFeed(rss(`<item><title>Main headline</title><media:title>Main headline</media:title><link>https://x.org/a</link>
    <description>&lt;p&gt;Short &amp;amp; sweet&lt;/p&gt;</description><media:description>Short and sweet</media:description><dc:creator>Jane Doe</dc:creator>
    <pubDate>Thu, 22 Oct 2026 09:00:00 GMT</pubDate>
    <media:content width="140" url="https://img.x.org/140.jpg"/><media:content width="460" url="https://img.x.org/460.jpg"/></item>`), 'https://x.org/feed');
  assert.equal(a.title, 'Main headline');
  assert.equal(a.summary, 'Short & sweet');
  assert.equal(a.author, 'Jane Doe');
  assert.equal(a.image, 'https://img.x.org/460.jpg');
});

test('RSS: an item without a picture has no picture (not the feed address)', () => {
  const [a] = parseFeed(rss('<item><title>No picture</title><link>https://x.org/b</link><pubDate>Thu, 22 Oct 2026 09:00:00 GMT</pubDate></item>'), 'https://x.org/feed');
  assert.equal(a.image, '');
  assert.equal(abs('', 'https://x.org/feed'), '');
});

test('Google News: publisher suffix removed, no summary or picture taken', () => {
  const [a] = parseFeed(rss('<item><title>Florida man rides gator - WFLA</title><link>https://news.google.com/rss/articles/abc</link><description>&lt;a&gt;Florida man rides gator&lt;/a&gt;</description><source url="https://wfla.com">WFLA</source><pubDate>Thu, 22 Oct 2026 09:00:00 GMT</pubDate></item>'), 'https://news.google.com/rss/search?q=x', { usePublisher: true });
  assert.equal(a.title, 'Florida man rides gator');
  assert.equal(a.source, 'WFLA');
  assert.equal(a.summary, '');
});

test('Atom and RDF feeds are read; premium flags are kept', () => {
  const [atom] = parseFeed('<feed xmlns="http://www.w3.org/2005/Atom"><entry><title>Atom title</title><link rel="alternate" href="https://c.org/1"/><published>2026-10-22T08:00:00Z</published><summary>Sum</summary><author><name>Ann</name></author></entry></feed>', 'https://c.org/atom');
  assert.equal(atom.link, 'https://c.org/1');
  assert.equal(atom.author, 'Ann');
  const [rdf] = parseFeed('<rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#" xmlns="http://purl.org/rss/1.0/" xmlns:dc="http://purl.org/dc/elements/1.1/"><item><title>RDF title</title><link>https://r.de/1</link><dc:date>2026-10-22T08:00:00+02:00</dc:date></item></rdf:RDF>', 'https://r.de/feed.rdf');
  assert.equal(rdf.title, 'RDF title');
  const [welt] = parseFeed(rss('<item xmlns:welt="https://welt.de"><title>Paid</title><link>https://welt.de/1</link><welt:premium>true</welt:premium><pubDate>Thu, 22 Oct 2026 09:00:00 GMT</pubDate></item>'), 'https://welt.de/feed');
  assert.equal(welt.premium, true);
  assert.throws(() => parseFeed('<html><body>Not a feed</body></html>', 'https://x.org'), /not an RSS/);
});

test('events are read from schema.org data, with category and free entry', () => {
  const html = `<script type="application/ld+json">{"@context":"https://schema.org","@type":"Event","name":"Karaoke &amp; Friends","startDate":"2026-10-22T21:00+0200","location":{"@type":"Place","name":"gentleM","address":{"addressLocality":"Essen"}},"image":["https://s3.eu-central-1.amazonaws.com/rausgegangen/abc.png"],"offers":{"price":"0.00"}}</script>
    <script type="application/ld+json">{"@type":"BreadcrumbList","itemListElement":[{"position":1,"name":"Essen"},{"position":2,"name":"Party"}]}</script>`;
  const [e] = parseEvents(html, 'https://rausgegangen.de/en/events/k/', { city: 'Essen', source: 'R' });
  assert.equal(e.title, 'Karaoke & Friends');
  assert.equal(e.city, 'Essen');
  assert.equal(e.category, 'Party');
  assert.equal(e.free, true);
  assert.match(e.image, /^https:\/\/imageflow\.rausgegangen\.de\/url\/https%3A\/\/s3/);
  assert.equal(eventCategory(e), 'Nightlife');
  const list = parseEvents('<script type="application/ld+json">{"@type":"ItemList","itemListElement":[{"item":{"@type":"Event","name":"Megareggaeton","startDate":"2026-11-14","url":"https://eventbrite.com/e/1"}}]}</script>', 'https://eventbrite.de/d/x');
  assert.equal(list[0].link, 'https://eventbrite.com/e/1');
  assert.equal(list[0].free, false);
});

test('event helpers: links, categories, English-friendly', () => {
  const links = rausgegangenLinks('<a href="/en/events/a-1/">A</a><a href="/en/events/a-1/">A</a><a href="/en/events/b-2/">B</a>', 'https://rausgegangen.de/en/essen/');
  assert.deepEqual(links, ['https://rausgegangen.de/en/events/a-1/', 'https://rausgegangen.de/en/events/b-2/']);
  assert.equal(eventCategory({ category: 'Concerts & Music', title: 'Jazz night' }), 'Music');
  assert.equal(eventCategory({ category: '', title: 'Weihnachtsmarkt Steele' }), 'Food & markets');
  assert.equal(eventCategory({ category: 'Exhibition', title: 'Gustave Courbet' }), 'Culture');
  assert.equal(eventCategory({ category: '', title: 'Something' }), 'Other');
  assert.ok(englishFriendly({ title: 'International Language Exchange Essen', summary: '' }));
});

test('og:image, picture upgrades and Wikipedia facts', () => {
  assert.equal(ogImage('<head><meta property="og:image" content="/pic.jpg"></head>', 'https://x.org/a'), 'https://x.org/pic.jpg');
  assert.equal(upgradeImage('https://ichef.bbci.co.uk/ace/standard/240/cpsprodpb/x.jpg'), 'https://ichef.bbci.co.uk/ace/standard/976/cpsprodpb/x.jpg');
  const f = parseWikiFeatured({
    onthisday: [{ year: 2014, text: 'A shooting happened.', pages: [] }, { year: 1987, text: 'An opera premiered.', pages: [{ content_urls: { desktop: { page: 'https://en.wikipedia.org/wiki/Opera' } }, thumbnail: { source: 'https://up/x.jpg' } }] }],
    dyk: [{ text: '... that a pig was announced by a town crier?', html: '... that <b><a href="https://en.wikipedia.org/wiki/Pig">a pig</a></b> was announced?' }]
  });
  assert.deepEqual(f.onthisday.map(o => o.year), [1987]);
  assert.equal(f.dyk[0].link, 'https://en.wikipedia.org/wiki/Pig');
  assert.match(f.dyk[0].text, /^… that/);
});
