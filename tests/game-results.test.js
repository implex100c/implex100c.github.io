import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildWinnerSummary,
  compareScores,
  getRatingGuessDelta
} from '../shared/game-results.js';

function createScore({
  name,
  rating,
  guessedRating,
  points = 0
}) {
  return {
    name,
    rating,
    guessedRating,
    points,
    ratingGuessDelta: getRatingGuessDelta(guessedRating, rating)
  };
}

test('clear winner by lowest movie rating does not use tie-breaks', () => {
  const scores = [
    createScore({ name: 'Alice', rating: 4.1, guessedRating: 6.0, points: 0 }),
    createScore({ name: 'Bob', rating: 4.7, guessedRating: 4.7, points: 2 })
  ].sort(compareScores);

  assert.deepEqual(scores.map(score => score.name), ['Alice', 'Bob']);
  assert.deepEqual(buildWinnerSummary(scores), {
    winners: ['Alice'],
    usedTieBreak: false,
    isJointWin: false,
    textBeforeNames: 'The winner is ',
    textAfterNames: ' with the lowest-rated movie!'
  });
});

test('bonus points break ties on actual movie rating before closest guess', () => {
  const scores = [
    createScore({ name: 'Alice', rating: 4.7, guessedRating: 7.7, points: 1 }),
    createScore({ name: 'Bob', rating: 4.7, guessedRating: 4.8, points: 2 })
  ].sort(compareScores);

  assert.deepEqual(scores.map(score => score.name), ['Bob', 'Alice']);
  assert.deepEqual(buildWinnerSummary(scores), {
    winners: ['Bob'],
    usedTieBreak: true,
    isJointWin: false,
    textBeforeNames: 'The winner is ',
    textAfterNames: ' with the lowest-rated movie after tie-breaks!'
  });
});

test('closest IMDb guess breaks ties when rating and bonus are equal', () => {
  const scores = [
    createScore({ name: 'Alice', rating: 4.7, guessedRating: 7.7, points: 0 }),
    createScore({ name: 'Bob', rating: 4.7, guessedRating: 6.4, points: 0 })
  ].sort(compareScores);

  assert.deepEqual(scores.map(score => score.name), ['Bob', 'Alice']);
  assert.deepEqual(buildWinnerSummary(scores), {
    winners: ['Bob'],
    usedTieBreak: true,
    isJointWin: false,
    textBeforeNames: 'The winner is ',
    textAfterNames: ' with the lowest-rated movie after tie-breaks!'
  });
});

test('equal closest-guess distance produces joint winners', () => {
  const scores = [
    createScore({ name: 'Alice', rating: 4.7, guessedRating: 6.4, points: 0 }),
    createScore({ name: 'Bob', rating: 4.7, guessedRating: 3.0, points: 0 })
  ].sort(compareScores);

  assert.deepEqual(buildWinnerSummary(scores), {
    winners: ['Alice', 'Bob'],
    usedTieBreak: true,
    isJointWin: true,
    textBeforeNames: 'The winners are ',
    textAfterNames: ' with the lowest-rated movie after tie-breaks!'
  });
});
