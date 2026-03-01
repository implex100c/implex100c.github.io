const ALLOWED_TRANSITIONS = {
  lobby: new Set(['movieEntry']),
  movieEntry: new Set(['quiz', 'lobby']),
  quiz: new Set(['results', 'lobby']),
  results: new Set(['lobby'])
};

export function createInitialState() {
  return {
    stage: 'lobby',
    dataStatus: 'idle',
    dataError: '',
    moviesData: [],
    players: [],
    playersById: new Map(),
    entriesByPlayerId: new Map(),
    quizOrder: [],
    currentIndex: 0,
    matches: []
  };
}

export function setStage(state, nextStage) {
  if (state.stage === nextStage) {
    return true;
  }

  const allowed = ALLOWED_TRANSITIONS[state.stage];
  if (!allowed || !allowed.has(nextStage)) {
    return false;
  }

  state.stage = nextStage;
  return true;
}

export function resetGameState(state) {
  state.stage = 'lobby';
  state.players = [];
  state.playersById = new Map();
  state.entriesByPlayerId = new Map();
  state.quizOrder = [];
  state.currentIndex = 0;
  state.matches = [];
}

export function beginMovieEntry(state, players) {
  state.players = players;
  state.playersById = new Map(players.map(player => [player.id, player]));
  state.entriesByPlayerId = new Map();
  state.quizOrder = players.map(player => player.id);
  state.currentIndex = 0;
  state.matches = [];
  return setStage(state, 'movieEntry');
}

export function advancePlayerEntry(state) {
  if (state.stage !== 'movieEntry') {
    return { ok: false, done: false };
  }

  if (state.currentIndex < state.players.length) {
    state.currentIndex += 1;
  }

  return {
    ok: true,
    done: state.currentIndex >= state.players.length
  };
}

export function beginQuiz(state) {
  state.currentIndex = 0;

  for (const playerId of state.quizOrder) {
    const entry = state.entriesByPlayerId.get(playerId);
    if (entry) {
      entry.correctYear = Boolean(entry.correctYear);
      entry.correctRating = Boolean(entry.correctRating);
    }
  }

  return setStage(state, 'quiz');
}

export function getCurrentQuizEntry(state) {
  if (state.stage !== 'quiz') {
    return null;
  }

  const playerId = state.quizOrder[state.currentIndex];
  if (!playerId) {
    return null;
  }

  return state.entriesByPlayerId.get(playerId) || null;
}

export function advanceQuiz(state) {
  if (state.stage !== 'quiz') {
    return { ok: false, done: false };
  }

  if (state.currentIndex < state.quizOrder.length) {
    state.currentIndex += 1;
  }

  return {
    ok: true,
    done: state.currentIndex >= state.quizOrder.length
  };
}

export function createPlayer(id, name) {
  return { id, name };
}
