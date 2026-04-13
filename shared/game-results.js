function toComparableRating(value) {
  return Number.isFinite(value) ? value : Number.POSITIVE_INFINITY;
}

export function getRatingGuessDelta(guess, actual) {
  if (!Number.isFinite(guess) || !Number.isFinite(actual)) {
    return Number.POSITIVE_INFINITY;
  }

  return Math.abs(guess - actual);
}

export function compareScores(a, b) {
  const ratingDiff = toComparableRating(a.rating) - toComparableRating(b.rating);
  if (ratingDiff !== 0) {
    return ratingDiff;
  }

  if (b.points !== a.points) {
    return b.points - a.points;
  }

  if (a.ratingGuessDelta !== b.ratingGuessDelta) {
    return a.ratingGuessDelta - b.ratingGuessDelta;
  }

  return a.name.localeCompare(b.name);
}

export function buildWinnerSummary(scores) {
  if (scores.length === 0) {
    return {
      winners: [],
      usedTieBreak: false,
      isJointWin: false,
      textBeforeNames: 'The winner is unavailable.',
      textAfterNames: ''
    };
  }

  const top = scores[0];
  const topRating = toComparableRating(top.rating);
  const ratingContenders = scores.filter(score => toComparableRating(score.rating) === topRating);
  const usedTieBreak = ratingContenders.length > 1;

  const winners = scores
    .filter(score => toComparableRating(score.rating) === topRating)
    .filter(score => score.points === top.points)
    .filter(score => score.ratingGuessDelta === top.ratingGuessDelta)
    .map(score => score.name)
    .sort((a, b) => a.localeCompare(b));

  const isJointWin = winners.length > 1;

  if (!usedTieBreak) {
    return {
      winners,
      usedTieBreak,
      isJointWin,
      textBeforeNames: 'The winner is ',
      textAfterNames: ' with the lowest-rated movie!'
    };
  }

  if (!isJointWin) {
    return {
      winners,
      usedTieBreak,
      isJointWin,
      textBeforeNames: 'The winner is ',
      textAfterNames: ' with the lowest-rated movie after tie-breaks!'
    };
  }

  return {
    winners,
    usedTieBreak,
    isJointWin,
    textBeforeNames: 'The winners are ',
    textAfterNames: ' with the lowest-rated movie after tie-breaks!'
  };
}
