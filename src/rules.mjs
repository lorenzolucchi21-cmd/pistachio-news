// Content rules for pistachio news: filters, scoring, story clustering. Used by scripts/build.mjs and the tests.

// Whole-word matcher for several languages. A trailing * allows any ending ("energ*" matches "energía").
// JavaScript's \b only knows ASCII letters, so word edges are checked with Unicode letter classes instead.
export function terms(list) {
  const parts = list.map(t => {
    const prefix = t.endsWith('*');
    const body = (prefix ? t.slice(0, -1) : t).replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/ /g, '[\\s\\-]+');
    return prefix ? body : body + '(?![\\p{L}\\p{N}])';
  });
  return new RegExp(`(?<![\\p{L}\\p{N}])(?:${parts.join('|')})`, 'iu');
}

export const ENERGY = terms([
  'energy', 'energies', 'electricity', 'power grid*', 'power price*', 'power plant*', 'power market*', 'power station*', 'power sector', 'grid', 'grids',
  'gas', 'lng', 'oil', 'crude', 'opec*', 'petrol', 'diesel', 'fuel', 'fuels', 'renewable*', 'solar', 'wind farm*', 'wind power', 'wind turbine*', 'offshore wind', 'onshore wind',
  'nuclear', 'reactor*', 'hydrogen', 'battery storage', 'coal', 'carbon price*', 'emissions trading', 'utility', 'utilities', 'heat pump*', 'decarbonis*', 'decarboniz*',
  'net zero', 'blackout*', 'pipeline*', 'refiner*', 'power cut*', 'e.on', 'rwe', 'eni', 'enel', 'iberdrola', 'endesa', 'naturgy', 'repsol', 'uniper', 'enbw', 'vattenfall',
  'totalenergies', 'equinor', 'snam', 'terna', 'enagás', 'red eléctrica', 'tennet', 'amprion', 'ørsted', 'orsted', 'gazprom', 'aramco', 'iea', 'acer', 'entso-e',
  'energie*', 'strom', 'strompreis*', 'stromnetz*', 'stromsteuer', 'stromversorg*', 'stromerzeug*', 'strommarkt*', 'erdgas*', 'gaspreis*', 'gasspeicher*', 'gaskraftwerk*',
  'gasversorgung', 'gasumlage', 'flüssiggas', 'lng-terminal*', 'öl', 'ölpreis*', 'erdöl*', 'kohle', 'kohleausstieg', 'kohlekraftwerk*', 'atomkraft*', 'kernkraft*', 'akw',
  'windkraft*', 'windenergie', 'windpark*', 'photovoltaik', 'solaranlage*', 'solarstrom', 'wasserstoff*', 'netzentgelt*', 'kraftwerk*', 'heizungsgesetz', 'wärmepumpe*',
  'wärmewende', 'energiewende', 'netzausbau', 'bundesnetzagentur', 'co2-preis*', 'emissionshandel', 'stadtwerke', 'spritpreis*', 'benzinpreis*', 'erneuerbare*',
  'energía*', 'energétic*', 'electricidad', 'eléctrica', 'eléctricas', 'precio de la luz', 'factura de la luz', 'tarifa de la luz', 'gasista*', 'petróleo', 'crudo',
  'renovable*', 'eólica*', 'eólico*', 'fotovoltaic*', 'hidrógeno', 'apagón', 'gasolina*', 'carburante*', 'baterías', 'almacenamiento energético', 'autoconsumo', 'cnmc',
  'energia', 'energetic*', 'elettricità', 'elettrica', 'elettriche', 'bollett*', 'petrolio', 'greggio', 'rinnovabil*', 'eolic*', 'solare', 'nucleare', 'idrogeno',
  'rete elettrica', 'carburant*', 'benzina', 'arera', 'pun', 'gse', 'price cap', 'tetto al prezzo', 'caro energia', 'rigassificator*', 'centrale elettrica',
  'centrali elettriche', 'centrale nucleare', 'centrali nucleari'
]);

