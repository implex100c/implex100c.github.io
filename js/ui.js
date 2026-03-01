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

export function createUI(doc) {
  const el = {
    lobby: doc.getElementById('lobby'),
    movieEntry: doc.getElementById('movie-entry'),
    quiz: doc.getElementById('quiz'),
    results: doc.getElementById('results'),
    numPlayersInput: doc.getElementById('numPlayers'),
    namesContainer: doc.getElementById('playerNames'),
    startBtn: doc.getElementById('startBtn'),
    moviePrompt: doc.getElementById('movie-prompt'),
    movieTitleInput: doc.getElementById('movieTitle'),
    searchBtn: doc.getElementById('searchBtn'),
    confirmBtn: doc.getElementById('confirmBtn'),
    searchResults: doc.getElementById('searchResults'),
    yearPrompt: doc.getElementById('yearPrompt'),
    ratingPrompt: doc.getElementById('ratingPrompt'),
    quizTableBody: doc.getElementById('quizTableBody'),
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
    el.moviePrompt.textContent = `${playerName}, what's your guilty-pleasure movie?`;
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
      appendCell(row, 'td', `${movie.primaryTitle} (${formatYear(movie.startYear)})`);

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
    el.yearPrompt.textContent = `What Year was "${entry.primaryTitle}" released?`;
    el.ratingPrompt.textContent = `What Rating out of 10 does "${entry.primaryTitle}" have?`;
    clearChildren(el.quizTableBody);

    const rows = [
      ['Player', playerName],
      ['Movie Title', entry.primaryTitle],
      ['Year', formatYear(entry.startYear)],
      ['Rating', formatRating(entry.averageRating)]
    ];

    rows.forEach(([label, value]) => {
      const tr = doc.createElement('tr');
      appendCell(tr, 'th', label);
      appendCell(tr, 'td', value);
      el.quizTableBody.appendChild(tr);
    });

    const yearRow = doc.createElement('tr');
    appendCell(yearRow, 'th', 'Correct Year');
    const yearCell = doc.createElement('td');
    const yearCheck = doc.createElement('input');
    yearCheck.type = 'checkbox';
    yearCheck.id = 'yearChk';
    yearCheck.checked = Boolean(entry.correctYear);
    yearCell.appendChild(yearCheck);
    yearRow.appendChild(yearCell);
    el.quizTableBody.appendChild(yearRow);

    const ratingRow = doc.createElement('tr');
    appendCell(ratingRow, 'th', 'Correct Rating');
    const ratingCell = doc.createElement('td');
    const ratingCheck = doc.createElement('input');
    ratingCheck.type = 'checkbox';
    ratingCheck.id = 'ratingChk';
    ratingCheck.checked = Boolean(entry.correctRating);
    ratingCell.appendChild(ratingCheck);
    ratingRow.appendChild(ratingCell);
    el.quizTableBody.appendChild(ratingRow);
  }

  function getQuizChecks() {
    const year = doc.getElementById('yearChk');
    const rating = doc.getElementById('ratingChk');

    return {
      correctYear: Boolean(year && year.checked),
      correctRating: Boolean(rating && rating.checked)
    };
  }

  function renderResults(scores) {
    clearChildren(el.resultsList);

    const ruleText = doc.createElement('p');
    ruleText.textContent = 'Winner order: lowest rating first, then highest score, then name (A-Z) for final tie-breaks.';
    el.resultsList.appendChild(ruleText);

    const table = doc.createElement('table');
    const thead = doc.createElement('thead');
    const headRow = doc.createElement('tr');
    ['Player', 'Movie Title', 'Rating (lower is better)', 'Score (higher is better)'].forEach(label => appendCell(headRow, 'th', label));
    thead.appendChild(headRow);

    const tbody = doc.createElement('tbody');

    scores.forEach(score => {
      const tr = doc.createElement('tr');
      appendCell(tr, 'td', score.name);
      appendCell(tr, 'td', score.title);
      appendCell(tr, 'td', formatRating(score.rating));
      appendCell(tr, 'td', String(score.points));
      tbody.appendChild(tr);
    });

    table.appendChild(thead);
    table.appendChild(tbody);
    el.resultsList.appendChild(table);
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
    getQuizChecks,
    renderResults,
    clearResults
  };
}
