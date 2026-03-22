import {
  clampSearchLimit,
  normalizeForSearch,
  tokenizeForIndex
} from '../../shared/movie-search.js';
import { json } from '../_lib/http.js';

const SELECT_COLUMNS = `
  m.tconst,
  m.primary_title AS primaryTitle,
  m.start_year AS startYear,
  m.average_rating AS averageRating,
  m.num_votes AS numVotes
`;

const TOKEN_QUERY = `
  SELECT ${SELECT_COLUMNS}
  FROM movie_tokens mt
  JOIN movies m ON m.tconst = mt.tconst
  WHERE mt.token = ?
    AND m.normalized_title LIKE ?
  ORDER BY m.num_votes DESC, m.primary_title ASC, m.tconst ASC
  LIMIT ?
`;

const FALLBACK_QUERY = `
  SELECT ${SELECT_COLUMNS}
  FROM movies m
  WHERE m.normalized_title LIKE ?
  ORDER BY m.num_votes DESC, m.primary_title ASC, m.tconst ASC
  LIMIT ?
`;

export async function onRequestGet(context) {
  const db = context.env && context.env.DB;
  if (!db || typeof db.prepare !== 'function') {
    return json({ error: 'D1 binding is unavailable.' }, 503);
  }

  const url = new URL(context.request.url);
  const rawQuery = (url.searchParams.get('q') || '').trim();
  if (!rawQuery) {
    return json({ error: 'Query parameter "q" is required.' }, 400);
  }

  const normalizedQuery = normalizeForSearch(rawQuery);
  if (!normalizedQuery) {
    return json({ results: [] });
  }

  const queryTokens = tokenizeForIndex(rawQuery);
  const limit = clampSearchLimit(url.searchParams.get('limit'));

  try {
    const statement = queryTokens.length > 0
      ? db.prepare(TOKEN_QUERY).bind(queryTokens[0], `%${normalizedQuery}%`, limit)
      : db.prepare(FALLBACK_QUERY).bind(`%${normalizedQuery}%`, limit);

    const result = await statement.all();
    return json({
      results: Array.isArray(result.results) ? result.results : []
    });
  } catch (error) {
    return json(
      {
        error: error instanceof Error ? error.message : 'Search query failed.'
      },
      500
    );
  }
}
