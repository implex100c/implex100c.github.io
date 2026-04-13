import {
  beginMovieEntry,
  beginQuiz,
  createInitialState,
  createPlayer,
  advancePlayerEntry,
  advanceQuiz,
  getCurrentQuizEntry,
  resetGameState,
  setStage
} from './state.js';
import { searchMovies } from './data.js';
import { parseLobbySeed } from './lobby-seed.js';
import { buildWinnerSummary, compareScores, getRatingGuessDelta } from '../shared/game-results.js';
import { createUI } from './ui.js';

const state = createInitialState();
const ui = createUI(document);
const MIN_VALID_YEAR = 1900;
const MAX_VALID_YEAR = new Date().getFullYear() + 1;
const YEAR_FOUR_DIGIT_RE = /^\d{4}$/;
const RATING_INTEGER_RE = /^(?:10|[0-9])$/;
const RATING_ONE_DECIMAL_RE = /^(?:10\.0|[0-9]\.[0-9])$/;

function createPlayerId(index) {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `p-${Date.now()}-${index}`;
}

function currentPlayer() {
  return state.players[state.currentIndex] || null;
}

function readNumPlayers() {
  const parsed = Number.parseInt(ui.el.numPlayersInput.value, 10);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return 0;
  }

  return parsed;
}

function syncLobbyNameDraftsFromInputs() {
  const inputs = Array.from(ui.el.namesContainer.querySelectorAll('input[data-player-name]'));
  inputs.forEach((input, index) => {
    state.lobbyNameDrafts[index] = input.value;
  });
}

function refreshLobbyInputs(previousValues = null) {
  if (Array.isArray(previousValues)) {
    state.lobbyNameDrafts = [...previousValues];
  } else {
    syncLobbyNameDraftsFromInputs();
  }

  const count = readNumPlayers();
  ui.renderPlayerNameInputs(count, state.lobbyNameDrafts);
  ui.updateStartEnabled(count);
}

function seedLobbyFromUrl() {
  const seed = parseLobbySeed(window.location.search);
  if (!seed) {
    refreshLobbyInputs();
    return;
  }

  ui.el.numPlayersInput.value = String(seed.playerCount);
  refreshLobbyInputs(seed.playerNames);
}

function buildPlayers() {
  syncLobbyNameDraftsFromInputs();
  const count = readNumPlayers();
  const inputs = Array.from(ui.el.namesContainer.querySelectorAll('input[data-player-name]'));

  const players = [];
  for (let i = 0; i < count; i += 1) {
    const raw = inputs[i] ? inputs[i].value.trim() : '';
    const name = raw || `Player ${i + 1}`;
    players.push(createPlayer(createPlayerId(i), name));
  }

  return players;
}

function showCurrentMoviePrompt() {
  const player = currentPlayer();
  if (!player) {
    return;
  }

  ui.setMoviePrompt(player.name, state.currentIndex + 1);
  ui.clearMovieEntryForm();
  ui.setSearchEnabled(state.dataStatus === 'ready');
  ui.focusMovieTitle();
}

function openMovieEntry() {
  if (!setStage(state, 'movieEntry')) {
    return;
  }

  ui.setStage('movieEntry');
  showCurrentMoviePrompt();
}

function handleStartGame() {
  const players = buildPlayers();
  if (players.length < 2) {
    return;
  }

  const started = beginMovieEntry(state, players);
  if (!started) {
    return;
  }

  ui.setStage('movieEntry');
  showCurrentMoviePrompt();
}

async function handleSearch() {
  if (state.stage !== 'movieEntry' || state.dataStatus === 'loading') {
    return;
  }

  const query = ui.el.movieTitleInput.value.trim();
  if (!query) {
    return;
  }

  state.dataStatus = 'loading';
  state.dataError = '';
  ui.setConfirmEnabled(false);
  ui.setSearchEnabled(false);

  try {
    state.matches = await searchMovies(query, 10);
    if (state.stage !== 'movieEntry') {
      return;
    }

    if (state.matches.length === 0) {
      ui.renderNoMatches();
      return;
    }

    ui.renderSearchResults(state.matches);
  } catch (error) {
    state.matches = [];
    state.dataError = error instanceof Error ? error.message : 'Failed to search movies.';
    ui.renderSearchError(state.dataError);
  } finally {
    state.dataStatus = 'ready';
    if (state.stage === 'movieEntry') {
      ui.setSearchEnabled(true);
    }
  }
}

