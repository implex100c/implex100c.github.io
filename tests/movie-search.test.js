import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildMovieTokens,
  clampSearchLimit,
  normalizeForSearch,
  normalizeMovieRecord
} from '../shared/movie-search.js';

test('normalizeForSearch strips punctuation and accents', () => {
  assert.equal(normalizeForSearch('Léon: The Professional'), 'leontheprofessional');
});

test('buildMovieTokens keeps distinct normalized tokens', () => {
  assert.deepEqual(buildMovieTokens('Spider-Man: No Way Home'), ['spider', 'man', 'no', 'way', 'home']);
});

test('normalizeMovieRecord sanitizes numeric fields', () => {
  assert.deepEqual(normalizeMovieRecord({
    tconst: 'tt123',
    primaryTitle: 'Test Movie',
    startYear: '2001',
    averageRating: '7.7',
    numVotes: '1234'
  }), {
    tconst: 'tt123',
    primaryTitle: 'Test Movie',
    startYear: 2001,
    averageRating: 7.7,
    numVotes: 1234,
    normalizedTitle: 'testmovie'
  });
});

test('clampSearchLimit defaults and caps values', () => {
  assert.equal(clampSearchLimit(undefined), 10);
  assert.equal(clampSearchLimit('200'), 10);
  assert.equal(clampSearchLimit('3'), 3);
});
