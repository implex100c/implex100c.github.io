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

const IMDB_TITLE_BASE_URL = 'https://www.imdb.com/title/';

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
    lobbyRules: doc.getElementById('lobby-rules'),
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

  function createMovieLink(tconst, title) {
    if (!(typeof tconst === 'string' && tconst.startsWith('tt'))) {
      const text = doc.createElement('span');
      text.textContent = title;
      return text;
    }

    const link = doc.createElement('a');
    link.className = 'movie-link';
    link.textContent = title;
    link.href = `${IMDB_TITLE_BASE_URL}${tconst}/`;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    return link;
  }

  function appendQuestionText(container, prefix, title, suffix) {
    container.textContent = `${prefix}${title}${suffix}`;
  }

  function setStage(stage) {
    el.lobby.classList.toggle('hidden', stage !== 'lobby');
    el.lobbyRules.classList.toggle('hidden', stage !== 'lobby');
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

  function setMoviePrompt(playerName, playerNumber) {
    el.movieEntryTitle.textContent = `Player ${playerNumber}: ${playerName}`;
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

    const list = doc.createElement('div');
    list.className = 'search-options';

    matches.forEach((movie, idx) => {
      const option = doc.createElement('label');
      option.className = 'search-option';

      const radio = doc.createElement('input');
      radio.type = 'radio';
      radio.name = 'match';
      radio.value = String(idx);
      option.appendChild(radio);

      const textWrap = doc.createElement('div');
      const title = doc.createElement('div');
      title.className = 'search-option-title';
      title.textContent = movie.primaryTitle;
      const meta = doc.createElement('div');
      meta.className = 'search-option-meta';
      meta.textContent = `${formatDecade(movie.startYear)} • ${movie.numVotes.toLocaleString()} votes`;
      textWrap.appendChild(title);
      textWrap.appendChild(meta);
      option.appendChild(textWrap);

      list.appendChild(option);
    });

    el.searchResults.appendChild(list);
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

  function updateSearchSelectionStyles() {
    const options = el.searchResults.querySelectorAll('.search-option');
    options.forEach(option => {
      const input = option.querySelector('input[name="match"]');
      option.classList.toggle('selected', Boolean(input && input.checked));
    });
  }

  function renderQuiz(entry, playerName, playerNumber) {
    el.quizTitle.textContent = `Player ${playerNumber}: ${playerName}`;
    clearChildren(el.quizMoviePrompt);
    el.quizMoviePrompt.appendChild(createMovieLink(entry.tconst, entry.primaryTitle));
    appendQuestionText(el.yearPrompt, 'What year was "', entry.primaryTitle, '" released?');
    appendQuestionText(el.ratingPrompt, 'What rating out of 10 does "', entry.primaryTitle, '" have?');
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
    const winnerNames = new Set(winnerSummary.winners);

    const rows = scores.map(score => createResultRowModel(score, winnerNames.has(score.name)));
    rows.forEach(row => tbody.appendChild(renderDesktopResultRow(row)));

    table.appendChild(thead);
    table.appendChild(tbody);
    el.resultsList.appendChild(table);

    const cards = doc.createElement('div');
    cards.className = 'results-cards';

    rows.forEach(row => cards.appendChild(renderMobileResultCard(row)));

    el.resultsList.appendChild(cards);
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

  function createResultRowModel(score, isWinner) {
    return {
      playerLabel: isWinner ? `🏆 ${score.name}` : score.name,
      tconst: score.tconst,
      title: score.title,
      ratingText: formatRating(score.rating),
      yearText: formatYear(score.startYear),
      correctRating: score.correctRating,
      correctYear: score.correctYear,
      bonusText: String(score.points)
    };
  }

  function renderDesktopResultRow(row) {
    const tr = doc.createElement('tr');
    appendCell(tr, 'td', row.playerLabel);
    const movieCell = doc.createElement('td');
    movieCell.appendChild(createMovieLink(row.tconst, row.title));
    tr.appendChild(movieCell);

    const ratingCell = doc.createElement('td');
    ratingCell.appendChild(createMarkedValue(row.ratingText, row.correctRating));
    tr.appendChild(ratingCell);

    const yearCell = doc.createElement('td');
    yearCell.appendChild(createMarkedValue(row.yearText, row.correctYear));
    tr.appendChild(yearCell);

    appendCell(tr, 'td', row.bonusText);
    return tr;
  }

  function renderMobileResultCard(row) {
    const card = doc.createElement('article');
    card.className = 'result-card';

    const header = doc.createElement('div');
    header.className = 'result-card-header';
    const player = doc.createElement('span');
    player.textContent = row.playerLabel;
    header.appendChild(player);
    const bonus = doc.createElement('span');
    bonus.textContent = `Bonus: ${row.bonusText}`;
    header.appendChild(bonus);
    card.appendChild(header);

    card.appendChild(createResultCardRow('Movie', createMovieLink(row.tconst, row.title)));
    card.appendChild(createResultCardRow('Rating', createMarkedValue(row.ratingText, row.correctRating)));
    card.appendChild(createResultCardRow('Year', createMarkedValue(row.yearText, row.correctYear)));

    return card;
  }

  function createResultCardRow(keyText, valueNode) {
    const row = doc.createElement('div');
    row.className = 'result-card-row';

    const key = doc.createElement('span');
    key.className = 'result-card-key';
    key.textContent = keyText;
    row.appendChild(key);

    const valueWrap = doc.createElement('span');
    valueWrap.className = 'result-card-value';
    valueWrap.appendChild(valueNode);
    row.appendChild(valueWrap);

    return row;
  }

  function createMarkedValue(valueText, isCorrect) {
    const wrap = doc.createElement('span');
    const value = doc.createElement('span');
    value.textContent = `${valueText} `;
    wrap.appendChild(value);
    const mark = doc.createElement('span');
    mark.textContent = isCorrect ? '✓' : '✗';
    mark.className = isCorrect ? 'mark-correct' : 'mark-incorrect';
    wrap.appendChild(mark);
    return wrap;
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
    updateSearchSelectionStyles,
    renderQuiz,
    getQuizAnswerInputs,
    setQuizFieldErrors,
    setNextQuizEnabled,
    renderResults,
    clearResults
  };
}
