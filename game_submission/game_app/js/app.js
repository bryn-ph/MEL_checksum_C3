// Game state
const MAX_QUESTIONS = 35;
const gameState = {
    cash: 2000,
    debt: 0,
    properties: [],
    timer: null, // active interval id for countdown
    questionCount: 0,
    investedInStocks: false,
    stocksValue: 0,
};

// Note: All content is data-driven from data/*.json. No static scenes.

// Load JSON data
let jobEvents = [];
let housingEvents = [];
let randomEvents = [];

async function loadEvents() {
    const jobResponse = await fetch("data/job_events.json");
    jobEvents = await jobResponse.json();

    const housingResponse = await fetch("data/housing_events.json");
    housingEvents = await housingResponse.json();

    const randomResponse = await fetch("data/random_events.json");
    randomEvents = await randomResponse.json();
}

// Update the counters dynamically
function updateCounters() {
    const moneyCounter = document.getElementById("money-counter");
    const stressCounter = document.getElementById("stress-counter");
    const debtCounter = document.getElementById("debt-counter");
    const progressEl = document.getElementById("progress-counter");
    const progressBar = document.getElementById("progress-bar");
    const stocksCounter = document.getElementById("stocks-counter");

    moneyCounter.innerText = `💰 Money: $${gameState.cash}`;
    stressCounter.innerText = `😰 Stress: ${gameState.stress || 0}`;

    if (gameState.debt > 0) {
        debtCounter.classList.remove("d-none");
        debtCounter.innerText = `💳 Debt: $${gameState.debt}`;
    } else {
        debtCounter.classList.add("d-none");
    }

    if (progressEl) {
        const current = Math.min(gameState.questionCount, MAX_QUESTIONS);
        progressEl.innerText = `Progress: ${current} / ${MAX_QUESTIONS}`;
        if (progressBar) {
            const pct = (current / MAX_QUESTIONS) * 100;
            progressBar.style.width = `${pct}%`;
            progressBar.setAttribute('aria-valuenow', String(Math.round(pct)));
        }
    }

    if (stocksCounter) {
        if (gameState.investedInStocks || gameState.stocksValue > 0) {
            stocksCounter.classList.remove("d-none");
            stocksCounter.innerText = `📈 Stocks: $${gameState.stocksValue}`;
        } else {
            stocksCounter.classList.add("d-none");
        }
    }
}

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

function showResultFeedback(effects, customMsg) {
    const banner = document.getElementById('event-result');
    const container = document.getElementById('game-container');
    const confettiBox = document.getElementById('confetti-container');
    if (!banner || !container) return;

    let deltaMoney = typeof effects?.money === 'number' ? effects.money : 0;
    let deltaStress = typeof effects?.stress === 'number' ? effects.stress : 0;
    let deltaDebt = typeof effects?.debt === 'number' ? effects.debt : 0;
    let deltaStocks = typeof effects?.stocksValue === 'number' ? effects.stocksValue : 0;

    const good = (deltaMoney > 0) || (deltaStress < 0) || (deltaStocks > 0) || (deltaDebt < 0);
    const bad = (deltaMoney < 0) || (deltaStress > 0) || (deltaDebt > 0) || (deltaStocks < 0);

    const parts = [];
    if (deltaMoney) parts.push(`${deltaMoney > 0 ? '💰 +$' + deltaMoney : '💸 -$' + Math.abs(deltaMoney)}`);
    if (deltaDebt) parts.push(`💳 Debt ${deltaDebt > 0 ? '+' + deltaDebt : deltaDebt}`);
    if (deltaStocks) parts.push(`📈 Stocks ${deltaStocks > 0 ? '+' + deltaStocks : deltaStocks}`);
    if (deltaStress) parts.push(`${deltaStress > 0 ? '😰 Stress +' + deltaStress : '🧘 Stress ' + deltaStress}`);

    const msg = customMsg || (good && !bad
        ? 'Massive success! ' + parts.join(' • ')
        : bad && !good
            ? 'Oof, that stung. ' + parts.join(' • ')
            : 'Mixed outcome: ' + parts.join(' • '));

    banner.classList.remove('d-none', 'result-success', 'result-fail');
    const outcomeClass = good && !bad ? 'result-success' : (bad && !good ? 'result-fail' : null);
    if (outcomeClass) banner.classList.add(outcomeClass);
    banner.innerText = msg;

    // flash effect
    container.classList.remove('flash-green', 'flash-red');
    if (good && !bad) container.classList.add('flash-green');
    if (bad && !good) container.classList.add('flash-red');
    setTimeout(() => {
        container.classList.remove('flash-green', 'flash-red');
    }, 400);

    // confetti on big wins
    if (confettiBox && (deltaMoney >= 500 || deltaStocks >= 300)) {
        spawnConfetti(confettiBox, 24);
    }
}