// Flexibility, balancing and storage: the ancillary-services world.
export const POWER = terms([
  'ancillary service*', 'balancing', 'frequency response', 'frequency regulation', 'fcr', 'afrr', 'mfrr', 'reserve market*', 'capacity market*', 'capacity auction*',
  'bess', 'battery storage', 'battery energy storage', 'grid-scale', 'grid scale', 'negative price*', 'redispatch', 'curtailment', 'intraday', 'day-ahead', 'imbalance',
  'grid congestion', 'flexibility', 'virtual power plant*', 'demand response', 'inertia', 'long-duration storage', 'interconnector*', 'tolling',
  'regelenergie', 'regelleistung', 'batteriespeicher*', 'großbatteriespeicher*', 'netzengpass*', 'negative strompreise', 'primärregel*', 'sekundärregel*', 'netzbooster'
]);

export const SPORT = terms([
  'football', 'soccer', 'champions league', 'europa league', 'premier league', 'bundesliga', 'serie a', 'laliga', 'la liga', 'fußball*', 'calcio', 'fútbol', 'tennis',
  'formula 1', 'formula one', 'f1', 'nba', 'nfl', "ballon d'or", 'ballon d’or', 'olympi*', 'world cup', 'grand prix', 'golf', 'cricket', 'rugby', 'motogp', 'tour de france',
  'handball', 'ski alpin', 'weltcup', 'mondiali', 'wimbledon', 'torschütze*', 'gol', 'goles', 'doppietta', 'stürmer', 'allenatore', 'entrenador',
  'bvb', 'schalke', 's04', 'rot-weiss essen', 'rot-weiß essen', 'vfl bochum', 'fortuna düsseldorf', 'msv duisburg', 'trikot*', 'spieltag', 'liga', 'nba', 'atp', 'wta'
]);

const JUNK = terms([
  'horoscope*', 'horoskop*', 'oroscopo*', 'horóscopo*', 'recipe*', 'rezept', 'rezepte', 'ricetta', 'ricette', 'receta', 'recetas', 'best deals', 'deal of the day',
  'gift guide*', 'black friday', 'prime day', 'coupon*', 'rabatt*', 'schnäppchen', 'sconti', 'lidl', 'aldi', 'quiz', 'crossword', 'kreuzworträtsel', 'cruciverba',
  'sudoku', 'wordle', 'sponsored', 'anzeige', 'advertorial', 'newsletter', 'komplette sendung', 'lotto', 'lottozahlen', 'eurojackpot', 'superenalotto', 'el gordo', 'traffic'
]);

const LIVE = /(^|\s|[–—-])live(:|\s*$|\s+(updates?|blog|news))|\blive[:]|liveblog|live-blog|news-?ticker|\+\+\+|en directo|in diretta|minuto a minuto|as it happened|what we know so far/iu;

const DARK = terms([
  'killed', 'kills', 'dead', 'death', 'deaths', 'dies', 'died', 'murder*', 'shoot*', 'shot', 'shot dead', 'stabbed', 'stabbing', 'rape*', 'abuse*', 'suicide', 'massacre',
  'terror*', 'bomb*', 'genocide', 'overdose', 'kidnap*', 'abduct*', 'morgue', 'corpse', 'assault*', 'sexual*', 'molest*', 'trafficking', 'toddler', 'infant', 'injured', 'pornogr*',
  'mauled', 'bitten', 'dragged under',
  'tot', 'tote', 'toten', 'getötet', 'mord', 'mörder*', 'vergewaltig*', 'missbrauch*', 'leiche*', 'unfall', 'verletzt*', 'entführ*', 'muerto*', 'muerta*',
  'asesin*', 'violaci*', 'fallecid*', 'herido*', 'secuestr*', 'morto', 'morta', 'morti', 'uccis*', 'omicidio', 'femminicidio', 'stupro', 'cadavere', 'abusi',
  'ferit*', 'rapit*', 'pedofil*', 'child porn*'
]);
// Light-hearted cues: animals, food, odd places, silly behaviour.
const FUNNY = terms([
  'alligator*', 'gator*', 'python*', 'iguana*', 'raccoon*', 'manatee*', 'flamingo*', 'goat*', 'pig', 'pigs', 'chicken*', 'monkey*', 'cat', 'cats', 'dog', 'dogs', 'parrot*',
  'shark*', 'squirrel*', 'naked', 'nude', 'drunk', 'beer', 'taco*', 'burrito*', 'pizza*', 'mcdonald*', 'wendy*', 'walmart', 'golf cart', 'lawn mower', 'toilet*', 'hot tub',
  'drive-thru', 'sword', 'costume', 'wig', 'pretend*', 'impersonat*', 'bizarre', 'weird', 'strange', 'wild', 'swallow*', 'cheese', 'sausage*',
  'world record', 'guinness', 'accidentally', 'mistakenly', 'confused', 'giant', 'tiny', 'banana*', 'duck*', 'cow', 'cows', 'bear', 'bears', 'llama*', 'emu', 'kangaroo*',
  'kurios*', 'skurril*', 'tierisch', 'katze*', 'hund', 'hunde', 'wurst', 'rekord', 'insólit*', 'surrealista', 'rocambolesc*', 'gato', 'perro', 'insolit*', 'bizzarr*',
  'surreale', 'gatto', 'cane', 'squalo', 'animali', 'animale'
]);

