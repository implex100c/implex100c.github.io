function isFiniteNumber(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

function toNullableNumber(value) {
  return isFiniteNumber(value) ? value : null;
}

function toSafeVotes(value) {
  if (!isFiniteNumber(value)) {
    return 0;
  }

  return value >= 0 ? Math.floor(value) : 0;
}

export function normalizeForSearch(input) {
  return String(input || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

export function normalizeMovieRecord(raw) {
  if (!raw || typeof raw !== 'object') {
    return null;
  }

  if (typeof raw.tconst !== 'string' || raw.tconst.length === 0) {
    return null;
  }

  if (typeof raw.primaryTitle !== 'string' || raw.primaryTitle.trim().length === 0) {
    return null;
  }

  const primaryTitle = raw.primaryTitle.trim();

  const normalized = {
    tconst: raw.tconst,
    primaryTitle,
    startYear: toNullableNumber(raw.startYear),
    runtimeMinutes: toNullableNumber(raw.runtimeMinutes),
    averageRating: toNullableNumber(raw.averageRating),
    numVotes: toSafeVotes(raw.numVotes),
    normalizedTitle: normalizeForSearch(primaryTitle)
  };

  return normalized;
}

function compareMovies(a, b) {
  if (b.numVotes !== a.numVotes) {
    return b.numVotes - a.numVotes;
  }

  const titleCmp = a.primaryTitle.localeCompare(b.primaryTitle);
  if (titleCmp !== 0) {
    return titleCmp;
  }

  return a.tconst.localeCompare(b.tconst);
}

function buildFirstCharIndex(movies) {
  const index = new Map();

  for (const movie of movies) {
    const key = movie.normalizedTitle[0];
    if (!key) {
      continue;
    }

    const bucket = index.get(key);
    if (bucket) {
      bucket.push(movie);
    } else {
      index.set(key, [movie]);
    }
  }

  return index;
}

export async function loadMovies(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} while loading ${url}`);
  }

  const payload = await response.json();
  if (!Array.isArray(payload)) {
    throw new Error(`${url} is not an array`);
  }

  // Fast-path for prebuilt slim payloads that already include normalizedTitle.
  const trustedSlimShape = payload.length > 0
    && typeof payload[0] === 'object'
    && payload[0] !== null
    && typeof payload[0].normalizedTitle === 'string';

  const movies = trustedSlimShape
    ? payload.filter(row => row && typeof row.tconst === 'string' && typeof row.primaryTitle === 'string')
    : payload.map(normalizeMovieRecord).filter(Boolean);

  movies.sort(compareMovies);

  return {
    movies,
    firstCharIndex: buildFirstCharIndex(movies)
  };
}

export function searchMovies(moviesData, query, limit = 10) {
  const normalizedQuery = normalizeForSearch(query);
  if (!normalizedQuery) {
    return [];
  }

  const list = Array.isArray(moviesData)
    ? moviesData
    : moviesData.firstCharIndex.get(normalizedQuery[0]) || [];

  const matches = [];
  for (const movie of list) {
    if (!movie.normalizedTitle.includes(normalizedQuery)) {
      continue;
    }

    matches.push(movie);
    if (matches.length >= limit) {
      break;
    }
  }

  return matches;
}