function handleConfirmSelection() {
  if (state.stage !== 'movieEntry') {
    return;
  }

  const selectedIndex = ui.getSelectedMatchIndex();
  if (selectedIndex === null) {
    return;
  }

  const selected = state.matches[selectedIndex];
  if (!selected) {
    ui.setConfirmEnabled(false);
    return;
  }

  const player = currentPlayer();
  if (!player) {
    return;
  }

  state.entriesByPlayerId.set(player.id, {
    playerId: player.id,
    tconst: selected.tconst,
    primaryTitle: selected.primaryTitle,
    startYear: selected.startYear,
    averageRating: selected.averageRating,
    numVotes: selected.numVotes,
    guessedYear: null,
    guessedRating: null,
    correctYear: false,
    correctRating: false
  });

  const next = advancePlayerEntry(state);
  ui.setConfirmEnabled(false);

  if (next.done) {
    const ok = beginQuiz(state);
    if (!ok) {
      return;
    }

    ui.setStage('quiz');
    renderCurrentQuiz();
    return;
  }

  showCurrentMoviePrompt();
}

function renderCurrentQuiz() {
  const entry = getCurrentQuizEntry(state);
  if (!entry) {
    const moved = setStage(state, 'results');
    if (moved) {
      ui.setStage('results');
      renderResults();
    }
    return;
  }

  const player = state.playersById.get(entry.playerId);
  const playerName = player ? player.name : 'Unknown Player';
  ui.renderQuiz(entry, playerName, state.currentIndex + 1);
}

function handleQuizNext() {
  if (state.stage !== 'quiz') {
    return;
  }

  const entry = getCurrentQuizEntry(state);
  if (!entry) {
    return;
  }

  const validation = validateQuizInputs({ showRequired: true });
  if (!validation.valid) {
    return;
  }

  entry.guessedYear = validation.yearGuess;
  entry.guessedRating = validation.ratingGuess;
  entry.correctYear = isCorrectYear(validation.yearGuess, entry.startYear);
  entry.correctRating = isCorrectRating(validation.ratingGuess, entry.averageRating);

  const next = advanceQuiz(state);
  if (next.done) {
    const moved = setStage(state, 'results');
    if (!moved) {
      return;
    }

    ui.setStage('results');
    renderResults();
    return;
  }

  renderCurrentQuiz();
}

function validateQuizInputs({ showRequired }) {
  const { yearRaw, ratingRaw } = ui.getQuizAnswerInputs();
  let yearError = '';
  let ratingError = '';

  let yearGuess = null;
  if (!yearRaw) {
    if (showRequired) {
      yearError = 'Enter a year.';
    }
  } else if (!YEAR_FOUR_DIGIT_RE.test(yearRaw)) {
    yearError = 'Year must be a 4-digit number.';
  } else {
    yearGuess = Number.parseInt(yearRaw, 10);
    if (!Number.isFinite(yearGuess) || yearGuess < MIN_VALID_YEAR || yearGuess > MAX_VALID_YEAR) {
      yearError = `Year must be between ${MIN_VALID_YEAR} and ${MAX_VALID_YEAR}.`;
    }
  }

  let ratingGuess = null;
  if (!ratingRaw) {
    if (showRequired) {
      ratingError = 'Enter a rating.';
    }
  } else {
    const isIntegerRating = RATING_INTEGER_RE.test(ratingRaw);
    const isOneDecimalRating = RATING_ONE_DECIMAL_RE.test(ratingRaw);

    if (!isIntegerRating && !isOneDecimalRating) {
      ratingError = 'Rating must be one decimal place (e.g. 7.7).';
    } else {
      ratingGuess = Number.parseFloat(ratingRaw);
      if (!Number.isFinite(ratingGuess) || ratingGuess < 0 || ratingGuess > 10) {
        ratingError = 'Rating must be from 0.0 to 10.0.';
      } else {
        // Normalize valid integer ratings like "7" to "7.0" on submit.
        ui.el.ratingGuessInput.value = ratingGuess.toFixed(1);
      }
    }
  }

  const valid = !yearError && !ratingError && yearGuess !== null && ratingGuess !== null;
  ui.setQuizFieldErrors(yearError, ratingError);

  return {
    valid,
    yearGuess,
    ratingGuess
  };
}

