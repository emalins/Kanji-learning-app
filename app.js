const fileInput = document.getElementById('fileInput');
const storedSelect = document.getElementById('storedSelect');
const rangeWrap = document.getElementById('rangeWrap');
const rangeSelect = document.getElementById('rangeSelect');
const modeToggle = document.getElementById('modeToggle');
const settingsBtn = document.getElementById('settingsBtn');
const statsBtn = document.getElementById('statsBtn');
const addTsvWrap = document.getElementById('addTsvWrap');
const fileStatus = document.getElementById('fileStatus');
const rowStatus = document.getElementById('rowStatus');
const errorBox = document.getElementById('errorBox');
const studyCard = document.getElementById('studyCard');
const kanjiEl = document.getElementById('kanji');
const browseDetails = document.getElementById('browseDetails');
const meaningValue = document.getElementById('meaningValue');
const exampleValue = document.getElementById('exampleValue');
const exampleReadingValue = document.getElementById('exampleReadingValue');
const exampleMeaningValue = document.getElementById('exampleMeaningValue');
const quizArea = document.getElementById('quizArea');
const quizInput = document.getElementById('quizInput');
const quizFeedback = document.getElementById('quizFeedback');
const quizAnswer = document.getElementById('quizAnswer');
const quizMeaningValue = document.getElementById('quizMeaningValue');
const quizExampleValue = document.getElementById('quizExampleValue');
const quizExampleReadingValue = document.getElementById('quizExampleReadingValue');
const quizExampleMeaningValue = document.getElementById('quizExampleMeaningValue');
const continueQuizBtn = document.getElementById('continueQuizBtn');
const restartQuizBtn = document.getElementById('restartQuizBtn');
const quizCompletePanel = document.getElementById('quizCompletePanel');
const quizCompleteSummary = document.getElementById('quizCompleteSummary');
const resultGrid = document.getElementById('resultGrid');
const statsPanel = document.getElementById('statsPanel');
const statsSummary = document.getElementById('statsSummary');
const statsGrid = document.getElementById('statsGrid');
const navControls = document.getElementById('navControls');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');

const CURRENT_FILE_KEY = 'kanji_current_file';
const CUSTOM_FILES_KEY = 'kanji_custom_files';
const MODE_KEY = 'kanji_mode';
const QUIZ_RANGE_KEY = 'kanji_quiz_range';
const SETTINGS_OPEN_KEY = 'kanji_settings_open';
const QUIZ_STATS_KEY = 'kanji_quiz_stats';

const BUILTIN_FALLBACK = [
  { source: 'builtin', id: 'builtin:data/N5_v1.0.tsv', label: 'N5', name: 'N5_v1.0.tsv', path: 'data/N5_v1.0.tsv' },
  { source: 'builtin', id: 'builtin:data/N4_v1.0.tsv', label: 'N4', name: 'N4_v1.0.tsv', path: 'data/N4_v1.0.tsv' },
  { source: 'builtin', id: 'builtin:data/N3_v1.0.tsv', label: 'N3', name: 'N3_v1.0.tsv', path: 'data/N3_v1.0.tsv' },
];
let builtinFiles = [...BUILTIN_FALLBACK];

let rows = [];
let currentSource = '';
let currentLabel = '';
let currentFileId = '';
let currentFileStats = {};
let index = 0;
let customFiles = loadCustomFiles();
let mode = localStorage.getItem(MODE_KEY) || 'browse';
let quizLimit = parseInt(localStorage.getItem(QUIZ_RANGE_KEY) || '20', 10);
let quizOrder = [];
let quizCursor = 0;
let quizResults = [];
let quizState = { attempts: 0, revealed: false, complete: false };
let showStatistics = false;
let settingsOpen = localStorage.getItem(SETTINGS_OPEN_KEY) === '1';
let presentedRecorded = false;

function fallbackBuiltinFiles() {
  return [...BUILTIN_FALLBACK];
}

function showError(message) {
  errorBox.textContent = message;
  errorBox.classList.toggle('hidden', !message);
}

