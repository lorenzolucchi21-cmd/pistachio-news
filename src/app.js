(() => {
  let DATA = window.PISTACHIO;
  const $ = s => document.querySelector(s);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const safe = u => (/^https?:\/\//i.test(u || '') ? u : '');
  const ext = u => `href="${esc(safe(u))}" target="_blank" rel="noopener noreferrer"`;
  const TZ = 'Europe/Berlin';
  const LANG = { de: 'DE', es: 'ES', it: 'IT', en: 'EN' };
  const COUNTRY = { de: 'Deutschland', es: 'España', it: 'Italia' };
  const FLAGS = { de: ['#000', '#dd0000', '#ffce00'], es: ['#aa151b', '#f1bf00', '#aa151b'], it: ['#009246', '#fff', '#ce2b37'] };

  const PAGES = {
    news: { label: 'News', sub: 'Big stories & reflections', color: 'var(--news)', render: renderNews,
      links: [['big', "Today's big stories"], ['headlines', 'Also making headlines'], ['opinion', 'Opinion & ideas'], ['long', 'Long reads'], ['europe', 'Deutschland · España · Italia']] },
    energy: { label: 'Energy', sub: 'Markets, policy, power', color: 'var(--energy)', render: renderEnergy,
      links: [['energy-today', 'Energy today'], ['power', 'Power markets & flexibility'], ['energy-analysis', 'Analysis & opinion'], ['energy-europe', 'Deutschland · España · Italia'], ['energy-more', 'More energy news']] },
    culture: { label: 'Culture', sub: 'Ideas, arts & Essen', color: 'var(--culture)', render: renderCulture,
      links: [['ideas', 'Ideas, history & philosophy'], ['essen', 'Around Essen'], ['arts', 'Arts & books'], ['culture-europe', 'Deutschland · España · Italia']] },
    nuts: { label: 'Nuts', sub: 'The lighter side', color: 'var(--nuts)', render: renderNuts,
      links: [['florida', 'Florida Man'], ['odd', 'Odd news'], ['facts', 'Did you know?'], ['good', 'Good news'], ['nuts-europe', 'Kurioses · Insólito · Insolito'], ['satire', 'Satire corner']] }
  };

  // ---------- small helpers ----------
  function ago(d) {
    const t = new Date(d), mins = (Date.now() - t) / 6e4;
    if (Number.isNaN(mins)) return '';
    if (mins < 2) return 'just now';
    if (mins < 60) return `${Math.round(mins)}m ago`;
    if (mins < 24 * 60) return `${Math.round(mins / 60)}h ago`;
    if (mins < 48 * 60) return 'yesterday';
    return t.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: TZ });
  }
  const headline = a => a.titleEn || a.title;
  const empty = (msg = 'Nothing new here right now. Check back in a few hours.') => `<div class="empty">${esc(msg)}</div>`;

  // Some publishers forbid embedding their pictures elsewhere; retry once through a public image cache, then show the placeholder.
  const retry = fail => `if(!this.dataset.retry){this.dataset.retry=1;this.src='https://images.weserv.nl/?w=900&url='+encodeURIComponent(this.src)}else{${fail}}`;
  function media(a, label) {
    const lbl = esc(label || a.source || '');
    if (safe(a.image)) return `<div class="media" data-label="${lbl}"><img src="${esc(a.image)}" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer" onerror="${retry("this.parentNode.classList.add('ph');this.remove()")}"></div>`;
    return `<div class="media ph" data-label="${lbl}"></div>`;
  }
  // Rows with picture slots: prefer well-ranked stories that have a picture (looking no further than twice the slots).
  function picsFirst(items, k) {
    if (!items?.length) return [];
    const cand = items.slice(0, k * 2);
    const chosen = new Set([...cand.filter(a => safe(a.image)), ...cand.filter(a => !safe(a.image))].slice(0, k));
    return [...items.filter(a => chosen.has(a)), ...items.filter(a => !chosen.has(a))];
  }
  function meta(a, { lang = false, source = true, author = false } = {}) {
    const parts = [];
    if (author && a.author && a.author !== 'Letters') parts.push(`<span>${esc(a.author)}</span>`);
    if (source) parts.push(`<span>${esc(a.source)}</span>`);
    parts.push(`<span>${esc(ago(a.date))}</span>`);
    if (lang && LANG[a.lang] && a.lang !== 'en') parts.push(`<span class="badge badge-lang">${LANG[a.lang]}</span>`);
    if (a.metered) parts.push('<span class="badge badge-metered" title="The publisher allows a few free articles, then asks for a subscription">metered</span>');
    if (a.kind === 'satire') parts.push('<span class="badge badge-satire">Satire</span>');
    return `<div class="meta">${parts.join('')}</div>`;
  }
  const original = a => (a.titleEn && a.titleEn !== a.title ? `<div class="orig" lang="${esc(a.lang)}">${esc(a.title)}</div>` : '');

  function card(a, { size = '', img = true, summary = true, lang = false } = {}) {
    if (!a) return '';
    const op = a.kind === 'opinion';
    const cls = ['card', size, op ? 'op' : '', a.kind === 'satire' ? 'sat' : ''].filter(Boolean).join(' ');
    let kick;
    if (op) kick = a.author && a.author !== 'Letters' ? `<div class="byline">${esc(a.author)}</div>` : '<div class="kick">Opinion</div>';
    else kick = `<div class="kick">${esc(a.kind === 'analysis' ? 'Analysis' : a.kind === 'satire' ? a.source : a.source)}</div>`;
    const showSource = op || a.kind === 'analysis';
    return `<a class="${cls}" ${ext(a.link)}>${img ? media(a) : ''}${kick}<h3>${esc(headline(a))}</h3>${original(a)}${summary && a.summary ? `<p>${esc(a.summary)}</p>` : ''}${meta(a, { lang, source: showSource })}</a>`;
  }
  function li(a, { summary = false, outlets = false, lang = false } = {}) {
    const op = a.kind === 'opinion';
    const kick = op && a.author && a.author !== 'Letters' ? `<span class="kick" style="--c:var(--opinion)">${esc(a.author)}</span>` : a.kind === 'analysis' ? '<span class="kick">Analysis</span>' : '';
    const n = outlets && a.outlets > 1 ? ` <span class="n-out">· ${a.outlets} outlets</span>` : '';
    return `<a class="li" ${ext(a.link)}>${kick}<span class="hl">${esc(headline(a))}</span>${n}${original(a)}${summary && a.summary ? `<p>${esc(a.summary)}</p>` : ''}${meta(a, { lang })}</a>`;
  }
  const row = (items, n, opts) => (items?.length ? `<div class="row" style="--n:${n}">${items.map(a => `<div>${card(a, opts)}</div>`).join('')}</div>` : '');
  const list = (items, n, opts) => (items?.length ? `<div class="list" style="--n:${n}">${items.map(a => li(a, opts)).join('')}</div>` : '');
  function fc(id, title, desc, body, { color = '', dark = false } = {}) {
    const style = color ? ` style="--fc:${color};--pillar:${color}"` : '';
    return `<section class="fc${dark ? ' fc-dark' : ''}" id="${id}"${style}><header class="fc-head"><h2>${esc(title)}</h2>${desc ? `<p>${esc(desc)}</p>` : ''}</header><div class="fc-body">${body}</div></section>`;
  }
  const flag = k => `<span class="flag ${k}${k === 'it' ? ' v' : ''}" aria-hidden="true">${FLAGS[k].map(c => `<i style="background:${c}"></i>`).join('')}</span>`;
  function countries(sec, subs, n = 7) {
    return `<div class="countries">${['de', 'es', 'it'].map(k => {
      const l = picsFirst(sec?.[k] || [], 1);
      return `<div class="country" lang="${k}"><div class="country-head">${flag(k)}<h3>${COUNTRY[k]}</h3><span>${esc(subs[k])}</span></div>${l.length ? card(l[0]) + l.slice(1, n).map(a => li(a, { summary: true })).join('') : empty()}</div>`;
    }).join('')}</div>`;
  }
  function feature(a, { label = '' } = {}) {
    if (!a) return '';
    return `<article class="hero"><a ${ext(a.link)} tabindex="-1" aria-hidden="true">${media(a)}</a><div class="hero-text">${label ? `<div class="kick">${esc(label)}</div>` : a.kind === 'opinion' && a.author ? `<div class="byline" style="font:italic 600 19px var(--serif);color:var(--opinion)">${esc(a.author)}</div>` : ''}<h2><a ${ext(a.link)}>${esc(headline(a))}</a></h2>${original(a)}${a.summary ? `<p class="stand">${esc(a.summary)}</p>` : ''}${meta(a)}</div></article>`;
  }

  // ---------- big stories ----------
  function coverage(b) {
    if (!b.coverage?.length) return '';
    return `<p class="coverage">Also reported by ${b.coverage.map(c => `<a ${ext(c.link)} title="${esc(c.title)}">${esc(c.source)}</a>`).join(', ')}</p>`;
  }
  function deeper(items) {
    if (!items?.length) return '';
    return `<div class="deeper"><h4>Go deeper</h4>${items.map(a => `<a ${ext(a.link)}><span class="hl">${esc(a.title)}</span>${meta(a, { lang: true, author: true })}</a>`).join('')}</div>`;
  }
  const outletsTag = b => (b.outlets > 1 ? `<span class="outlets">Covered by ${b.outlets} outlets</span>` : '');
  function hero(b) {
    const a = b.lead;
    return `<article class="hero"><a ${ext(a.link)} tabindex="-1" aria-hidden="true">${media(a)}</a><div class="hero-text">${outletsTag(b)}<h2><a ${ext(a.link)}>${esc(a.title)}</a></h2>${a.summary ? `<p class="stand">${esc(a.summary)}</p>` : ''}${meta(a)}${coverage(b)}${deeper(b.related)}</div></article>`;
  }
  function big2(b) {
    const a = b.lead;
    return `<div><article class="big2"><a ${ext(a.link)} tabindex="-1" aria-hidden="true">${media(a)}</a><div>${outletsTag(b)}<h3><a ${ext(a.link)}>${esc(a.title)}</a></h3>${a.summary ? `<p class="card-p" style="margin:0 0 6px;font:15px/1.4 var(--serif);color:var(--ink-2)">${esc(a.summary)}</p>` : ''}${meta(a)}${coverage(b)}</div>${deeper(b.related)}</article></div>`;
  }

  // ---------- pages ----------
  function renderNews(P) {
    const big = P.big || [];
    const ideas = picsFirst(P.ideas, 8), long = picsFirst(P.long, 3);
    return fc('big', "Today's big stories", 'What most newsrooms are covering right now, with reflective reads to go deeper.',
      big.length ? hero(big[0]) + (big.length > 1 ? `<div class="bigpair">${big.slice(1, 3).map(big2).join('')}</div>` : '') : empty())
      + fc('headlines', 'Also making headlines', 'Other stories covered by several outlets today.', P.more?.length ? list(P.more, 3, { outlets: true }) : empty())
      + fc('opinion', 'Opinion & ideas', 'Columns, editorials and analysis worth a proper read.',
        ideas.length ? row(ideas.slice(0, 4), 4) + row(ideas.slice(4, 8), 4, { size: 'sm' }) + (ideas.length > 8 ? `<div style="margin-top:14px">${list(ideas.slice(8), 4)}</div>` : '') : empty(), { color: 'var(--opinion)' })
      + fc('long', 'Long reads', 'For the coffee break, or the train home.', long.length ? row(long.slice(0, 3), 3, { size: 'lg' }) + (long.length > 3 ? `<div style="margin-top:14px">${list(long.slice(3), 3)}</div>` : '') : empty(), { dark: true })
      + fc('europe', 'Europe, in its own words', 'Opinion and analysis from Germany, Spain and Italy, in the original language.',
        countries(P, { de: 'Meinung & Analyse', es: 'Opinión y análisis', it: 'Opinioni e analisi' }));
  }

  function renderEnergy(P) {
    const lead = picsFirst(P.lead, 5), power = picsFirst(P.power, 4), an = picsFirst(P.analysis, 4), more = picsFirst(P.more, 3);
    return fc('energy-today', 'Energy today', 'Crises, regulation, big numbers and big projects from around the world.',
      lead.length ? feature(lead[0]) + `<div style="margin-top:18px">${row(lead.slice(1, 5), 4, { size: 'sm' })}</div>` : empty())
      + fc('power', 'Power markets & flexibility', 'Balancing, storage and ancillary services – notes for the trading floor.',
        power.length ? row(power.slice(0, 4), 4, { size: 'sm' }) + (power.length > 4 ? `<div style="margin-top:14px">${list(power.slice(4), 4, { lang: true })}</div>` : '') : empty())
      + fc('energy-analysis', 'Analysis & opinion', 'The why behind the numbers.',
        an.length ? row(an.slice(0, 4), 4, { size: 'sm' }) + (an.length > 4 ? `<div style="margin-top:14px">${list(an.slice(4), 4)}</div>` : '') : empty(), { color: 'var(--opinion)' })
      + fc('energy-europe', 'Germany, Spain, Italy', 'National energy news and commentary, in the original language.',
        countries(P, { de: 'Energie', es: 'Energía', it: 'Energia' }))
      + fc('energy-more', 'More energy news', '', more.length ? row(more.slice(0, 3), 3, { size: 'sm' }) + (more.length > 3 ? `<div style="margin-top:14px">${list(more.slice(3), 3)}</div>` : '') : empty());
  }

  function renderCulture(P) {
    const ideas = picsFirst(P.ideas, 5), arts = picsFirst(P.arts, 4);
    return fc('ideas', 'Ideas, history & philosophy', 'Essays to think with.',
      ideas.length ? feature(ideas[0]) + `<div style="margin-top:18px">${row(ideas.slice(1, 5), 4, { size: 'sm' })}</div>` + (ideas.length > 5 ? `<div style="margin-top:14px">${list(ideas.slice(5), 3)}</div>` : '') : empty())
      + fc('essen', 'Around Essen', 'What’s on in Essen, Düsseldorf and Bochum over the next three weeks, plus local news translated from German.', essenBlock(P), { color: 'var(--essen)' })
      + fc('arts', 'Arts & books', '', arts.length ? row(arts.slice(0, 4), 4) + (arts.length > 4 ? `<div style="margin-top:14px">${list(arts.slice(4), 4)}</div>` : '') : empty())
      + fc('culture-europe', 'Culture in Europe', 'Feuilleton, cultura, cultura – in the original language.', countries(P, { de: 'Kultur & Geschichte', es: 'Cultura e ideas', it: 'Cultura' }));
  }

  // ---------- Around Essen ----------
  const evState = { cat: 'All', city: 'All', all: false };
  const CATS = ['Nightlife', 'Music', 'Culture', 'Food & markets', 'Meet people', 'Active', 'Other'];
  const dayKey = d => new Date(d).toLocaleDateString('en-CA', { timeZone: TZ });
  function upcoming(events) {
    const now = Date.now(), today = dayKey(now);
    return (events || []).filter(e => {
      if (e.allDay) return dayKey(e.end || e.start) >= today;
      const end = e.end ? Date.parse(e.end) : Date.parse(e.start) + 3 * 36e5;
      return end >= now;
    });
  }
  function dayLabel(key) {
    const today = dayKey(Date.now()), tomorrow = dayKey(Date.now() + 864e5);
    const d = new Date(key + 'T12:00:00');
    const pretty = d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
    return key === today ? `Today · ${pretty}` : key === tomorrow ? `Tomorrow · ${pretty}` : pretty;
  }
  function evRow(e) {
    const start = new Date(e.start);
    const time = e.allDay ? 'All day' : start.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: TZ });
    const multi = e.end && dayKey(e.end) !== dayKey(e.start) && Date.parse(e.end) - Date.parse(e.start) > 864e5;
    const until = multi ? `<small>until ${new Date(e.end).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: TZ })}</small>` : '';
    const tags = [`<span class="badge">${esc(e.category)}</span>`, e.free ? '<span class="badge badge-free">Free</span>' : '', e.english ? '<span class="badge badge-en">English-friendly</span>' : '', e.more ? `<span class="badge">+${e.more} more date${e.more > 1 ? 's' : ''}</span>` : ''].join('');
    return `<a class="ev" ${ext(e.link)}><div class="ev-time">${time}${until}</div><div><div class="hl">${esc(e.title)}</div><div class="where">${esc([e.venue, e.city].filter(Boolean).join(' · '))}</div><div class="tags">${tags}</div></div><div class="ev-img">${safe(e.image) ? `<img src="${esc(e.image)}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="${retry('this.remove()')}">` : ''}</div></a>`;
  }
  function eventList(events) {
    const l = upcoming(events).filter(e => (evState.cat === 'All' || e.category === evState.cat) && (evState.city === 'All' || e.city === evState.city));
    if (!l.length) return empty('No events match. Try another category or city.');
    const shown = evState.all ? l : l.slice(0, 24);
    const days = new Map();
    for (const e of shown) { const k = dayKey(e.start); if (!days.has(k)) days.set(k, []); days.get(k).push(e); }
    const html = [...days].map(([k, es]) => `<div class="ev-day">${esc(dayLabel(k))}</div><div class="ev-grid">${es.map(evRow).join('')}</div>`).join('');
    return html + (l.length > shown.length ? `<div class="ev-more"><button type="button" class="chip" data-ev-all="1">Show all ${l.length} events</button></div>` : '');
  }
  function eventTools(events) {
    const l = upcoming(events);
    const cats = ['All', ...CATS.filter(c => l.some(e => e.category === c))];
    const cities = ['All', ...[...new Set(l.map(e => e.city).filter(Boolean))].sort((a, b) => (a === 'Essen' ? -1 : b === 'Essen' ? 1 : a.localeCompare(b)))];
    return `<div class="ev-tools">${cats.map(c => `<button type="button" class="chip${c === evState.cat ? ' on' : ''}" data-ev-cat="${esc(c)}">${esc(c === 'All' ? 'Everything' : c)}</button>`).join('')}<select id="evCity" aria-label="City">${cities.map(c => `<option value="${esc(c)}"${c === evState.city ? ' selected' : ''}>${esc(c === 'All' ? 'All cities' : c)}</option>`).join('')}</select></div>`;
  }
  function essenBlock(P) {
    const local = picsFirst(P.essen, 4);
    return `<div id="evBox">${eventTools(P.events)}<div id="evList">${eventList(P.events)}</div></div>`
      + `<div class="subhead">Local news, in English <small>Machine-translated from WAZ, RUHR24 and others; the German headline is underneath.</small></div>`
      + (local.length ? row(local.slice(0, 4), 4, { size: 'sm', summary: false }) + (local.length > 4 ? `<div style="margin-top:14px">${list(local.slice(4), 3)}</div>` : '') : empty())
      + `<div class="subhead">Good places to keep an eye on <small>Venues and calendars worth bookmarking.</small></div>`
      + `<div class="haunts">${(P.haunts || []).map(h => `<a class="haunt" ${ext(h.url)}><b>${esc(h.name)}</b><span>${esc(h.note)}</span></a>`).join('')}</div>`;
  }
  function refreshEvents() {
    const P = DATA.pages.culture;
    const box = $('#evBox');
    if (box) box.innerHTML = `${eventTools(P.events)}<div id="evList">${eventList(P.events)}</div>`;
  }

  // ---------- the lighter side ----------
  function floridaBlock(l) {
    if (!l?.length) return empty();
    const [a, ...rest] = l;
    const pic = safe(a.image) ? media(a) : '<div class="fm-stamp"><b>Florida Man<small>strikes again</small></b></div>';
    return `<div class="florida"><a ${ext(a.link)} tabindex="-1" aria-hidden="true">${pic}</a><div><div class="kick" style="--c:var(--nuts)">${esc(a.source)}</div><h2><a ${ext(a.link)}>${esc(a.title)}</a></h2>${a.summary ? `<p class="stand" style="font:17px/1.4 var(--serif);color:var(--ink-2);margin:0 0 8px">${esc(a.summary)}</p>` : ''}${meta(a, { source: false })}${rest.length ? `<div style="margin-top:14px">${list(rest, 2)}</div>` : ''}</div></div>`;
  }
  function factsBlock(f) {
    if (!f) return empty();
    const dyk = (f.dyk || []).slice(0, 5).map(d => `<li>${safe(d.link) ? `<a ${ext(d.link)}>${esc(d.text)}</a>` : esc(d.text)}</li>`).join('');
    const otd = (f.onthisday || []).slice(0, 4).map(o => `<li class="otd">${safe(o.image) ? `<img src="${esc(o.image)}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.style.visibility='hidden'">` : '<span></span>'}<div><b>${esc(o.year)}</b>${safe(o.link) ? `<a ${ext(o.link)}>${esc(o.text)}</a>` : esc(o.text)}</div></li>`).join('');
    const p = f.picture;
    const potd = p && safe(p.image) ? `<a ${ext(p.link)}><img src="${esc(p.image)}" alt="${esc(p.title)}" loading="lazy" referrerpolicy="no-referrer"></a><p>${esc(p.title)}</p>` : '<p>No picture today.</p>';
    return `<div class="facts"><div><h3>Did you know…</h3><ul>${dyk || '<li>No facts today.</li>'}</ul></div><div><h3>On this day</h3><ul>${otd || '<li>Nothing light-hearted happened, apparently.</li>'}</ul></div><div class="potd"><h3>Picture of the day</h3>${potd}</div></div>`;
  }
  function renderNuts(P) {
    const odd = picsFirst(P.odd, 8), good = picsFirst(P.good, 3), sat = picsFirst(P.satire, 8);
    return fc('florida', 'Florida Man of the week', 'The sunshine state, doing its thing.', floridaBlock(P.florida), { color: 'var(--nuts)' })
      + fc('odd', 'Odd news', 'Strange, silly and oddly wonderful things from around the world.',
        odd.length ? row(odd.slice(0, 4), 4) + row(odd.slice(4, 8), 4, { size: 'sm' }) + (odd.length > 8 ? `<div style="margin-top:14px">${list(odd.slice(8), 4)}</div>` : '') : empty(), { color: 'var(--nuts)' })
      + fc('facts', 'Did you know?', 'Fresh from Wikipedia’s front page.', factsBlock(P.facts), { color: 'var(--brand-2)' })
      + fc('good', 'Good news', 'Because not everything is on fire.', good.length ? row(good.slice(0, 3), 3, { size: 'sm' }) + (good.length > 3 ? `<div style="margin-top:14px">${list(good.slice(3), 3)}</div>` : '') : empty(), { color: 'var(--brand-2)' })
      + fc('nuts-europe', 'Meanwhile in Europe', 'Curious news in the original language.', countries(P, { de: 'Kurioses', es: 'Insólito', it: 'Insolito' }, 6), { color: 'var(--nuts)' })
      + fc('satire', 'Satire corner', 'Not real news. Hopefully.', sat.length ? row(sat.slice(0, 4), 4, { lang: true }) + row(sat.slice(4, 8), 4, { size: 'sm', lang: true }) : empty(), { color: 'var(--nuts)' });
  }

  // ---------- search ----------
  function allArticles() {
    const out = new Map();
    const walk = v => {
      if (Array.isArray(v)) v.forEach(walk);
      else if (v && typeof v === 'object') {
        if (v.title && v.link && v.date && v.source && !out.has(v.link)) out.set(v.link, v);
        Object.values(v).forEach(walk);
      }
    };
    walk(DATA.pages.front); walk(DATA.pages.energy); walk(DATA.pages.fun);
    const c = DATA.pages.culture; walk([c.ideas, c.arts, c.de, c.es, c.it, c.essen]);
    return [...out.values()];
  }
  function renderSearch(q) {
    const words = q.toLowerCase().split(/\s+/).filter(Boolean);
    const res = allArticles().filter(a => { const h = `${a.title} ${a.titleEn || ''} ${a.summary || ''} ${a.source} ${a.author || ''}`.toLowerCase(); return words.every(w => h.includes(w)); })
      .sort((a, b) => new Date(b.date) - new Date(a.date));
    const rows = [];
    for (let i = 0; i < Math.min(res.length, 40); i += 4) rows.push(row(res.slice(i, i + 4), 4, { size: 'sm', lang: true }));
    $('#main').innerHTML = fc('search', 'Search', `${res.length} ${res.length === 1 ? 'story matches' : 'stories match'} “${q}”.`, res.length ? rows.join('') : empty('No stories match. Try another word.'));
  }

  // ---------- shell ----------
  const DATA_KEYS = { news: 'front', energy: 'energy', culture: 'culture', nuts: 'fun' };
  let current = 'news';
  function render() {
    const key = location.hash.replace('#', '') || 'news';
    current = PAGES[key] ? key : 'news';
    const page = PAGES[current];
    document.body.style.setProperty('--pillar', page.color);
    $('#pillars').innerHTML = Object.entries(PAGES).map(([k, p]) => `<a class="pillar${k === current ? ' active' : ''}" href="#${k}" style="--c:${p.color}"${k === current ? ' aria-current="page"' : ''}>${esc(p.label)}<small>${esc(p.sub)}</small></a>`).join('');
    $('#sublinks').innerHTML = page.links.map(([id, label]) => `<a href="#${current}" data-jump="${id}">${esc(label)}</a>`).join('');
    const q = $('#q').value.trim();
    if (q.length >= 2) renderSearch(q);
    else $('#main').innerHTML = page.render(DATA.pages[DATA_KEYS[current]] || {});
    document.title = current === 'news' ? 'pistachio news' : `${page.label} | pistachio news`;
    stamp();
  }
  function stamp() {
    const g = new Date(DATA.generatedAt);
    const when = g.toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: TZ });
    const late = (Date.now() - g) / 36e5 > 8 ? ' (the next update is late)' : '';
    $('#updated').textContent = `Updated ${when}${late}`;
    $('#footUpdated').textContent = `Last collected ${when}`;
    $('#today').textContent = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: TZ });
  }
  function health() {
    const s = DATA.sources || [];
    const ok = s.filter(x => x.status === 'ok').length;
    $('#health').innerHTML = `<b>${ok} of ${s.length} sources reachable at the last collection.</b><div class="health-grid">${s.map(x => x.status !== 'ok'
      ? `<div class="h-fail">● ${esc(x.name)} — unreachable (${esc(x.error)})</div>`
      : x.shown ? `<div class="h-ok">● ${esc(x.name)} — ${x.shown} shown</div>` : `<div class="h-empty">● ${esc(x.name)} — reached, nothing shown now</div>`).join('')}</div>`;
  }
  async function refreshData() {
    try {
      const r = await fetch('news.json', { cache: 'no-store' });
      if (!r.ok) return;
      const d = await r.json();
      if (d?.pages && Date.parse(d.generatedAt) > Date.parse(DATA.generatedAt)) { DATA = d; render(); health(); }
    } catch { /* offline or opened from disk: keep what we have */ }
  }

  window.addEventListener('hashchange', () => { render(); window.scrollTo({ top: 0 }); });
  $('#sublinks').addEventListener('click', e => {
    const a = e.target.closest('[data-jump]');
    if (!a) return;
    e.preventDefault();
    if ($('#q').value) { $('#q').value = ''; render(); }
    document.getElementById(a.dataset.jump)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
  $('#main').addEventListener('click', e => {
    const cat = e.target.closest('[data-ev-cat]');
    if (cat) { evState.cat = cat.dataset.evCat; evState.all = false; refreshEvents(); return; }
    if (e.target.closest('[data-ev-all]')) { evState.all = true; refreshEvents(); }
  });
  $('#main').addEventListener('change', e => { if (e.target.id === 'evCity') { evState.city = e.target.value; evState.all = false; refreshEvents(); } });
  let timer;
  $('#q').addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(render, 200); });
  $('#searchForm').addEventListener('submit', e => { e.preventDefault(); render(); });
  $('#healthToggle').addEventListener('click', e => { const h = $('#health'); h.hidden = !h.hidden; e.target.setAttribute('aria-expanded', String(!h.hidden)); });
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && (Date.now() - Date.parse(DATA.generatedAt)) / 36e5 > 3.2) refreshData(); });

  render();
  health();
  if (location.protocol !== 'file:' && (Date.now() - Date.parse(DATA.generatedAt)) / 36e5 > 3.2) refreshData();
})();
