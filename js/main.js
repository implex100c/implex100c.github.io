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
import { loadMovies, searchMovies } from './data.js';
import { createUI } from './ui.js';

const state = createInitialState();
const ui = createUI(document);

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

function refreshLobbyInputs() {
  const oldValues = ui.getPlayerNameValues();
  const count = readNumPlayers();
  ui.renderPlayerNameInputs(count, oldValues);
  ui.updateStartEnabled(count);
}

function buildPlayers() {
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

  ui.setMoviePrompt(player.name);
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

function handleSearch() {
  if (state.stage !== 'movieEntry' || state.dataStatus !== 'ready') {
    return;
  }

  const query = ui.el.movieTitleInput.value.trim();
  if (!query) {
    return;
  }

  state.matches = searchMovies(state.moviesData, query, 10);
  ui.setConfirmEnabled(false);

  if (state.matches.length === 0) {
    ui.renderNoMatches();
    return;
  }

  ui.renderSearchResults(state.matches);
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
    runtimeMinutes: selected.runtimeMinutes,
    averageRating: selected.averageRating,
    numVotes: selected.numVotes,
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

  const player = state.players.find(p => p.id === entry.playerId);
  const playerName = player ? player.name : 'Unknown Player';
  ui.renderQuiz(entry, playerName);
}

function handleQuizNext() {
  if (state.stage !== 'quiz') {
    return;
  }

  const entry = getCurrentQuizEntry(state);
  if (!entry) {
    return;
  }

  const checks = ui.getQuizChecks();
  entry.correctYear = checks.correctYear;
  entry.correctRating = checks.correctRating;

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

function renderResults() {
  const scores = state.players.map(player => {
    const entry = state.entriesByPlayerId.get(player.id);
    const points = entry ? (entry.correctYear ? 1 : 0) + (entry.correctRating ? 1 : 0) : 0;

    return {
      name: player.name,
      title: entry ? entry.primaryTitle : 'N/A',
      rating: entry ? entry.averageRating : null,
      points
    };
  });

  scores.sort((a, b) => {
    const ar = Number.isFinite(a.rating) ? a.rating : Number.POSITIVE_INFINITY;
    const br = Number.isFinite(b.rating) ? b.rating : Number.POSITIVE_INFINITY;
    if (ar !== br) {
      return ar - br;
    }

    if (b.points !== a.points) {
      return b.points - a.points;
    }

    return a.name.localeCompare(b.name);
  });

  ui.renderResults(scores);
}

function handleRestart() {
  resetGameState(state);
  ui.clearResults();
  ui.setStage('lobby');
  refreshLobbyInputs();
}

async function bootstrap() {
  ui.setStage('lobby');
  refreshLobbyInputs();
  ui.setSearchEnabled(false);
  ui.setConfirmEnabled(false);

  ui.el.numPlayersInput.addEventListener('input', refreshLobbyInputs);
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

    const idx = ui.getSelectedMatchIndex();
    const valid = idx !== null && Boolean(state.matches[idx]);
    ui.setConfirmEnabled(valid);
  });

  ui.el.nextQuizBtn.addEventListener('click', handleQuizNext);
  ui.el.restartBtn.addEventListener('click', handleRestart);

  state.dataStatus = 'loading';
  try {
    state.moviesData = await loadMovies('movies.json');
    state.dataStatus = 'ready';
    if (state.stage === 'movieEntry') {
      ui.setSearchEnabled(true);
    }
  } catch (error) {
    state.dataStatus = 'error';
    state.dataError = error instanceof Error ? error.message : String(error);
    ui.renderSearchError('Failed to load movie data.');
    ui.setSearchEnabled(false);
  }
}

bootstrap();

// Expose minimal debug handle for manual QA in browser devtools.
window.__gp = { state, openMovieEntry };