function spawnConfetti(container, count) {
    container.innerHTML = '';
    const colors = ['#2ecc71', '#f1c40f', '#3498db', '#e67e22', '#9b59b6'];
    for (let i = 0; i < count; i++) {
        const piece = document.createElement('div');
        piece.className = 'confetti-piece';
        piece.style.left = Math.random() * 100 + '%';
        piece.style.background = colors[Math.floor(Math.random() * colors.length)];
        piece.style.animationDuration = (1.2 + Math.random() * 0.8) + 's';
        piece.style.transform = `translateY(0) rotate(${Math.random()*180}deg)`;
        container.appendChild(piece);
    }
    // clear after animation
    setTimeout(() => { container.innerHTML = ''; }, 2200);
}

// Retrieve events dynamically based on order and prerequisites
function getAvailableEvents(category, order, prerequisites = {}) {
    let events;
    if (category === "job") {
        events = jobEvents;
    } else if (category === "housing") {
        events = housingEvents;
    } else if (category === "random") {
        events = randomEvents;
    }

    return events.filter(event => {
        // Skip used events
        if (usedEvents[category].has(event.id)) return false;

        // Match order
        if (event.order !== order) return false;

        // Check prerequisites
        if (event.prerequisite && !prerequisites[event.prerequisite]) return false;

        return true;
    });
}

// Trigger an event dynamically
function triggerEvent(category, order, prerequisites = {}) {
    const availableEvents = getAvailableEvents(category, order, prerequisites);
    if (availableEvents.length === 0) return false;

    const randomIndex = Math.floor(Math.random() * availableEvents.length);
    const event = availableEvents[randomIndex];

    // Mark event as used
    usedEvents[category].add(event.id);

    const gameText = document.getElementById("game-text");
    const gameOptions = document.getElementById("game-options");

    const catIcon = category === 'job' ? '💼' : category === 'housing' ? '🏠' : '🎲';
    gameText.innerHTML = `<span class="category-badge">${catIcon} ${category.toUpperCase()} • ${order}</span><br/>${event.description}`;
    gameOptions.innerHTML = "";

    event.options.forEach((option) => {
        const button = document.createElement("button");
        button.className = "btn btn-secondary m-2 option-btn";
        const icon = category === 'job' ? '🧠' : category === 'housing' ? '🧹' : '🃏';
        button.innerHTML = `<span class="option-icon">${icon}</span><span>${option.text}</span>`;
        button.onclick = () => {
            clearActiveTimer();
            showResultFeedback(option.effects);
            const state = applyEffects(option.effects);
            gameState.questionCount = (gameState.questionCount || 0) + 1;
            if (state === 'gameover') return;
            // brief pause to let user read result
            setTimeout(advanceOrEnd, 450);
        };
        gameOptions.appendChild(button);
    });

    // Handle time limit if specified
    if (event.timeLimit > 0) {
        const timerElement = document.createElement("div");
        timerElement.id = "timer";
        const wrapper = document.createElement('div');
        wrapper.className = 'timer-wrapper';
        const bar = document.createElement('div');
        bar.className = 'timer-bar';
        wrapper.appendChild(bar);
        gameOptions.appendChild(timerElement);
        gameOptions.appendChild(wrapper);
        startTimer(event.timeLimit, timerElement, () => {
            // Apply default effects if time runs out
            const timeoutFx = event.timeoutEffect || computeTimeoutEffect(event);
            showResultFeedback(timeoutFx, 'Time ran out! Indecision has a price.');
            const state = applyEffects(timeoutFx);
            gameState.questionCount = (gameState.questionCount || 0) + 1;
            if (state === 'gameover') return;
            setTimeout(advanceOrEnd, 450);
        }, (remaining, total) => {
            // update bar width
            const pct = Math.max(0, Math.min(100, (remaining / total) * 100));
            bar.style.width = pct + '%';
            if (remaining <= 5) timerElement.classList.add('timer-low');
        });

        // show indecision hint
        const hint = document.createElement('div');
        hint.className = 'text-muted mt-2';
        hint.style.fontSize = '0.9rem';
        hint.innerText = event.timeoutEffect
            ? `If you don't choose in time: ${summarizeEffects(event.timeoutEffect)}`
            : 'If you don’t choose in time: worst likely outcome hits.';
        gameOptions.appendChild(hint);
    }

    return true;
}

