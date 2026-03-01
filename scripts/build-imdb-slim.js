#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const readline = require('readline');

function parseArgs(argv) {
  const args = {
    basics: path.resolve('data/raw/title.basics.tsv.gz'),
    ratings: path.resolve('data/raw/title.ratings.tsv.gz'),
    out: path.resolve('movies.slim.json'),
    minVotes: 1000,
    fromJson: null
  };

  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--basics' && argv[i + 1]) {
      args.basics = path.resolve(argv[++i]);
    } else if (arg === '--ratings' && argv[i + 1]) {
      args.ratings = path.resolve(argv[++i]);
    } else if (arg === '--out' && argv[i + 1]) {
      args.out = path.resolve(argv[++i]);
    } else if (arg === '--min-votes' && argv[i + 1]) {
      args.minVotes = Number.parseInt(argv[++i], 10);
    } else if (arg === '--from-json' && argv[i + 1]) {
      args.fromJson = path.resolve(argv[++i]);
    }
  }

  if (!Number.isFinite(args.minVotes) || args.minVotes < 0) {
    throw new Error('Invalid --min-votes value');
  }

  return args;
}

function normalizeForSearch(input) {
  return String(input || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

function parseNullableInt(value) {
  if (value === '\\N' || value === '' || value == null) {
    return null;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseNullableFloat(value) {
  if (value === '\\N' || value === '' || value == null) {
    return null;
  }

  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function toSlimRecord(record) {
  if (!record || typeof record !== 'object') {
    return null;
  }

  if (typeof record.tconst !== 'string' || !record.tconst) {
    return null;
  }

  if (typeof record.primaryTitle !== 'string' || !record.primaryTitle.trim()) {
    return null;
  }

  const title = record.primaryTitle.trim();
  const startYear = Number.isFinite(record.startYear) ? Math.trunc(record.startYear) : null;
  const averageRating = Number.isFinite(record.averageRating) ? record.averageRating : null;
  const numVotes = Number.isFinite(record.numVotes) && record.numVotes >= 0 ? Math.trunc(record.numVotes) : 0;

  return {
    tconst: record.tconst,
    primaryTitle: title,
    startYear,
    averageRating,
    numVotes,
    normalizedTitle: normalizeForSearch(title)
  };
}

async function readGzipLines(filePath, onLine) {
  const fileStream = fs.createReadStream(filePath);
  const gunzip = zlib.createGunzip();
  const rl = readline.createInterface({
    input: fileStream.pipe(gunzip),
    crlfDelay: Infinity
  });

  for await (const line of rl) {
    onLine(line);
  }
}

async function buildFromTsv(args) {
  if (!fs.existsSync(args.basics)) {
    throw new Error(`Missing basics dataset: ${args.basics}`);
  }

  if (!fs.existsSync(args.ratings)) {
    throw new Error(`Missing ratings dataset: ${args.ratings}`);
  }

  const ratingsByTconst = new Map();
  let ratingsRows = 0;

  await readGzipLines(args.ratings, line => {
    ratingsRows += 1;
    if (ratingsRows === 1) {
      return;
    }

    const [tconst, averageRatingRaw, numVotesRaw] = line.split('\t');
    if (!tconst) {
      return;
    }

    const numVotes = parseNullableInt(numVotesRaw);
    if (!Number.isFinite(numVotes) || numVotes < args.minVotes) {
      return;
    }

    const averageRating = parseNullableFloat(averageRatingRaw);
    ratingsByTconst.set(tconst, {
      averageRating,
      numVotes
    });
  });

  const movies = [];
  let basicsRows = 0;

  await readGzipLines(args.basics, line => {
    basicsRows += 1;
    if (basicsRows === 1) {
      return;
    }

    const cols = line.split('\t');
    const tconst = cols[0];
    const titleType = cols[1];
    const primaryTitle = cols[2];
    const isAdult = cols[4];
    const startYearRaw = cols[5];

    if (!tconst || titleType !== 'movie' || isAdult !== '0' || !primaryTitle || primaryTitle === '\\N') {
      return;
    }

    const rating = ratingsByTconst.get(tconst);
    if (!rating) {
      return;
    }

    const slim = toSlimRecord({
      tconst,
      primaryTitle,
      startYear: parseNullableInt(startYearRaw),
      averageRating: rating.averageRating,
      numVotes: rating.numVotes
    });

    if (slim) {
      movies.push(slim);
    }
  });

  movies.sort((a, b) => {
    if (b.numVotes !== a.numVotes) {
      return b.numVotes - a.numVotes;
    }

    const titleCmp = a.primaryTitle.localeCompare(b.primaryTitle);
    if (titleCmp !== 0) {
      return titleCmp;
    }

    return a.tconst.localeCompare(b.tconst);
  });

  return movies;
}

function buildFromJson(inputPath, minVotes) {
  if (!fs.existsSync(inputPath)) {
    throw new Error(`Missing JSON input: ${inputPath}`);
  }

  const raw = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
  if (!Array.isArray(raw)) {
    throw new Error(`JSON input is not an array: ${inputPath}`);
  }

  const movies = [];
  for (const row of raw) {
    const slim = toSlimRecord(row);
    if (!slim) {
      continue;
    }

    if (slim.numVotes < minVotes) {
      continue;
    }

    movies.push(slim);
  }

  movies.sort((a, b) => {
    if (b.numVotes !== a.numVotes) {
      return b.numVotes - a.numVotes;
    }

    const titleCmp = a.primaryTitle.localeCompare(b.primaryTitle);
    if (titleCmp !== 0) {
      return titleCmp;
    }

    return a.tconst.localeCompare(b.tconst);
  });

  return movies;
}

function writeOutput(outPath, movies) {
  const payload = JSON.stringify(movies);
  fs.writeFileSync(outPath, payload);
  const mb = (Buffer.byteLength(payload, 'utf8') / (1024 * 1024)).toFixed(2);
  console.log(`Wrote ${movies.length} movies to ${outPath} (${mb} MB)`);
}

async function main() {
  const args = parseArgs(process.argv);

  let movies;
  if (args.fromJson) {
    console.log(`Building from JSON: ${args.fromJson}`);
    movies = buildFromJson(args.fromJson, args.minVotes);
  } else {
    console.log(`Building from TSV: ${args.basics} + ${args.ratings}`);
    movies = await buildFromTsv(args);
  }

  writeOutput(args.out, movies);
}

main().catch(error => {
  console.error(error.message || error);
  process.exitCode = 1;
});