function loadCustomFiles() {
  try {
    const raw = localStorage.getItem(CUSTOM_FILES_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveCustomFiles(files) {
  localStorage.setItem(CUSTOM_FILES_KEY, JSON.stringify(files));
}

function saveCurrentSelection(fileId) {
  localStorage.setItem(CURRENT_FILE_KEY, fileId);
}

function loadQuizStats() {
  try {
    const raw = localStorage.getItem(QUIZ_STATS_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function saveQuizStats(stats) {
  localStorage.setItem(QUIZ_STATS_KEY, JSON.stringify(stats));
}

function currentFileStatsKey() {
  return currentSource || currentLabel || 'current';
}

function ensureStatsEntry(fileStats, id) {
  if (!fileStats[id]) fileStats[id] = { presented: 0, correct: 0, incorrect: 0 };
  return fileStats[id];
}

function mutateFileStats(mutator) {
  const allStats = loadQuizStats();
  const fileKey = currentFileStatsKey();
  if (!allStats[fileKey]) allStats[fileKey] = {};
  mutator(allStats[fileKey]);
  saveQuizStats(allStats);
}

function incrementPresented(id) {
  mutateFileStats((fileStats) => { ensureStatsEntry(fileStats, id).presented += 1; });
}

function incrementCorrect(id) {
  mutateFileStats((fileStats) => { ensureStatsEntry(fileStats, id).correct += 1; });
}

function incrementIncorrect(id) {
  mutateFileStats((fileStats) => { ensureStatsEntry(fileStats, id).incorrect += 1; });
}

function getCurrentFileStats() {
  const allStats = loadQuizStats();
  return allStats[currentFileStatsKey()] || {};
}

function parseTsv(text) {
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n').filter((line) => line.trim().length > 0);
  if (!lines.length) throw new Error('The TSV file appears to be empty.');
  const parsed = lines.map((line) => line.split('\t'));
  const header = parsed[0].map((cell) => cell.trim());
  if (header[0] !== 'ID') throw new Error('This app expects a TSV whose first column header is ID.');
  return parsed.slice(1);
}

async function fetchText(path) {
  const response = await fetch(path, { cache: 'no-store' });
  if (!response.ok) throw new Error(`Failed to load ${path}`);
  return response.text();
}

async function loadDataIndex() {
  const text = await fetchText('data-index.json');
  const parsed = JSON.parse(text);
  return Array.isArray(parsed.files) ? parsed.files : [];
}

function getAllFiles() {
  return [
    ...builtinFiles,
    ...customFiles.map((file) => ({ ...file, source: 'custom', id: `custom:${file.name}` })),
  ];
}

function populateSelect() {
  const allFiles = getAllFiles();
  storedSelect.innerHTML = '';
  allFiles.forEach((file) => {
    const option = document.createElement('option');
    option.value = file.id;
    option.textContent = file.source === 'builtin' ? file.label : `${file.name} (added)`;
    storedSelect.appendChild(option);
  });
  if (currentFileId) storedSelect.value = currentFileId;
}

function populateRangeSelect() {
  const maxCount = rows.length;
  const options = [];
  const upper = maxCount || 20;
  for (let end = 20; end < upper; end += 20) options.push(end);
  if (maxCount > 0) options.push(maxCount);
  if (options.length === 0) options.push(20);
  const unique = [...new Set(options)].sort((a, b) => a - b);
  rangeSelect.innerHTML = '';
  unique.forEach((end) => {
    const option = document.createElement('option');
    option.value = String(end);
    option.textContent = `1-${end}`;
    rangeSelect.appendChild(option);
  });
  if (!unique.includes(quizLimit)) quizLimit = unique[0];
  rangeSelect.value = String(quizLimit);
  localStorage.setItem(QUIZ_RANGE_KEY, String(quizLimit));
}

function syncModeUi() {
  modeToggle.checked = mode === 'quiz';
  rangeWrap.classList.toggle('hidden', mode !== 'quiz');
}

function setMode(nextMode) {
  mode = nextMode === 'quiz' ? 'quiz' : 'browse';
  localStorage.setItem(MODE_KEY, mode);
  if (mode === 'quiz') {
    buildQuizOrder();
  } else {
    showStatistics = false;
  }
  render();
  if (mode === 'quiz' && !showStatistics) {
    quizInput.focus();
    quizInput.select();
  }
}

function normalizeAnswer(value) {
  return value.toLowerCase().trim().replace(/\s+/g, ' ');
}

function acceptedAnswers(meaningText) {
  return meaningText.split(';').map((part) => normalizeAnswer(part)).filter(Boolean);
}

function shuffle(array) {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function getCurrentRow() {
  return rows[quizOrder[quizCursor]] || null;
}

function resetQuestionState() {
  quizState = { attempts: 0, revealed: false, complete: false };
  presentedRecorded = false;
}

function buildQuizOrder() {
  const limit = Math.min(quizLimit, rows.length);
  quizOrder = shuffle(Array.from({ length: limit }, (_, i) => i));
  quizCursor = 0;
  quizResults = [];
  showStatistics = false;
  statsBtn.textContent = 'Statistics';
  resetQuestionState();
}

function currentQuizRow() {
  return rows[quizOrder[quizCursor]] || null;
}

function recordPresentedForCurrentQuestion() {
  const row = currentQuizRow();
  if (!row || presentedRecorded) return;
  incrementPresented(row[0]);
  currentFileStats = getCurrentFileStats();
  presentedRecorded = true;
}

function setQuizVisual(state) {
  studyCard.classList.remove('quiz-correct', 'quiz-wrong');
  if (state === 'correct') studyCard.classList.add('quiz-correct');
  if (state === 'wrong') studyCard.classList.add('quiz-wrong');
}

function hideQuizPanels() {
  quizCompletePanel.classList.add('hidden');
  statsPanel.classList.add('hidden');
  quizArea.classList.add('hidden');
}

function renderBrowse() {
  const row = rows[index] || null;
  const hasRows = !!row;

  hideQuizPanels();
  browseDetails.classList.toggle('hidden', !hasRows);
  navControls.classList.remove('hidden');
  studyCard.classList.remove('quiz-mode');
  setQuizVisual(null);
  quizFeedback.textContent = '';
  quizInput.value = '';
  quizInput.classList.remove('hidden');
  continueQuizBtn.classList.add('hidden');
  restartQuizBtn.classList.add('hidden');

  kanjiEl.textContent = hasRows ? (row[1] || '—') : '—';
  if (hasRows) {
    meaningValue.textContent = row[2] || '';
    exampleValue.textContent = row[5] || '';
    exampleReadingValue.textContent = row[6] || '';
    exampleMeaningValue.textContent = row[7] || '';
  } else {
    meaningValue.textContent = '';
    exampleValue.textContent = '';
    exampleReadingValue.textContent = '';
    exampleMeaningValue.textContent = '';
  }
}

function renderQuizQuestion() {
  const row = currentQuizRow();
  if (!row) return;

  quizArea.classList.remove('hidden');
  quizInput.classList.remove('hidden');
  quizFeedback.classList.remove('hidden');
  browseDetails.classList.add('hidden');
  navControls.classList.add('hidden');
  quizCompletePanel.classList.add('hidden');
  statsPanel.classList.add('hidden');

  if (!presentedRecorded) recordPresentedForCurrentQuestion();

  kanjiEl.textContent = row[1] || '—';
  quizInput.value = quizInput.value; // no-op, keeps value
  continueQuizBtn.classList.add('hidden');
  restartQuizBtn.classList.add('hidden');
  quizAnswer.classList.add('hidden');

  if (quizState.revealed) {
    quizAnswer.classList.remove('hidden');
    quizMeaningValue.textContent = row[2] || '';
    quizExampleValue.textContent = row[5] || '';
    quizExampleReadingValue.textContent = row[6] || '';
    quizExampleMeaningValue.textContent = row[7] || '';
    continueQuizBtn.classList.remove('hidden');
    restartQuizBtn.classList.remove('hidden');
    setQuizVisual('wrong');
    quizFeedback.textContent = 'Answer shown';
  } else if (quizState.attempts > 0) {
    setQuizVisual('wrong');
    quizFeedback.textContent = `Try again (${quizState.attempts}/3)`;
  } else {
    setQuizVisual(null);
    quizFeedback.textContent = '';
  }
}

function renderQuizComplete() {
  const total = quizResults.length;
  const correctCount = quizResults.filter((r) => r.correct).length;
  const wrongCount = total - correctCount;

  quizArea.classList.remove('hidden');
  quizInput.classList.add('hidden');
  quizAnswer.classList.add('hidden');
  continueQuizBtn.classList.add('hidden');
  restartQuizBtn.classList.remove('hidden');
  quizCompletePanel.classList.remove('hidden');
  statsPanel.classList.add('hidden');
  browseDetails.classList.add('hidden');
  navControls.classList.add('hidden');
  kanjiEl.textContent = 'Done';
  quizFeedback.textContent = `Quiz complete: ${correctCount} correct, ${wrongCount} incorrect`;
  quizCompleteSummary.textContent = `You tested ${total} kanji. ${correctCount} correct, ${wrongCount} incorrect.`;

  resultGrid.innerHTML = '';
  quizResults.forEach((result, i) => {
    const item = document.createElement('div');
    item.className = `result-item ${result.correct ? 'correct' : 'wrong'}`;
    const top = document.createElement('strong');
    top.textContent = result.kanji || '—';
    const bottom = document.createElement('span');
    bottom.className = 'small';
    bottom.textContent = `${i + 1}`;
    item.appendChild(top);
    item.appendChild(bottom);
    resultGrid.appendChild(item);
  });
  setQuizVisual('correct');
}

function renderStatistics() {
  const stats = getCurrentFileStats();
  const totalPresented = rows.reduce((sum, row) => sum + ((stats[row[0]]?.presented) || 0), 0);
  const totalCorrect = rows.reduce((sum, row) => sum + ((stats[row[0]]?.correct) || 0), 0);
  const totalIncorrect = rows.reduce((sum, row) => sum + ((stats[row[0]]?.incorrect) || 0), 0);

  quizArea.classList.remove('hidden');
  quizInput.classList.add('hidden');
  quizAnswer.classList.add('hidden');
  continueQuizBtn.classList.add('hidden');
  restartQuizBtn.classList.add('hidden');
  quizCompletePanel.classList.add('hidden');
  statsPanel.classList.remove('hidden');
  browseDetails.classList.add('hidden');
  navControls.classList.add('hidden');
  kanjiEl.textContent = 'Statistics';
  statsSummary.textContent = `Presented ${totalPresented}, correct ${totalCorrect}, incorrect ${totalIncorrect}.`;

  statsGrid.innerHTML = '';
  rows.forEach((row) => {
    const entry = stats[row[0]] || { presented: 0, correct: 0, incorrect: 0 };
    const item = document.createElement('div');
    item.className = `stat-item ${entry.presented === 0 ? 'neutral' : (entry.correct >= entry.incorrect ? 'correct' : 'wrong')}`;
    const top = document.createElement('strong');
    top.textContent = row[1] || '—';
    const bottom = document.createElement('span');
    bottom.className = 'small';
    bottom.textContent = `P:${entry.presented} C:${entry.correct} W:${entry.incorrect}`;
    item.appendChild(top);
    item.appendChild(bottom);
    statsGrid.appendChild(item);
  });
}

function renderQuiz() {
  const hasRows = rows.length > 0;
  if (!hasRows) {
    quizArea.classList.add('hidden');
    browseDetails.classList.add('hidden');
    quizCompletePanel.classList.add('hidden');
    statsPanel.classList.add('hidden');
    navControls.classList.add('hidden');
    kanjiEl.textContent = '—';
    return;
  }

  if (showStatistics) {
    renderStatistics();
    return;
  }

  if (quizCursor >= quizOrder.length) {
    renderQuizComplete();
    return;
  }

  renderQuizQuestion();
}

function render() {
  const hasRows = rows.length > 0;
  rowStatus.textContent = hasRows ? `${index + 1} / ${rows.length}` : '0 / 0';
  prevBtn.disabled = !hasRows || index === 0;
  nextBtn.disabled = !hasRows || index >= rows.length - 1;
  fileStatus.textContent = currentLabel || 'No file loaded';

  syncModeUi();
  if (mode === 'browse') {
    statsBtn.classList.add('hidden');
    showStatistics = false;
    statsPanel.classList.add('hidden');
    renderBrowse();
  } else {
    statsBtn.classList.remove('hidden');
    statsBtn.textContent = showStatistics ? 'Hide statistics' : 'Statistics';
    renderQuiz();
  }
}

function loadCurrentFile(fileId, persist = true) {
  const selected = getAllFiles().find((file) => file.id === fileId);
  if (!selected) {
    showError('That TSV could not be found.');
    return Promise.resolve();
  }

  currentFileId = selected.id;
  currentSource = selected.id;
  currentLabel = selected.source === 'builtin' ? `Stored file: ${selected.label}` : `Added file: ${selected.name}`;
  showStatistics = false;
  statsBtn.textContent = 'Statistics';

  const loadText = selected.source === 'builtin'
    ? fetchText(selected.path)
    : Promise.resolve(selected.content);

  return loadText.then((text) => {
    rows = parseTsv(text);
    index = 0;
    currentFileStats = getCurrentFileStats();
    populateRangeSelect();
    if (mode === 'quiz') buildQuizOrder();
    showError('');
    if (persist) saveCurrentSelection(selected.id);
    render();
  }).catch((err) => {
    rows = [];
    index = 0;
    currentSource = '';
    currentLabel = '';
    showError(err?.message || 'Could not load the TSV file.');
    populateRangeSelect();
    render();
  });
}

function advanceQuiz() {
  if (quizCursor < quizOrder.length - 1) {
    quizCursor += 1;
    quizState = { attempts: 0, revealed: false, complete: false };
    presentedRecorded = false;
    quizInput.value = '';
    quizAnswer.classList.add('hidden');
    continueQuizBtn.classList.add('hidden');
    restartQuizBtn.classList.add('hidden');
    render();
    quizInput.focus();
  } else {
    quizCursor = quizOrder.length;
    quizState = { attempts: 0, revealed: false, complete: true };
    quizInput.value = '';
    render();
  }
}

function registerQuizResult(correct) {
  const row = currentQuizRow();
  if (!row) return;
  quizResults.push({ kanji: row[1] || '—', correct });
}

function answerCorrect() {
  const row = currentQuizRow();
  if (!row) return;
  incrementCorrect(row[0]);
  registerQuizResult(true);
  setQuizVisual('correct');
  quizFeedback.textContent = 'Correct';
  quizAnswer.classList.add('hidden');
  continueQuizBtn.classList.add('hidden');
  restartQuizBtn.classList.add('hidden');
  window.setTimeout(advanceQuiz, 650);
}

function revealAnswer() {
  const row = currentQuizRow();
  if (!row) return;
  incrementIncorrect(row[0]);
  registerQuizResult(false);
  quizState.revealed = true;
  quizAnswer.classList.remove('hidden');
  quizMeaningValue.textContent = row[2] || '';
  quizExampleValue.textContent = row[5] || '';
  quizExampleReadingValue.textContent = row[6] || '';
  quizExampleMeaningValue.textContent = row[7] || '';
  continueQuizBtn.classList.remove('hidden');
  restartQuizBtn.classList.remove('hidden');
  setQuizVisual('wrong');
  quizFeedback.textContent = 'Answer shown';
}

function checkQuizAnswer() {
  const row = currentQuizRow();
  if (!row || quizState.complete) return;

  const guess = normalizeAnswer(quizInput.value);
  const answers = acceptedAnswers(row[2] || '');

  if (answers.includes(guess)) {
    answerCorrect();
    return;
  }

  quizState.attempts += 1;
  if (quizState.attempts >= 3) {
    revealAnswer();
    return;
  }
  setQuizVisual('wrong');
  quizFeedback.textContent = `Try again (${quizState.attempts}/3)`;
}

function restartQuiz() {
  buildQuizOrder();
  render();
  quizInput.focus();
}

function continueQuiz() {
  advanceQuiz();
}

function toggleStatistics() {
  if (mode !== 'quiz') return;
  showStatistics = !showStatistics;
  statsBtn.textContent = showStatistics ? 'Hide statistics' : 'Statistics';
  render();
}

function toggleSettings() {
  settingsOpen = !settingsOpen;
  localStorage.setItem(SETTINGS_OPEN_KEY, settingsOpen ? '1' : '0');
  addTsvWrap.classList.toggle('hidden', !settingsOpen);
}

function setInitialFileSelection() {
  const remembered = localStorage.getItem(CURRENT_FILE_KEY);
  const defaultFileText = 'data/N5_v1.0.tsv';
  const chosen = remembered || builtinFiles.find((f) => f.path === defaultFileText)?.id || builtinFiles[0]?.id || '';
  if (chosen) {
    currentFileId = chosen;
    storedSelect.value = chosen;
    return loadCurrentFile(chosen, false);
  }
  populateRangeSelect();
  render();
  return Promise.resolve();
}

async function initialize() {
  populateSelect();
  populateRangeSelect();
  syncModeUi();
  if (settingsOpen) addTsvWrap.classList.remove('hidden');
  statsBtn.classList.add('hidden');

  try {
    const indexData = await loadDataIndex();
    builtinFiles = indexData.map((item) => ({
      source: 'builtin',
      id: `builtin:${item.path}`,
      label: item.label || item.name,
      name: item.name,
      path: item.path,
    }));
  } catch {
    builtinFiles = fallbackBuiltinFiles();
  }

  populateSelect();
  populateRangeSelect();
  await setInitialFileSelection();
}

function handleFileUpload(file) {
  return file.text().then((text) => {
    rows = parseTsv(text);
    index = 0;
    const customId = `custom:${file.name}`;
    const existing = customFiles.findIndex((entry) => entry.name === file.name);
    const payload = { name: file.name, content: text };
    if (existing >= 0) customFiles[existing] = payload;
    else customFiles = [...customFiles, payload];
    saveCustomFiles(customFiles);
    currentFileId = customId;
    currentSource = customId;
    currentLabel = `Added file: ${file.name}`;
    showStatistics = false;
    statsBtn.textContent = 'Statistics';
    saveCurrentSelection(customId);
    populateSelect();
    populateRangeSelect();
    storedSelect.value = customId;
    if (mode === 'quiz') buildQuizOrder();
    showError('');
    render();
  }).catch(() => {
    rows = [];
    index = 0;
    showError('Could not read the TSV file.');
    render();
  });
}

settingsBtn.addEventListener('click', toggleSettings);
statsBtn.addEventListener('click', toggleStatistics);
modeToggle.addEventListener('change', () => setMode(modeToggle.checked ? 'quiz' : 'browse'));
storedSelect.addEventListener('change', (e) => loadCurrentFile(e.target.value, true));
rangeSelect.addEventListener('change', () => {
  quizLimit = parseInt(rangeSelect.value, 10) || 20;
  localStorage.setItem(QUIZ_RANGE_KEY, String(quizLimit));
  if (mode === 'quiz') buildQuizOrder();
  render();
});
fileInput.addEventListener('change', (event) => {
  const file = event.target.files && event.target.files[0];
  if (!file) return;
  handleFileUpload(file);
  event.target.value = '';
});
prevBtn.addEventListener('click', () => {
  if (index > 0) index -= 1;
  render();
});
nextBtn.addEventListener('click', () => {
  if (index < rows.length - 1) index += 1;
  render();
});
quizInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    event.preventDefault();
    checkQuizAnswer();
  }
});
continueQuizBtn.addEventListener('click', continueQuiz);
restartQuizBtn.addEventListener('click', restartQuiz);
window.addEventListener('keydown', (event) => {
  if (mode === 'browse') {
    if (event.key === 'ArrowLeft') prevBtn.click();
    if (event.key === 'ArrowRight') nextBtn.click();
  }
});
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  });
}

initialize();