function isCorrectYear(guess, actual) {
  if (!Number.isFinite(actual)) {
    return false;
  }

  return Math.trunc(guess) === Math.trunc(actual);
}

function isCorrectRating(guess, actual) {
  if (!Number.isFinite(actual)) {
    return false;
  }

  const roundedGuess = Math.round(guess * 10) / 10;
  const roundedActual = Math.round(actual * 10) / 10;
  return roundedGuess === roundedActual;
}

function renderResults() {
  const scores = state.players.map(player => {
    const entry = state.entriesByPlayerId.get(player.id);
    const points = entry ? (entry.correctYear ? 1 : 0) + (entry.correctRating ? 1 : 0) : 0;
    const guessedRating = entry ? entry.guessedRating : null;
    const actualRating = entry ? entry.averageRating : null;

    return {
      name: player.name,
      title: entry ? entry.primaryTitle : 'N/A',
      tconst: entry ? entry.tconst : null,
      guessedRating,
      rating: actualRating,
      guessedYear: entry ? entry.guessedYear : null,
      startYear: entry ? entry.startYear : null,
      correctYear: entry ? Boolean(entry.correctYear) : false,
      correctRating: entry ? Boolean(entry.correctRating) : false,
      points,
      ratingGuessDelta: getRatingGuessDelta(guessedRating, actualRating)
    };
  });

  scores.sort(compareScores);

  const winnerSummary = buildWinnerSummary(scores);
  ui.renderResults(scores, winnerSummary);
}

function handleRestart() {
  resetGameState(state);
  ui.clearResults();
  ui.setStage('lobby');
  refreshLobbyInputs();
}

async function bootstrap() {
  ui.setStage('lobby');
  seedLobbyFromUrl();
  state.dataStatus = 'ready';
  state.dataError = '';
  ui.setSearchEnabled(true);
  ui.setConfirmEnabled(false);

  ui.el.numPlayersInput.addEventListener('input', refreshLobbyInputs);
  ui.el.namesContainer.addEventListener('input', event => {
    if (!(event.target instanceof HTMLInputElement)) {
      return;
    }

    if (!('playerName' in event.target.dataset)) {
      return;
    }

    syncLobbyNameDraftsFromInputs();
  });
  ui.el.startBtn.addEventListener('click', handleStartGame);

  ui.el.searchBtn.addEventListener('click', handleSearch);
  ui.el.confirmBtn.addEventListener('click', handleConfirmSelection);

  ui.el.movieTitleInput.addEventListener('keydown', event => {
    if (event.key !== 'Enter') {
      return;
    }

    event.preventDefault();
    if (!ui.el.searchBtn.disabled) {
      handleSearch();
    }
  });

  ui.el.searchResults.addEventListener('change', event => {
    if (!(event.target instanceof HTMLInputElement)) {
      return;
    }

    if (event.target.name !== 'match') {
      return;
    }

    ui.updateSearchSelectionStyles();
    const idx = ui.getSelectedMatchIndex();
    const valid = idx !== null && Boolean(state.matches[idx]);
    ui.setConfirmEnabled(valid);
  });

  ui.el.nextQuizBtn.addEventListener('click', handleQuizNext);
  ui.el.restartBtn.addEventListener('click', handleRestart);

}

bootstrap();

// Expose minimal debug handle for manual QA in browser devtools.
window.__underrated = { state, openMovieEntry };
