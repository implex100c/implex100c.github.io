import {
  clampSearchLimit,
  normalizeMovieRecord
} from '../shared/movie-search.js';

function createSearchError(message, fallback) {
  if (typeof message === 'string' && message.trim()) {
    return new Error(message.trim());
  }

  return new Error(fallback);
}

export async function searchMovies(query, limit = 10, { signal } = {}) {
  const trimmedQuery = String(query || '').trim();
  if (!trimmedQuery) {
    return [];
  }

  const params = new URLSearchParams({
    q: trimmedQuery,
    limit: String(clampSearchLimit(limit))
  });

  const response = await fetch(`/api/search?${params.toString()}`, {
    method: 'GET',
    headers: {
      Accept: 'application/json'
    },
    signal
  });

  let payload = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    throw createSearchError(payload && payload.error, 'Failed to search movies.');
  }

  if (!payload || !Array.isArray(payload.results)) {
    throw new Error('Search API returned an unexpected response.');
  }

  return payload.results.map(normalizeMovieRecord).filter(Boolean);
}
