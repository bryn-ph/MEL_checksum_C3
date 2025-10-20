// Core state and constants
const MAX_QUESTIONS = 35;
const gameState = {
    cash: 2000,
    debt: 0,
    properties: [],
    timer: null, // active interval id for countdown
    questionCount: 0,
    investedInStocks: false,
    stocksValue: 0,
    // Housing penalties
    rentArrears: 0,
    housingCostMultiplier: 1,
  // Current job (null = unemployed)
  currentJob: null,
  // Active statuses that apply effects each round (job payments, sickness, bonuses, penalties)
  statuses: [],
    // UX
    sfxEnabled: true,
    achievements: new Set(),
};

// expose a minimal job API on window.gameState for UI and other modules
window.gameState = window.gameState || {};
window.gameState.getCurrentJob = window.gameState.getCurrentJob || function () {
  return gameState.currentJob || null;
};
window.gameState.setCurrentJob = window.gameState.setCurrentJob || function (job) {
  gameState.currentJob = job || null;
  // emit event for UI listeners
  try {
    window.dispatchEvent(new CustomEvent('job:changed', { detail: gameState.currentJob }));
  } catch (e) {
    try {
      const ev = document.createEvent('CustomEvent');
      ev.initCustomEvent('job:changed', true, true, gameState.currentJob);
      window.dispatchEvent(ev);
    } catch (e2) { /* ignore */ }
  }
  if (typeof updateCounters === 'function') updateCounters();
  // manage a persistent job status
  // remove any previous 'job' status
  gameState.statuses = gameState.statuses || [];
  gameState.statuses = gameState.statuses.filter(s => s.type !== 'job');
  if (job) {
    // derive a per-round payment (approx weekly) and apply every 3 rounds by default
    const payment = job.salary ? Math.round((job.salary || 0) / 52) : 0;
    const status = {
      id: 'job', type: 'job', label: job.title || 'Job',
      persistent: true,
      paymentAmount: payment,
      paymentInterval: 3,
      // status does not expire unless job cleared
    };
    gameState.statuses.push(status);
  }
  // notify listeners statuses changed
  try { window.dispatchEvent(new CustomEvent('statuses:changed', { detail: gameState.statuses })); } catch (e) {}
};

// Status helpers
function addStatus(status) {
  gameState.statuses = gameState.statuses || [];
  // ensure unique id
  status.id = status.id || ('s' + Date.now() + Math.floor(Math.random()*1000));
  gameState.statuses.push(status);
  try { window.dispatchEvent(new CustomEvent('statuses:changed', { detail: gameState.statuses })); } catch (e) {}
  return status.id;
}

function removeStatusById(id) {
  gameState.statuses = gameState.statuses || [];
  const before = gameState.statuses.length;
  gameState.statuses = gameState.statuses.filter(s => s.id !== id);
  if (gameState.statuses.length !== before) {
    try { window.dispatchEvent(new CustomEvent('statuses:changed', { detail: gameState.statuses })); } catch (e) {}
  }
}

// expose a minimal statuses API
window.gameState = window.gameState || {};
window.gameState.addStatus = window.gameState.addStatus || addStatus;
window.gameState.removeStatusById = window.gameState.removeStatusById || removeStatusById;

// Track used events
const usedEvents = {
    job: new Set(),
    housing: new Set(),
    random: new Set()
};

function clearActiveTimer() {
    if (gameState.timer) {
        clearInterval(gameState.timer);
        gameState.timer = null;
    }
}

// ...existing code...

// Listen for the job change event and update the job display in the UI.
(function () {
  function renderJob(job) {
    const el = document.getElementById('job-counter');
    if (!el) return;
    const label = job
      ? (typeof job === 'string' ? job : (job.title || job.name || JSON.stringify(job)))
      : 'Unemployed';
    el.textContent = `🏢 Job: ${label}`;
    // subtle visual feedback when job changes
    el.classList.add('flash');
    setTimeout(() => el.classList.remove('flash'), 900);
  }

  // initial render from state (if available)
  try {
    if (window.gameState && typeof window.gameState.getCurrentJob === 'function') {
      renderJob(window.gameState.getCurrentJob());
    }
  } catch (e) { /* noop */ }

  window.addEventListener('job:changed', (ev) => {
    renderJob(ev.detail);
  });
})();

// ...existing code...

function resetGameState() {
  // stop any active timers
  try { clearActiveTimer(); } catch (e) {}

  gameState.cash = 2000;
  gameState.debt = 0;
  gameState.properties = [];
  gameState.timer = null;
  gameState.questionCount = 0;
  gameState.investedInStocks = false;
  gameState.stocksValue = 0;
  gameState.rentArrears = 0;
  gameState.housingCostMultiplier = 1;
  // clear used events
  usedEvents.job.clear();
  usedEvents.housing.clear();
  usedEvents.random.clear();

  // Clear current job and statuses and notify listeners
  try {
    if (window.gameState && typeof window.gameState.setCurrentJob === 'function') window.gameState.setCurrentJob(null);
  } catch (e) {}
  gameState.statuses = [];
  try { window.dispatchEvent(new CustomEvent('statuses:changed', { detail: gameState.statuses })); } catch (e) {}

  // Reset achievements
  gameState.achievements = new Set();

  // Update UI counters
  if (typeof updateCounters === 'function') updateCounters();
}