const ESSEN_FUN = terms([
  'veranstaltung*', 'konzert*', 'festival*', 'ausstellung*', 'museum*', 'theater', 'kino*', 'film', 'markt', 'märkte', 'weihnachtsmarkt*', 'kirmes', 'party', 'partys',
  'club', 'clubs', 'bar', 'bars', 'kneipe*', 'restaurant*', 'café*', 'cafe*', 'gastro*', 'eröffn*', 'neueröffn*', 'tipps', 'tipp', 'wochenende', 'freizeit*', 'ausflug*',
  'park', 'grugapark', 'baldeneysee', 'zollverein', 'rüttenscheid', 'lichtburg', 'philharmonie', 'aalto', 'grillo', 'folkwang', 'kultur*', 'lesung*', 'comedy', 'kabarett',
  'flohmarkt*', 'food', 'street-food', 'streetfood', 'brunch', 'halloween', 'lichtwochen', 'oper', 'ballett', 'musical*', 'dj', 'tanz*', 'rave', 'techno', 'jazz', 'rock',
  'sommerfest', 'stadtfest', 'straßenfest', 'fischmarkt', 'biergarten*', 'eisbahn', 'winterwelt', 'ruhrtriennale', 'extraschicht', 'karaoke', 'kneipenquiz', 'ausgehen', 'show',
  'premiere', 'bühne', 'messe', 'pizza*', 'burger*', 'döner', 'eis', 'bäckerei', 'weinfest', 'kunst*', 'galerie*', 'führung*', 'event*', 'feiern', 'spaß'
]);
const ESSEN_SKIP = terms([
  'polizei', 'unfall*', 'festgenommen', 'festnahme', 'prozess', 'gericht*', 'brand', 'feuerwehr', 'notdienst', 'apotheke*', 'blitzer*', 'stau', 'tot', 'tote', 'toter',
  'getötet', 'messer*', 'verletzt*', 'angriff*', 'razzia', 'raub*', 'diebstahl', 'einbruch*', 'haftbefehl', 'mord*', 'vermisst*', 'insolvenz*', 'todesfall', 'leiche*',
  'schüsse', 'gestorben', 'stirbt', 'schlägerei', 'kriminal*', 'täter*', 'traueranzeige*', 'nachruf', 'kündigung*', 'stellenabbau', 'afd', 'wahl', 'ratssitzung', 'bebauungsplan'
]);
const RUHR = terms(['essen', 'essener', 'ruhr*', 'rüttenscheid', 'zollverein', 'bochum', 'dortmund', 'duisburg', 'gelsenkirchen', 'mülheim', 'oberhausen', 'düsseldorf', 'duesseldorf', 'baldeneysee', 'grugapark']);

const OPINION_URL = /\/(opinion|opinions|commentisfree|meinung|kommentare?|debatte|opinioni|editoriali?|idee|tribuna|columnas?|columnists?|analisi|analysis)(\/|-|$)/i;
const OPINION_TITLE = /^(opinion|analysis|comment|kommentar|meinung|analyse|essay|gastbeitrag|análisis|tribuna|editorial|l['’]analisi|il commento|l['’]editoriale)\s*[:|–—-]|the guardian view on|\bop-ed\b|^kommentar zu/i;