function computeTimeoutEffect(event) {
    // Derive a sensible "bad" outcome from the options if explicit timeoutEffect not provided
    let minMoney = 0, maxStress = 0, addDebt = 0, stocksDelta = 0;
    (event.options || []).forEach(opt => {
        const fx = opt.effects || {};
        if (typeof fx.money === 'number') minMoney = Math.min(minMoney, fx.money);
        if (typeof fx.stress === 'number') maxStress = Math.max(maxStress, fx.stress);
        if (typeof fx.debt === 'number') addDebt = Math.max(addDebt, fx.debt);
        if (typeof fx.stocksValue === 'number') stocksDelta = Math.min(stocksDelta, fx.stocksValue);
    });
    // Make it slightly worse than the worst option
    return {
        money: minMoney - 50,
        stress: Math.max(maxStress, 5),
        debt: addDebt,
        stocksValue: stocksDelta
    };
}

function summarizeEffects(effects) {
    const parts = [];
    if (typeof effects.money === 'number') parts.push(effects.money >= 0 ? `+$${effects.money}` : `-$${Math.abs(effects.money)}`);
    if (typeof effects.debt === 'number') parts.push(`Debt ${effects.debt >= 0 ? '+'+effects.debt : effects.debt}`);
    if (typeof effects.stocksValue === 'number') parts.push(`Stocks ${effects.stocksValue >= 0 ? '+'+effects.stocksValue : effects.stocksValue}`);
    if (typeof effects.stress === 'number') parts.push(`Stress ${effects.stress >= 0 ? '+'+effects.stress : effects.stress}`);
    return parts.join(' • ');
}

// Apply effects from an event option
function applyEffects(effects) {
    if (!effects) return;
    if (typeof effects.money === 'number') gameState.cash += effects.money;
    if (typeof effects.stress === 'number') gameState.stress = (gameState.stress || 0) + effects.stress;
    if (typeof effects.debt === 'number') gameState.debt = (gameState.debt || 0) + effects.debt;
    if (typeof effects.stocksValue === 'number') {
        gameState.investedInStocks = true;
        gameState.stocksValue = Math.max(0, gameState.stocksValue + effects.stocksValue);
    }
    updateCounters();

    // Basic game-over checks
    if (gameState.cash < 0 && gameState.debt <= 0) {
        // Auto-convert negative cash into debt
        gameState.debt += Math.abs(gameState.cash);
        gameState.cash = 0;
    }
    if (gameState.cash <= 0 && gameState.debt > 5000) {
        showGameOver("Debt spiral! You couldn't keep up with the bills.");
        return 'gameover';
    }
    if ((gameState.stress || 0) >= 100) {
        showGameOver("Burnout! Life isn't just numbers—take care of yourself.");
        return 'gameover';
    }
}

function advanceOrEnd() {
    // Cap progression and determine order to pick next event
    if (gameState.questionCount >= MAX_QUESTIONS) {
        showSuccess("You balanced work, housing, and the markets. Not bad for a newcomer!");
        return;
    }
    renderNextEvent();
}

