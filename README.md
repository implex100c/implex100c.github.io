# Underrated

Browser party game hosted on Cloudflare Pages with Pages Functions and D1.

## Hosting model

- Domain registration and DNS stay on Squarespace Domains.
- `underrated.dm.life` points to Cloudflare Pages via a Squarespace `CNAME`.
- The frontend and API are same-origin:
  - static site from Cloudflare Pages
  - `/api/health` and `/api/search` from Pages Functions
  - movie search data stored in D1
- `movies.slim.json` is now an import artifact, not a browser-loaded runtime file.

## Local development

```bash
cd /Users/implex/underrated
npm install
npm run db:import:local
npm run dev
```

Open <http://localhost:8788/>.

## Cloudflare setup

1. Create a Cloudflare account.
2. Create a Pages project connected to this GitHub repo.
3. Create a D1 database named `underrated`.
4. Replace the placeholder `database_id` in `wrangler.jsonc`.
5. Bind the D1 database to the Pages project as `DB`.
6. Add `underrated.dm.life` as a custom domain in the Pages dashboard.
7. In Squarespace DNS, add:

```text
Type: CNAME
Host: underrated
Value: <your-pages-project>.pages.dev
```

Wait for DNS and SSL activation, then verify:

- `https://underrated.dm.life`
- `https://underrated.dm.life/api/health`
- `https://underrated.dm.life/api/search?q=matrix`

## IMDb slim dataset workflow

The data pipeline still produces `movies.slim.json`, but production imports it into D1.

### 1. Download raw IMDb files (optional helper)

```bash
npm run download:data
```

Expected raw files:

- `data/raw/title.basics.tsv.gz`
- `data/raw/title.ratings.tsv.gz`

### 2. Build slim dataset from IMDb TSV files

```bash
npm run build:data
```

Optional flags:

```bash
node scripts/build-imdb-slim.js --min-votes 2000
node scripts/build-imdb-slim.js --basics path/to/title.basics.tsv.gz --ratings path/to/title.ratings.tsv.gz --out movies.slim.json
```

### 3. Fallback build from existing JSON

```bash
npm run build:data:json
```

This fallback is useful when TSV files are not downloaded yet.

## Import movie data into D1

Local D1:

```bash
npm run db:import:local
```

Remote D1:

```bash
npm run db:import:remote
```

Generate the SQL import without executing it:

```bash
npm run db:import:sql
```

The import script runs the schema file in `migrations/0001_create_movies.sql` and then loads the current `movies.slim.json` contents into D1.