// Signs of a reflective piece rather than a plain report.
const REFLECT = terms([
  'why', 'how', 'what it means', 'what does', 'the case for', 'the case against', 'lesson*', 'should', 'must', 'we need', 'rethink*', 'the real', 'the truth about',
  'the problem with', 'myth*', 'future of', 'era of', 'end of', 'age of', 'warum', 'wieso', 'weshalb', 'was bedeutet', 'sollte*', 'müssen', 'lehre*', 'zukunft',
  'por qué', 'qué significa', 'debería*', 'lección*', 'reflexi*', 'ensayo', 'perché', 'cosa significa', 'dovrebbe*', 'lezione*', 'riflession*', 'il senso',
  'democra*', 'populis*', 'identit*', 'philosoph*', 'filosof*', 'ethic*', 'ethik', 'etica', 'ética', 'moral*', 'crisis', 'krise', 'crisi', 'paradox*', 'paradoss*', 'paradoj*'
]);
const HARD_NEWS = terms([
  'arrested', 'arrests', 'detained', 'dies', 'died', 'killed', 'dead', 'death toll', 'injured', 'wounded', 'police said', 'festgenommen', 'tote', 'verletzte',
  'detenidos', 'detenido', 'muertos', 'heridos', 'arrestati', 'arrestato', 'morti', 'feriti', 'breaking', 'eilmeldung', 'última hora', "ultim'ora", 'ultim’ora'
]);

const ENERGY_SIGNALS = [
  [terms(['crisis', 'crises', 'shortage*', 'blackout*', 'outage*', 'emergency', 'price spike*', 'surge*', 'soar*', 'record', 'krise', 'engpass', 'rekord*', 'apagón', 'escasez', 'récord', 'crisi', 'carenza', 'impennata', 'caro']), 3],
  [terms(['regulat*', 'law', 'bill', 'directive', 'auction*', 'tender*', 'subsid*', 'price cap', 'cap', 'tariff*', 'market design', 'reform*', 'eu', 'commission', 'government', 'ministry', 'gesetz*', 'verordnung', 'ausschreibung*', 'regierung', 'bundesnetzagentur', 'ley', 'real decreto', 'subasta*', 'gobierno', 'ministerio', 'cnmc', 'legge', 'decreto', 'asta', 'aste', 'governo', 'ministero', 'arera', 'tetto']), 2],
  [/\d[\d.,]*\s?(gw|mw|twh|gwh|bcm|mtpa|%|per ?cent|prozent|por ciento|per cento)(?![\p{L}])/iu, 2],
  [terms(['billion', 'bn', 'milliard*', 'miliardi', 'mil millones', 'largest', 'biggest', 'größte*', 'mayor', 'più grande', 'fid', 'final investment decision', 'gigafactory', 'megaproject*']), 2]
];

const ENERGY_ALL = new RegExp(ENERGY.source, 'giu');
const distinctMatches = (re, s) => new Set((String(s).match(re) || []).map(m => m.toLowerCase())).size;
// Small stop-word list to spot English articles that appear in a German, Spanish or Italian feed.
const looksEnglish = t => { const m = String(t).match(/\b(the|and|of|to|for|with|is|are|how|why|what|from|its)\b/gi) || []; return m.length >= 2 && m.some(w => w.toLowerCase() === 'the'); };
const FUN_JUNK = terms(['trailer', 'episodio', 'puntata', 'staffel', 'folge', 'serie tv', 'temporada', 'capítulo', 'video', 'vídeo', 'gadget', 'offerta', 'oferta', 'smartphone', 'edizione speciale']);

// Each filter receives the headline plus summary, and the article itself.
export const FILTERS = {
  // A general feed's story counts as energy news if the headline says so, or the summary clearly does (three different energy terms).
  energy: (t, a) => ENERGY.test(a.title) || distinctMatches(ENERGY_ALL, a.summary) >= 3,
  power: t => POWER.test(t),
  ruhr: t => RUHR.test(t),
  essenFun: (t, a) => ESSEN_FUN.test(a.title) && !ESSEN_SKIP.test(t),
  notSport: t => !SPORT.test(t),
  notLifestyle: t => !JUNK.test(t),
  notShopping: t => !JUNK.test(t) && !/\branked\b|best .* (of|for) 20\d\d/i.test(t),
  quirky: (t, a) => !SPORT.test(a.title) && !DARK.test(t) && !JUNK.test(t) && !FUN_JUNK.test(a.title),
  floridaMan: t => /florida (man|woman|men|women|couple|teen|grandma|grandpa|deputies)/i.test(t) && !DARK.test(t) && !/\b(child|children|kids?|school|students?|daughter|son)\b/i.test(t)
};

