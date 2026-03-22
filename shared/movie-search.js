export const DEFAULT_SEARCH_LIMIT = 10;
export const MAX_SEARCH_LIMIT = 10;

function isFiniteNumber(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

function toNullableInteger(value) {
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return isFiniteNumber(value) ? Math.trunc(value) : null;
}

function toNullableRating(value) {
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return isFiniteNumber(value) ? value : null;
}

function toSafeVotes(value) {
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
  }

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

export function tokenizeForIndex(input) {
  return String(input || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

export function clampSearchLimit(value, fallback = DEFAULT_SEARCH_LIMIT) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return Math.min(parsed, MAX_SEARCH_LIMIT);
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

  return {
    tconst: raw.tconst,
    primaryTitle,
    startYear: toNullableInteger(raw.startYear),
    averageRating: toNullableRating(raw.averageRating),
    numVotes: toSafeVotes(raw.numVotes),
    normalizedTitle: normalizeForSearch(
      typeof raw.normalizedTitle === 'string' && raw.normalizedTitle
        ? raw.normalizedTitle
        : primaryTitle
    )
  };
}

export function compareMovies(a, b) {
  if (b.numVotes !== a.numVotes) {
    return b.numVotes - a.numVotes;
  }

  const titleCmp = a.primaryTitle.localeCompare(b.primaryTitle);
  if (titleCmp !== 0) {
    return titleCmp;
  }

  return a.tconst.localeCompare(b.tconst);
}

export function buildMovieTokens(primaryTitle) {
  return Array.from(new Set(tokenizeForIndex(primaryTitle)));
}
