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
    // UX
    sfxEnabled: true,
    achievements: new Set(),
};

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

function resetGameState() {
    gameState.cash = 2000;
    gameState.debt = 0;
    gameState.properties = [];
    gameState.timer = null;
    gameState.questionCount = 0;
    gameState.investedInStocks = false;
    gameState.stocksValue = 0;
    gameState.rentArrears = 0;
    gameState.housingCostMultiplier = 1;
    usedEvents.job.clear();
    usedEvents.housing.clear();
    usedEvents.random.clear();
    if (typeof updateCounters === 'function') updateCounters();
}