// Show the game over screen
function showGameOver(message) {
    const gameContainer = document.getElementById("game-container");
    const gameOverScreen = document.getElementById("game-over-screen");
    const gameOverMessage = document.getElementById("game-over-message");

    gameContainer.classList.add("d-none");
    gameOverScreen.classList.remove("d-none");
    gameOverMessage.innerText = message;

    const restartButton = document.getElementById("restart-game");
    restartButton.onclick = () => {
        gameOverScreen.classList.add("d-none");
        resetGameState();
        initializeGame();
    };
}

// Show the success screen
function showSuccess(message) {
    const gameContainer = document.getElementById("game-container");
    const successScreen = document.getElementById("success-screen");
    const successMessage = document.getElementById("success-message");

    gameContainer.classList.add("d-none");
    successScreen.classList.remove("d-none");
    successMessage.innerText = message;

    const restartButton = document.getElementById("restart-success");
    restartButton.onclick = () => {
        successScreen.classList.add("d-none");
        resetGameState();
        initializeGame();
    };
}

// Render the next event dynamically
function renderNextEvent() {
    clearActiveTimer();
    // Determine the order based on the question count
    let order = "early";
    if (gameState.questionCount > 10) {
        order = "mid";
    }
    if (gameState.questionCount > 20) {
        order = "late";
    }

    // Trigger a random event dynamically
    const prerequisites = { invested_in_stocks: gameState.investedInStocks || false };
    if (Math.random() < 0.35 && triggerEvent("random", order, prerequisites)) {
        return;
    }

    // If no random event, fallback to job or housing events
    if (triggerEvent("job", order, prerequisites)) return;
    if (triggerEvent("housing", order, prerequisites)) return;

    // As a fallback, try other orders to keep game moving
    const altOrders = order === 'early' ? ['mid','late'] : order === 'mid' ? ['late','early'] : ['mid','early'];
    for (const alt of altOrders) {
        if (triggerEvent("random", alt, prerequisites)) return;
        if (triggerEvent("job", alt, prerequisites)) return;
        if (triggerEvent("housing", alt, prerequisites)) return;
    }

    // End the game if no events are available
    if (gameState.cash <= 0) {
        showGameOver("You ran out of money and couldn't continue your journey.");
        return;
    }

    showSuccess("You successfully navigated life in Australia and achieved your dreams!");
}

// Start a countdown timer
function startTimer(seconds, timerElement, onTimeout, onTick) {
    let timeLeft = seconds;
    timerElement.innerText = `Time left: ${timeLeft}s`;

    const interval = setInterval(() => {
        timeLeft -= 1;
        timerElement.innerText = `Time left: ${timeLeft}s`;
        if (typeof onTick === 'function') onTick(timeLeft, seconds);

        if (timeLeft <= 0) {
            clearInterval(interval);
            onTimeout();
        }
    }, 1000);

    clearActiveTimer();
    gameState.timer = interval;
}

// Initialize the game
async function initializeGame() {
    await loadEvents();

    const menuContainer = document.getElementById("menu-container");
    const gameContainer = document.getElementById("game-container");
    const startGameButton = document.getElementById("start-game");
    const quitGameButton = document.getElementById("quit-game");

    startGameButton.onclick = () => {
        menuContainer.classList.add("d-none");
        gameContainer.classList.remove("d-none");
        renderNextEvent();
    };

    quitGameButton.onclick = () => {
        gameContainer.classList.add("d-none");
        menuContainer.classList.remove("d-none");
        resetGameState();
    };
}

// Reset the game state
function resetGameState() {
    gameState.cash = 2000;
    gameState.debt = 0;
    gameState.properties = [];
    gameState.timer = null;
    gameState.questionCount = 0;
    gameState.investedInStocks = false;
    gameState.stocksValue = 0;
    usedEvents.job.clear();
    usedEvents.housing.clear();
    usedEvents.random.clear();
    updateCounters();
}

// Start the game
initializeGame();