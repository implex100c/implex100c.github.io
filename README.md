# Guilty Pleasure Movie

Browser party game hosted on GitHub Pages.

## Local development

```bash
cd /Users/implex/implex100c.github.io
python3 -m http.server 8000
```

Open <http://localhost:8000/>.

## IMDb slim dataset workflow

The app loads `movies.slim.json` at runtime.

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