export const SECTIONS = {
  'front.world': { days: 2 },
  'front.ideas': { days: 7, out: 16, fresh: [6, 1.2] },
  'front.long': { days: 21, out: 6, fresh: [3, 0.2] },
  'front.de': { days: 5, out: 8, fresh: [6, 1.5] },
  'front.es': { days: 5, out: 8, fresh: [6, 1.5] },
  'front.it': { days: 5, out: 8, fresh: [6, 1.5] },
  'energy.world': { days: 5, out: 14, fresh: [6, 1.5], perSource: 2 },
  'energy.analysis': { days: 14, out: 8, fresh: [4, 0.4] },
  'energy.power': { days: 10, out: 8, fresh: [5, 0.6] },
  'energy.de': { days: 6, out: 8, fresh: [6, 1.2] },
  'energy.es': { days: 6, out: 8, fresh: [6, 1.2] },
  'energy.it': { days: 6, out: 8, fresh: [6, 1.2] },
  'culture.ideas': { days: 21, out: 10, fresh: [4, 0.25] },
  'culture.arts': { days: 10, out: 8, fresh: [4, 0.5] },
  'culture.de': { days: 10, out: 7, fresh: [4, 0.5] },
  'culture.es': { days: 10, out: 7, fresh: [4, 0.5] },
  'culture.it': { days: 10, out: 7, fresh: [4, 0.5] },
  'culture.essen': { days: 10, out: 10, fresh: [4, 0.5] },
  'fun.odd': { days: 10, out: 12, fresh: [4, 0.5] },
  'fun.florida': { days: 14, out: 5, fresh: [4, 0.3] },
  'fun.de': { days: 10, out: 6, fresh: [4, 0.5] },
  'fun.es': { days: 10, out: 6, fresh: [4, 0.5] },
  'fun.it': { days: 10, out: 6, fresh: [4, 0.5] },
  'fun.good': { days: 10, out: 6, fresh: [4, 0.5] },
  'fun.satire': { days: 10, out: 8, fresh: [4, 0.5], perSource: 2 }
};

export function kindOf(a, sourceKind = 'news') {
  if (sourceKind === 'satire' || sourceKind === 'odd' || sourceKind === 'local') return sourceKind;
  if (OPINION_TITLE.test(a.title) || (sourceKind === 'news' && OPINION_URL.test(a.link))) return 'opinion';
  return sourceKind;
}

export function score(a, section, weight = 0) {
  const page = section.split('.')[0];
  const head = a.title, text = a.title + ' ' + (a.summary || '');
  let s = weight + (a.summary ? 1 : 0);
  if (page === 'front') {
    if (a.kind === 'opinion' || a.kind === 'analysis') s += 3;
    if (REFLECT.test(head)) s += 2;
    if (/[?¿]\s*$/.test(head)) s += 1;
    if (HARD_NEWS.test(text)) s -= 2;
  } else if (page === 'energy') {
    if (a.kind === 'opinion' || a.kind === 'analysis') s += 2;
    for (const [re, w] of ENERGY_SIGNALS) if (re.test(text)) s += w;
    if (REFLECT.test(head)) s += 1;
  } else if (page === 'culture') {
    if (a.kind === 'analysis') s += 1;
    if (REFLECT.test(head)) s += 1;
  } else if (page === 'fun') {
    if (FUNNY.test(head)) s += 3;
  }
  if (a.letters) s -= 3;
  return s;
}

// Cartoons, podcasts, videos and newsletters are not reads.
const NOT_A_READ = /[–—-]\s*(cartoon|podcast|video|the latest|as it happened)\s*$|\b(morning|evening|weekend|monday|tuesday|wednesday|thursday|friday|saturday|sunday) briefing\b|^lit hub daily\b|^(el roto|peridis|riki blanco|flavita banana|sciammarella|ferreres|malagón|padylla|nieto|forges|ermengol|sansón|gallego & rey|kap|cinto)\s*[:|]/i;

// Boilerplate that some feeds append to their summaries.
function cleanSummary(s) {
  return String(s || '')
    .replace(/\s*The post .{3,300}? appeared first on .{2,80}?\.?\s*$/i, '')
    .replace(/\s*submitted by\s+\/u\/\S+.*$/i, '')
    .replace(/\s*-\s*by\s+[^-]{2,80}?\s+Read (more )?on (Aeon|Psyche)\.?\s*$/i, '')
    .replace(/\s*(Continue reading|Weiterlesen|Leer más|Leggi tutto|Read more)\s*(\.\.\.|…)?\s*$/i, '')
    .trim();
}

