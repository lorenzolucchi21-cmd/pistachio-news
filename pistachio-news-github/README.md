# pistachio news

*the world, cracked open* — a personal news site for two curious people in Essen.

A static page that GitHub rebuilds automatically every three hours (plus an early-morning run). Four sections:

| Tab | What it shows |
| --- | --- |
| **News** | The 2–3 stories most newsrooms are covering right now (found by grouping headlines from the Guardian, BBC, Al Jazeera, France 24, DW, Euronews, NPR and POLITICO), each with "Go deeper" opinion/analysis pieces about the same story. Then columns, editorials and long reads, and three columns of opinion from Germany, Spain and Italy in the original language. |
| **Energy** | Big energy stories (crises, regulation, big numbers, big projects), power markets & flexibility (balancing, storage, ancillary services), analysis & opinion, and national energy news from Germany, Spain and Italy. |
| **Culture** | Ideas, history & philosophy (Aeon, Psyche, JSTOR Daily, History Today …), arts & books, culture pages from Germany, Spain and Italy, and **Around Essen**: an events calendar for Essen, Düsseldorf and Bochum (from Rausgegangen and Eventbrite) with category and city filters, local news machine-translated into English, and a list of places worth bookmarking. |
| **Nuts** | Florida Man of the week, odd news, Wikipedia's "Did you know / On this day / Picture of the day", good news, curious news in German, Spanish and Italian, and a satire corner (The Onion, Der Postillon, El Mundo Today, Lercio). |

Preference is given to free-to-read publishers. Stories from publishers that allow only a few free articles are marked **metered**; hard-paywalled publishers are filtered out.

## One-time setup (about 10 minutes)

The repository `pistachio-news` already exists on GitHub and is empty.

1. Open the repository page on GitHub and click **uploading an existing file**.
2. Drag in the **contents of this folder**: the `.github`, `config`, `data`, `scripts`, `src` and `test` folders plus `package.json`, `package-lock.json`, `.gitignore` and `README.md`. Do **not** upload `node_modules` or `site`. Click **Commit changes**.
   - If the hidden `.github` folder does not upload by drag-and-drop, use **Add file → Create new file**, type `.github/workflows/update-news.yml` as the name, and paste in the contents of that file.
3. **Settings → Pages**: under **Build and deployment → Source**, choose **GitHub Actions**.
4. **Settings → Actions → General → Workflow permissions**: choose **Read and write permissions** and save.
5. **Actions** tab → **Update pistachio news** → **Run workflow** (allow Actions if GitHub asks).
6. After 3–4 minutes the run turns green. The site is at **https://lorenzolucchi21-cmd.github.io/pistachio-news/** (the exact link is also shown on the run page and under **Settings → Pages**).

From then on it updates itself. GitHub may delay scheduled runs by some minutes, and pauses schedules after 60 days without repository activity — click **Run workflow** once to restart them.

## If something goes wrong

- **Run is red:** open the run in the Actions tab and read the failing step. "No source could be reached" means collection failed completely; the previous page stays online.
- **A source stops appearing:** open **Source status** at the bottom of the page. "Unreachable" means the publisher blocked or moved its feed; edit `config/sources.json` to fix or remove it.
- **A picture is missing:** some publishers forbid showing their pictures on other sites. The page then retries once through the public image cache images.weserv.nl and otherwise shows a pistachio placeholder.

## Tuning what appears

Everything lives in two files.

**`config/sources.json`**
- `sources`: one entry per feed.
  - `section` — where it appears: `front.world` (used to find the big stories), `front.ideas`, `front.long`, `front.de` / `front.es` / `front.it`, `energy.world`, `energy.power`, `energy.analysis`, `energy.de` / `.es` / `.it`, `culture.ideas`, `culture.arts`, `culture.de` / `.es` / `.it`, `culture.essen`, `fun.florida`, `fun.odd`, `fun.good`, `fun.de` / `.es` / `.it`, `fun.satire`.
  - `urls` (public RSS/Atom feeds) or `search` (a Google News query; only headlines and links are used, each story keeps its real publisher).
  - `lang` (`en`, `de`, `es`, `it`; `us` for the US edition of Google News), `kind` (`news`, `opinion`, `analysis`, `local`, `odd`, `satire`).
  - Optional: `filter` (e.g. `["energy"]` keeps only energy stories of a general feed — see `FILTERS` in `src/rules.mjs`), `weight` (raise or lower a source), `metered`, `translate` (translate headlines to English), `urlMatch` / `urlExclude`, `max`.
- `blockedPublishers`: publishers to ignore (hard paywalls, tabloids).
- `events`: event listing pages read for "Around Essen" (`rausgegangen` city pages or any page with schema.org event data, like Eventbrite).
- `haunts`: the "Good places to keep an eye on" list.

**`src/rules.mjs`**
- Word lists for energy, power markets, sport, junk, grim and funny stories, and the Essen leisure filter.
- `score()` decides what rises to the top: on the News page reflective pieces (opinion, analysis, "why/how/what it means" headlines) beat plain reports, and stories about arrests or casualty counts are pushed down.
- `SECTIONS` sets how many days each section keeps and how many stories it shows.
- `clusterStories()` / `relatedReads()` find today's big stories and their "Go deeper" reads.

## What it publishes

Only public headline metadata: title, short feed summary, date, author, picture address and the link to the publisher. Where a feed has no picture, the publisher's own preview image (`og:image`) is looked up once. Paywalled content is never collected. German local headlines for Essen are machine-translated with the free MyMemory service. The page is public: anyone with the link can open it.

## Files

- `config/sources.json` – sources, event pages and Essen places.
- `src/rules.mjs` – filters, scoring and story grouping.
- `src/template.html`, `src/style.css`, `src/app.js`, `src/logo.svg` – the page.
- `scripts/build.mjs` – collects everything, merges with the archive, builds `site/`.
- `scripts/feeds.mjs` – feed, event and picture parsing. `scripts/translate.mjs` – translation.
- `data/archive.json` – the rolling archive (also caches translations, pictures and event details), updated by the workflow.
- `.github/workflows/update-news.yml` – the schedule.
- `test/` – automated tests (`npm test`), run before every build.
