export function formatYear(year) {
  if (!Number.isFinite(year)) {
    return 'N/A';
  }

  return String(Math.trunc(year));
}

export function formatRating(rating) {
  if (!Number.isFinite(rating)) {
    return 'N/A';
  }

  return Number(rating).toFixed(1);
}

function formatDecade(year) {
  if (!Number.isFinite(year)) {
    return 'Unknown';
  }

  const decadeStart = Math.floor(year / 10) * 10;
  return `${decadeStart}s`;
}

export function createUI(doc) {
  const el = {
    lobby: doc.getElementById('lobby'),
    movieEntry: doc.getElementById('movie-entry'),
    quiz: doc.getElementById('quiz'),
    results: doc.getElementById('results'),
    numPlayersInput: doc.getElementById('numPlayers'),
    namesContainer: doc.getElementById('playerNames'),
    startBtn: doc.getElementById('startBtn'),
    movieEntryTitle: doc.getElementById('movieEntryTitle'),
    moviePrompt: doc.getElementById('movie-prompt'),
    movieTitleInput: doc.getElementById('movieTitle'),
    searchBtn: doc.getElementById('searchBtn'),
    confirmBtn: doc.getElementById('confirmBtn'),
    searchResults: doc.getElementById('searchResults'),
    quizTitle: doc.getElementById('quizTitle'),
    quizMoviePrompt: doc.getElementById('quizMoviePrompt'),
    yearPrompt: doc.getElementById('yearPrompt'),
    ratingPrompt: doc.getElementById('ratingPrompt'),
    yearGuessInput: doc.getElementById('yearGuessInput'),
    ratingGuessInput: doc.getElementById('ratingGuessInput'),
    yearError: doc.getElementById('yearError'),
    ratingError: doc.getElementById('ratingError'),
    nextQuizBtn: doc.getElementById('nextQuizBtn'),
    resultsList: doc.getElementById('resultsList'),
    restartBtn: doc.getElementById('restartBtn')
  };

  function clearChildren(node) {
    while (node.firstChild) {
      node.removeChild(node.firstChild);
    }
  }

  function appendCell(row, tag, text) {
    const cell = doc.createElement(tag);
    cell.textContent = text;
    row.appendChild(cell);
    return cell;
  }

  function setStage(stage) {
    el.lobby.classList.toggle('hidden', stage !== 'lobby');
    el.movieEntry.classList.toggle('hidden', stage !== 'movieEntry');
    el.quiz.classList.toggle('hidden', stage !== 'quiz');
    el.results.classList.toggle('hidden', stage !== 'results');
  }

  function getPlayerNameValues() {
    return Array.from(el.namesContainer.querySelectorAll('input[data-player-name]')).map(input => input.value);
  }

  function renderPlayerNameInputs(count, previousValues = []) {
    clearChildren(el.namesContainer);

    for (let i = 0; i < count; i += 1) {
      const id = `player-${i}`;

      const label = doc.createElement('label');
      label.setAttribute('for', id);
      label.textContent = `Player ${i + 1} Name:`;

      const input = doc.createElement('input');
      input.type = 'text';
      input.id = id;
      input.placeholder = `Player ${i + 1}`;
      input.dataset.playerName = 'true';
      input.value = previousValues[i] || '';

      el.namesContainer.appendChild(label);
      el.namesContainer.appendChild(input);
    }
  }

  function updateStartEnabled(numPlayers) {
    el.startBtn.disabled = numPlayers < 2;
  }

  function setMoviePrompt(playerName) {
    el.movieEntryTitle.textContent = playerName;
    el.moviePrompt.textContent = "What's your guilty pleasure movie?";
  }

  function clearMovieEntryForm() {
    el.movieTitleInput.value = '';
    el.movieTitleInput.disabled = false;
    el.confirmBtn.disabled = true;
    clearChildren(el.searchResults);
  }

  function focusMovieTitle() {
    el.movieTitleInput.focus();
  }

  function setSearchEnabled(enabled) {
    el.searchBtn.disabled = !enabled;
  }

  function setConfirmEnabled(enabled) {
    el.confirmBtn.disabled = !enabled;
  }

  function renderSearchError(message) {
    clearChildren(el.searchResults);
    const p = doc.createElement('p');
    p.className = 'error-text';
    p.textContent = message;
    el.searchResults.appendChild(p);
  }

  function renderNoMatches() {
    clearChildren(el.searchResults);
    const p = doc.createElement('p');
    p.textContent = 'No matches found. Please refine your title.';
    el.searchResults.appendChild(p);
  }

  function renderSearchResults(matches) {
    clearChildren(el.searchResults);

    const table = doc.createElement('table');
    const thead = doc.createElement('thead');
    const headRow = doc.createElement('tr');
    appendCell(headRow, 'th', 'Movie Title');
    appendCell(headRow, 'th', 'Choice');
    thead.appendChild(headRow);

    const tbody = doc.createElement('tbody');

    matches.forEach((movie, idx) => {
      const row = doc.createElement('tr');
      appendCell(row, 'td', `${movie.primaryTitle} (${formatDecade(movie.startYear)})`);

      const choiceCell = doc.createElement('td');
      const radio = doc.createElement('input');
      radio.type = 'radio';
      radio.name = 'match';
      radio.value = String(idx);
      choiceCell.appendChild(radio);
      row.appendChild(choiceCell);

      tbody.appendChild(row);
    });

    table.appendChild(thead);
    table.appendChild(tbody);
    el.searchResults.appendChild(table);
  }

  function getSelectedMatchIndex() {
    const selected = el.searchResults.querySelector('input[name="match"]:checked');
    if (!selected) {
      return null;
    }

    const idx = Number.parseInt(selected.value, 10);
    if (!Number.isInteger(idx) || idx < 0) {
      return null;
    }

    return idx;
  }

  function renderQuiz(entry, playerName) {
    el.quizTitle.textContent = playerName;
    el.quizMoviePrompt.textContent = `Movie: ${entry.primaryTitle}`;
    el.yearPrompt.textContent = `What year was "${entry.primaryTitle}" released?`;
    el.ratingPrompt.textContent = `What rating out of 10 does "${entry.primaryTitle}" have?`;
    el.yearGuessInput.value = '';
    el.ratingGuessInput.value = '';
    setQuizFieldErrors('', '');
    setNextQuizEnabled(true);
    el.yearGuessInput.focus();
  }

  function getQuizAnswerInputs() {
    return {
      yearRaw: el.yearGuessInput.value.trim(),
      ratingRaw: el.ratingGuessInput.value.trim()
    };
  }

  function setQuizFieldErrors(yearMessage, ratingMessage) {
    el.yearError.textContent = yearMessage || '';
    el.ratingError.textContent = ratingMessage || '';
  }

  function setNextQuizEnabled(enabled) {
    el.nextQuizBtn.disabled = !enabled;
  }

  function renderResults(scores, winnerSummary) {
    clearChildren(el.resultsList);

    const summaryText = doc.createElement('p');
    if (winnerSummary.winners.length === 0) {
      summaryText.textContent = winnerSummary.textBeforeNames;
    } else {
      summaryText.appendChild(doc.createTextNode(winnerSummary.textBeforeNames));
      const winnerNames = doc.createElement('strong');
      winnerNames.textContent = winnerSummary.winners.join(', ');
      summaryText.appendChild(winnerNames);
      summaryText.appendChild(doc.createTextNode(winnerSummary.textAfterNames));
    }
    el.resultsList.appendChild(summaryText);

    const table = doc.createElement('table');
    const thead = doc.createElement('thead');
    const headRow = doc.createElement('tr');
    ['Player', 'Movie', 'Rating', 'Year', 'Bonus'].forEach(label => appendCell(headRow, 'th', label));
    thead.appendChild(headRow);

    const tbody = doc.createElement('tbody');

    scores.forEach(score => {
      const tr = doc.createElement('tr');
      appendCell(tr, 'td', score.name);
      appendCell(tr, 'td', score.title);
      appendValueWithMark(tr, formatRating(score.rating), score.correctRating);
      appendValueWithMark(tr, formatYear(score.startYear), score.correctYear);
      appendCell(tr, 'td', String(score.points));
      tbody.appendChild(tr);
    });

    table.appendChild(thead);
    table.appendChild(tbody);
    el.resultsList.appendChild(table);
  }

  function appendValueWithMark(row, valueText, isCorrect) {
    const cell = doc.createElement('td');
    const value = doc.createElement('span');
    value.textContent = `${valueText} `;
    cell.appendChild(value);

    const mark = doc.createElement('span');
    mark.textContent = isCorrect ? '✓' : '✗';
    mark.className = isCorrect ? 'mark-correct' : 'mark-incorrect';
    cell.appendChild(mark);

    row.appendChild(cell);
  }

  function clearResults() {
    clearChildren(el.resultsList);
  }

  return {
    el,
    setStage,
    getPlayerNameValues,
    renderPlayerNameInputs,
    updateStartEnabled,
    setMoviePrompt,
    clearMovieEntryForm,
    focusMovieTitle,
    setSearchEnabled,
    setConfirmEnabled,
    renderSearchError,
    renderNoMatches,
    renderSearchResults,
    getSelectedMatchIndex,
    renderQuiz,
    getQuizAnswerInputs,
    setQuizFieldErrors,
    setNextQuizEnabled,
    renderResults,
    clearResults
  };
}