// Returns a cleaned article, or null when it fails the source's filters or the general quality rules.
export function prepare(raw, source) {
  const a = {
    title: String(raw.title || '').trim(), summary: cleanSummary(raw.summary),
    link: raw.link, date: raw.date, source: raw.source || source.name, author: cleanAuthor(raw.author), image: raw.image || ''
  };
  if (!a.title || !/^https?:\/\//i.test(a.link || '') || Number.isNaN(Date.parse(a.date))) return null;
  // Some feeds repeat the headline twice in the title field, sometimes behind a "Watch:" label.
  a.title = a.title.replace(/^(watch|look|video|photos?|listen)\s*:\s*/i, '').replace(/^(.{12,}?)\s+\1$/u, '$1');
  // "Headline | Author name" (The Guardian) becomes a clean headline plus byline.
  const tail = a.title.match(/^(.*\S)\s+\|\s+([\p{Lu}][\p{L}'’.\- ]{1,40})$/u);
  if (tail && tail[2].trim().split(/\s+/).length <= 4) {
    a.title = tail[1];
    const who = tail[2].trim();
    if (/^letters?$/i.test(who)) a.author = 'Letters';
    else if (/^editorial$/i.test(who)) a.author = 'Editorial';
    else if (!a.author) a.author = who;
  }
  if (a.author === 'Letters') a.letters = true;
  if (source.urlMatch && !new RegExp(source.urlMatch, 'i').test(a.link)) return null;
  if (source.urlExclude && new RegExp(source.urlExclude, 'i').test(a.link)) return null;
  const t = a.title + ' ' + a.summary;
  if (LIVE.test(a.title) || JUNK.test(a.title) || NOT_A_READ.test(a.title)) return null;
  const [page, slot] = source.section.split('.');
  if ((page === 'front' || page === 'culture' || page === 'energy') && SPORT.test(a.title)) return null;
  if (page === 'fun' && source.kind !== 'satire' && DARK.test(a.title)) return null;
  // The country columns are read in the original language; English versions of the same piece are skipped.
  if (['de', 'es', 'it'].includes(slot) && looksEnglish(a.title)) return null;
  for (const f of source.filter || []) if (!FILTERS[f]?.(t, a)) return null;
  a.summary = shorten(a.summary, 300);
  a.kind = kindOf(a, source.kind);
  a.lang = source.lang === 'us' ? 'en' : source.lang || 'en';
  a.section = source.section;
  a.origin = source.name;
  if (source.metered) a.metered = true;
  a.score = score(a, source.section, source.weight || 0);
  a.date = new Date(a.date).toISOString();
  return a;
}

function cleanAuthor(v) {
  let s = String(v || '').replace(/\s+/g, ' ').trim();
  s = s.replace(/^.*?:\s*[^-]+ - /, '').replace(/^(kommentar|ein kommentar|eine kolumne|kolumne|gastbeitrag|analyse|essay)\s+(von|de|di)\s+/i, '').replace(/^(von|by|por|di)\s+/i, '');
  if (!s || s.length > 60 || /@|^(el país|redazione|redacción|redaktion|spiegel|zeit online|the conversation)$/i.test(s)) return '';
  return s;
}

export function shorten(s, n) {
  s = String(s || '').replace(/\s+/g, ' ').trim();
  if (s.length <= n) return s;
  const cut = s.slice(0, n);
  return cut.slice(0, Math.max(cut.lastIndexOf(' '), n - 30)).replace(/[\s,;:.–—-]+$/, '') + '…';
}

export function freshness(a, section, now = new Date()) {
  const [pts, perDay] = SECTIONS[section]?.fresh || [4, 1];
  const ageDays = Math.max(0, (now - new Date(a.date)) / 864e5);
  return Math.max(0, pts - ageDays * perDay * pts / 4);
}

export function rank(list, section, now = new Date(), perSource = SECTIONS[section]?.perSource ?? 3) {
  const sorted = [...list].sort((a, b) => (b.score + freshness(b, section, now)) - (a.score + freshness(a, section, now)) || new Date(b.date) - new Date(a.date));
  const seen = {};
  const first = [], rest = [];
  for (const a of sorted) ((seen[a.origin] = (seen[a.origin] || 0) + 1) <= perSource ? first : rest).push(a);
  return [...first, ...rest];
}

function canonicalUrl(value) {
  try {
    const u = new URL(value);
    u.hash = '';
    for (const k of [...u.searchParams.keys()]) if (/^(utm_.+|fbclid|gclid|ref|cmpid|at_.+|wt_.+)$/i.test(k)) u.searchParams.delete(k);
    u.searchParams.sort();
    u.hostname = u.hostname.toLowerCase().replace(/^www\./, '');
    u.pathname = u.pathname.replace(/\/+$/, '') || '/';
    return u.href;
  } catch { return ''; }
}
const normTitle = t => t.normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();

// Keeps the first occurrence of each link or headline; within a section the highest-scoring copy wins.
export function dedupe(list) {
  const urls = new Set(), titles = new Set();
  return [...list].sort((a, b) => b.score - a.score || new Date(b.date) - new Date(a.date)).filter(a => {
    const key = a.section + '|';
    const u = key + canonicalUrl(a.link), t = key + normTitle(a.title);
    const dup = urls.has(u) || titles.has(t);
    urls.add(u); titles.add(t);
    return !dup;
  });
}

export function windowStart(days, now = new Date()) {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - (days - 1));
  return d;
}

// Two news reports about the same event from different outlets ("La CNMC avala la subasta…" / "La CNMC respalda la subasta…").
export function sameStory(a, b) {
  const x = new Set(tokens(a.title)), y = new Set(tokens(b.title));
  if (!x.size || !y.size) return false;
  let n = 0;
  for (const w of x) if (y.has(w)) n++;
  return n >= 4 || (n >= 3 && n / Math.min(x.size, y.size) >= 0.5);
}

// ---- Story clustering: which stories are covered by the most outlets right now ----

const STOP = new Set(('the and for with from that this after over into about says said will would could should new more than have has been were what when where which who whom why how ' +
  'its their they them his her our your you not but are was all can may amid also just like out off now first last year years time day days week weeks people world news ' +
  'live latest update updates report reports video watch analysis opinion view guardian bbc politico euronews reuters there here some many most much other another one two three ' +
  'four five against under before while during between because since until still being does did get gets got make makes made take takes took back down only even ever very ' +
  'want wants call calls called set sets told tell tells say amid among across around next major big key top could least least within without upon toward towards per via ' +
  'der die das und mit von für den dem des ein eine einer nicht sich auch nach wie bei aus zum zur ist sind wird werden hat haben über unter gegen ' +
  'los las del una por para con que como sus más sobre entre tras ante desde hasta pero sin ' +
  'gli della delle degli dei nel nella con per una che come sul sulla tra fra dopo anche più non sono').split(' '));

export function tokens(text) {
  return String(text || '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/['’]s\b/g, '').split(/[^a-z0-9]+/)
    .map(w => (w.length > 4 && w.endsWith('s') && !w.endsWith('ss') ? w.slice(0, -1) : w))
    .filter(w => w.length >= 3 && !STOP.has(w) && !/^\d+$/.test(w));
}

function profile(a) {
  const p = new Map();
  for (const w of tokens(a.summary).slice(0, 30)) p.set(w, 0.5);
  for (const w of tokens(a.title)) p.set(w, 1);
  return p;
}

function idfTable(docs) {
  const df = new Map();
  for (const d of docs) for (const w of d.keys()) df.set(w, (df.get(w) || 0) + 1);
  const n = docs.length || 1;
  return w => Math.log((n + 1) / ((df.get(w) || 0) + 0.5));
}

function similarity(pa, pb, idf, minShared = 1, needTitle = false) {
  let s = 0, shared = 0, inTitles = 0;
  for (const [w, wa] of pa) { const wb = pb.get(w); if (wb) { s += Math.min(wa, wb) * idf(w); shared++; if (wa === 1 && wb === 1) inTitles++; } }
  return shared >= minShared && (!needTitle || inTitles > 0) ? s : 0;
}

// Groups hard-news items about the same event and ranks the groups by how many different outlets cover them.
// An item joins a group only if it is close to the group as a whole, not just to one member, so groups do not drift.
// Two items must share at least three words, one of them in both headlines: "South Korea" alone does not make
// a shark rescue part of a North Korea story.
export function clusterStories(items, { threshold = 7.5, now = new Date() } = {}) {
  const docs = items.map(a => ({ a, p: profile(a) }));
  const idf = idfTable(docs.map(d => d.p));
  const sims = (d, c) => c.members.map(m => similarity(d.p, m.p, idf, 3, true));
  const fits = s => Math.max(...s) >= threshold && s.reduce((x, y) => x + y, 0) / s.length >= threshold * 0.5;
  let clusters = [];
  for (const d of [...docs].sort((x, y) => new Date(y.a.date) - new Date(x.a.date))) {
    let best = null, bestSim = 0;
    for (const c of clusters) {
      const s = sims(d, c);
      const top = Math.max(...s);
      if (fits(s) && top > bestSim) { best = c; bestSim = top; }
    }
    if (best) best.members.push(d);
    else clusters.push({ members: [d] });
  }
  // Second pass: merge groups that turned out to be about the same story.
  for (let merged = true; merged;) {
    merged = false;
    outer: for (let i = 0; i < clusters.length; i++) for (let j = i + 1; j < clusters.length; j++) {
      const s = clusters[j].members.flatMap(d => sims(d, clusters[i]));
      if (fits(s) && Math.max(...s) >= threshold * 1.2) {
        clusters[i].members.push(...clusters[j].members);
        clusters.splice(j, 1);
        merged = true;
        break outer;
      }
    }
  }
  clusters = clusters.map(c => {
    const arts = c.members.map(m => m.a);
    const outlets = new Set(arts.map(a => a.source.toLowerCase()));
    const newest = Math.max(...arts.map(a => +new Date(a.date)));
    const hours = (now - newest) / 36e5;
    const weight = 3 * outlets.size + arts.length + (hours < 12 ? 2 : hours < 24 ? 1 : 0);
    const terms = new Map();
    for (const m of c.members) for (const [w, v] of m.p) terms.set(w, (terms.get(w) || 0) + v);
    // Defining words: used in several of the story's headlines and rare elsewhere (e.g. "php", "korea", "putin").
    const inTitles = new Map();
    for (const m of c.members) for (const [w, v] of m.p) if (v === 1) inTitles.set(w, (inTitles.get(w) || 0) + 1);
    const keys = [...inTitles].filter(([, k]) => k >= Math.min(2, c.members.length))
      .sort((x, y) => y[1] * idf(y[0]) - x[1] * idf(x[0])).slice(0, 4).map(([w]) => w);
    const lead = pickLead(arts);
    const leadDoc = c.members.find(m => m.a === lead);
    const closeness = new Map(c.members.map(m => [m.a, m === leadDoc ? Infinity : similarity(m.p, leadDoc.p, idf)]));
    return { articles: [...arts].sort((x, y) => closeness.get(y) - closeness.get(x)), lead, outlets: outlets.size, weight, terms, keys };
  });
  return clusters.sort((x, y) => y.weight - x.weight);
}

const LEAD_PREFERENCE = ['The Guardian', 'BBC', 'POLITICO', 'France 24', 'DW', 'Euronews', 'Al Jazeera', 'NPR'];

export function pickLead(articles) {
  const pref = a => { const i = LEAD_PREFERENCE.findIndex(p => a.source.startsWith(p)); return i < 0 ? 99 : i; };
  return [...articles].sort((a, b) => (!!b.image - !!a.image) || (!!b.summary - !!a.summary) || pref(a) - pref(b) || new Date(b.date) - new Date(a.date))[0];
}

// Finds opinion and analysis pieces that discuss the same story, in any of the four languages.
// A piece must share at least two core words of the story (words used by most of its reports), and its own headline
// must contain one of the story's defining words.
export function relatedReads(cluster, pool, { threshold = 6, max = 3 } = {}) {
  const docs = pool.map(a => ({ a, p: profile(a) }));
  const idf = idfTable([...docs.map(d => d.p), cluster.terms]);
  const n = cluster.articles.length;
  const centre = new Map([...cluster.terms].map(([w, v]) => [w, Math.min(1, v / Math.max(1, n / 2))]).filter(([, v]) => v >= 0.25));
  const keys = new Set(cluster.keys || []);
  return docs.map(d => {
    const core = [...d.p.keys()].filter(w => centre.get(w) >= 0.5 && idf(w) > 1.5);
    const onTopic = [...d.p].some(([w, v]) => v === 1 && keys.has(w));
    return { a: d.a, s: similarity(d.p, centre, idf), ok: core.length >= 2 && onTopic };
  }).filter(x => x.ok && x.s >= threshold).sort((x, y) => y.s - x.s).slice(0, max).map(x => x.a);
}
