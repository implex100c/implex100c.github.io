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

export async function loadMovies(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} while loading ${url}`);
  }

  const payload = await response.json();
  if (!Array.isArray(payload)) {
    throw new Error('movies.json is not an array');
  }

  const movies = [];
  for (const row of payload) {
    const normalized = normalizeMovieRecord(row);
    if (normalized) {
      movies.push(normalized);
    }
  }

  return movies;
}

export function searchMovies(moviesData, query, limit = 10) {
  const normalizedQuery = normalizeForSearch(query);
  if (!normalizedQuery) {
    return [];
  }

  const matches = moviesData.filter(movie => movie.normalizedTitle.includes(normalizedQuery));
  matches.sort((a, b) => {
    if (b.numVotes !== a.numVotes) {
      return b.numVotes - a.numVotes;
    }

    const titleCmp = a.primaryTitle.localeCompare(b.primaryTitle);
    if (titleCmp !== 0) {
      return titleCmp;
    }

    return a.tconst.localeCompare(b.tconst);
  });

  return matches.slice(0, limit);
}
