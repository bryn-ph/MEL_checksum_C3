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
    // Housing penalties
    rentArrears: 0,
    housingCostMultiplier: 1,
    // UX
    sfxEnabled: true,
    achievements: new Set(),
};

// Note: All content is data-driven from data/*.json. No static scenes.

// Load JSON data
let jobEvents = [];
let housingEvents = [];
let randomEvents = [];

async function loadEvents() {
        try {
                const jobResponse = await fetch("data/job_events.json");
                jobEvents = await jobResponse.json();

                const housingResponse = await fetch("data/housing_events.json");
                housingEvents = await housingResponse.json();

                const randomResponse = await fetch("data/random_events.json");
                randomEvents = await randomResponse.json();
        } catch (e) {
                // Fallback demo events so app still works when running from file://
                jobEvents = [
                        { id: 7, category: 'job', order: 'mid', description: 'Technical interview coding test this weekend.', timeLimit: 12,
                            options: [
                                { text: 'Practice challenge', effects: { money: 0, stress: 0, meta: { minigame: 'typing-challenge', minigameConfig: { seconds: 8, reward: 250 } } } },
                                { text: 'Wing it', effects: { money: 0, stress: 2, meta: { minigame: 'typing-challenge', minigameConfig: { seconds: 6, reward: 150 } } } }
                            ] },
                        { id: 21, category: 'job', order: 'mid', description: 'Work sprint! Pick up extra tasks to earn bonuses.', timeLimit: 10,
                            options: [
                                { text: 'Do the sprint (mini-game)', effects: { stress: 2, meta: { minigame: 'coin-rush', minigameConfig: { seconds: 10, coinValue: 25, spawnMs: 450 } } } },
                                { text: 'Skip', effects: { money: 0, stress: -1 } }
                            ] }
                ];
                housingEvents = [
                        { id: 24, category: 'housing', order: 'mid', description: 'Bills piling up—dodge fees to clear arrears!', timeLimit: 10,
                            options: [
                                { text: 'Play Bill Dodge', effects: { stress: 1, meta: { minigame: 'whack-a-fee', minigameConfig: { seconds: 10, reducePerHit: 120, spawnMs: 550 } } } },
                                { text: 'Ignore it', effects: { money: 0, stress: 2 } }
                            ] }
                ];
                randomEvents = [
                        { id: 1, category: 'random', order: 'early', description: 'Unexpected opal card credit found!', timeLimit: 8,
                            options: [ { text: 'Tap on happily', effects: { money: 30, stress: -1 } }, { text: 'Donate it', effects: { money: 0, stress: -2 } } ] }
                ];
                const toast = document.getElementById('menu-toast');
                if (toast) {
                        toast.classList.remove('d-none', 'result-fail');
                        toast.classList.add('result-success');
                        toast.innerText = 'Loaded demo events. For full data, run via a local server.';
                }
        }
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
        awardAchievement('Big Earner');
        playSfx('win');
    }
    if (bad && !good) playSfx('lose');
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
        button.innerHTML = `<span class=\"option-icon\">${icon}</span><span>${option.text}</span>`;
        button.onclick = () => {
            clearActiveTimer();
            // If this option triggers a minigame, run it first; then apply base effects + reward
            const meta = option.effects?.meta;
            if (meta && meta.minigame) {
                runMinigame(meta.minigame, meta.minigameConfig || {}).then(rewardEffects => {
                    const merged = mergeEffects(option.effects, rewardEffects);
                    const displayFx = computeDisplayEffects(merged, category);
                    showResultFeedback(displayFx);
                    const state = applyEffects(merged, category);
                    gameState.questionCount = (gameState.questionCount || 0) + 1;
                    if (state === 'gameover') return;
                    setTimeout(advanceOrEnd, 450);
                }).catch(() => {
                    // If minigame fails to run, just apply base effects
                    const displayFx = computeDisplayEffects(option.effects, category);
                    showResultFeedback(displayFx);
                    const state = applyEffects(option.effects, category);
                    gameState.questionCount = (gameState.questionCount || 0) + 1;
                    if (state === 'gameover') return;
                    setTimeout(advanceOrEnd, 450);
                });
            } else {
                const displayFx = computeDisplayEffects(option.effects, category);
                showResultFeedback(displayFx);
                const state = applyEffects(option.effects, category);
                gameState.questionCount = (gameState.questionCount || 0) + 1;
                if (state === 'gameover') return;
                // brief pause to let user read result
                setTimeout(advanceOrEnd, 450);
            }
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
            const timeoutRaw = event.timeoutEffect || computeTimeoutEffect(event);
            const timeoutFx = computeDisplayEffects(timeoutRaw, category);
            showResultFeedback(timeoutFx, 'Time ran out! Indecision has a price.');
            const state = applyEffects(timeoutRaw, category);
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

function computeDisplayEffects(effects, category) {
    const out = { ...(effects || {}) };
    // Apply housing cost multiplier to money-only negative costs
    if (category === 'housing' && typeof out.money === 'number' && out.money < 0) {
        const mult = gameState.housingCostMultiplier || 1;
        if (mult && mult !== 1) {
            out.money = Math.round(out.money * mult);
        }
    }
    // If this option includes paying arrears, add it to displayed money
    if (out.meta && out.meta.includeArrears) {
        const owed = gameState.rentArrears || 0;
        if (owed > 0) {
            out.money = (out.money || 0) - owed;
        }
    }
    return out;
}

function summarizeEffects(effects) {
    const parts = [];
    if (typeof effects.money === 'number') parts.push(effects.money >= 0 ? `+$${effects.money}` : `-$${Math.abs(effects.money)}`);
    if (typeof effects.debt === 'number') parts.push(`Debt ${effects.debt >= 0 ? '+'+effects.debt : effects.debt}`);
    if (typeof effects.stocksValue === 'number') parts.push(`Stocks ${effects.stocksValue >= 0 ? '+'+effects.stocksValue : effects.stocksValue}`);
    if (typeof effects.stress === 'number') parts.push(`Stress ${effects.stress >= 0 ? '+'+effects.stress : effects.stress}`);
    return parts.join(' • ');
}

function mergeEffects(base = {}, bonus = {}) {
    const out = JSON.parse(JSON.stringify(base));
    const numFields = ['money','stress','debt','stocksValue'];
    for (const f of numFields) {
        if (typeof bonus[f] === 'number') {
            out[f] = (out[f] || 0) + bonus[f];
        }
    }
    // Merge meta shallowly
    if (bonus.meta) {
        out.meta = { ...(out.meta || {}), ...bonus.meta };
    }
    return out;
}

// Minigame runner: displays overlay and resolves with reward effects
function runMinigame(name, config = {}) {
    return new Promise((resolve, reject) => {
        const overlay = document.getElementById('minigame-overlay');
        const root = document.getElementById('minigame-root');
        if (!overlay || !root) {
            reject(new Error('No minigame overlay'));
            return;
        }
        overlay.classList.remove('d-none');
        root.innerHTML = '';

        const closeWith = (effects) => {
            overlay.classList.add('d-none');
            root.innerHTML = '';
            resolve(effects || {});
        };

        const cancel = () => {
            overlay.classList.add('d-none');
            root.innerHTML = '';
            reject(new Error('minigame-cancelled'));
        };

        if (name === 'coin-rush') {
            runCoinRush(root, config).then(closeWith).catch(() => cancel());
        } else if (name === 'whack-a-fee') {
            runWhackAFee(root, config).then(closeWith).catch(() => cancel());
        } else if (name === 'typing-challenge') {
            runTypingChallenge(root, config).then(closeWith).catch(() => cancel());
        } else {
            // Unknown minigame -> close with no bonus
            closeWith({});
        }
    });
}

// Coin Rush: click coins in an area within a short timer to earn cash
function runCoinRush(root, config = {}) {
    return new Promise((resolve) => {
        const seconds = Math.max(5, Math.min(20, Number(config.seconds) || 10));
        const coinValue = Math.max(5, Math.min(200, Number(config.coinValue) || 25));
        const spawnInterval = Math.max(200, Number(config.spawnMs) || 500);
        const maxCoins = Math.max(10, Number(config.maxCoins) || 40);

        const header = document.createElement('div');
        header.className = 'minigame-header';
        const title = document.createElement('div');
        title.innerHTML = '💼 Work Sprint: Coin Rush';
        const meta = document.createElement('div');
        meta.innerHTML = `<strong>Time:</strong> <span id="mg-timer">${seconds}</span>s · <strong>Score:</strong> $<span id="mg-score">0</span>`;
        header.appendChild(title); header.appendChild(meta);

        const area = document.createElement('div');
        area.className = 'minigame-area';

        const footer = document.createElement('div');
        footer.className = 'd-flex justify-content-end mt-2';
        const quitBtn = document.createElement('button');
        quitBtn.className = 'btn btn-outline-secondary btn-sm';
        quitBtn.innerText = 'Quit';
        footer.appendChild(quitBtn);

        root.appendChild(header);
        root.appendChild(area);
        root.appendChild(footer);

        let score = 0;
        let timeLeft = seconds;
        let coinsSpawned = 0;
        const timerEl = header.querySelector('#mg-timer');
        const scoreEl = header.querySelector('#mg-score');

        function spawnCoin() {
            if (coinsSpawned >= maxCoins) return;
            const coin = document.createElement('div');
            coin.className = 'coin';
            coin.textContent = '$';
            const rect = area.getBoundingClientRect();
            const size = 28;
            const x = Math.random() * (rect.width - size);
            const y = Math.random() * (rect.height - size);
            coin.style.left = x + 'px';
            coin.style.top = y + 'px';
            coin.onclick = () => {
                score += coinValue;
                scoreEl.textContent = String(score);
                coin.classList.add('pop');
                setTimeout(() => area.contains(coin) && area.removeChild(coin), 180);
            };
            area.appendChild(coin);
            coinsSpawned++;
        }

        const spawner = setInterval(spawnCoin, spawnInterval);
        const timer = setInterval(() => {
            timeLeft -= 1;
            if (timerEl) timerEl.textContent = String(timeLeft);
            if (timeLeft <= 0) {
                clearInterval(spawner);
                clearInterval(timer);
                // Cleanup remaining coins
                Array.from(area.querySelectorAll('.coin')).forEach(c => c.remove());
                if (score >= 500) awardAchievement('Overtime Hero');
                resolve({ money: score, stress: -1 });
            }
        }, 1000);

        quitBtn.onclick = () => {
            clearInterval(spawner);
            clearInterval(timer);
            resolve({ money: Math.floor(score * 0.5), stress: 0 });
        };
    });
}

// Whack-a-Fee: housing themed, click fees quickly to reduce arrears and avoid penalties
function runWhackAFee(root, config = {}) {
    return new Promise((resolve) => {
        const seconds = Math.max(6, Math.min(20, Number(config.seconds) || 10));
        const maxSpawn = Math.max(8, Number(config.maxFees) || 16);
        const reducePerHit = Math.max(50, Number(config.reducePerHit) || 100);

        const header = document.createElement('div');
        header.className = 'minigame-header';
        header.innerHTML = `<div>🏠 Bill Dodge</div><div><strong>Time:</strong> <span id="mg2-timer">${seconds}</span>s · <strong>Arrears cleared:</strong> $<span id="mg2-cleared">0</span></div>`;
        const area = document.createElement('div');
        area.className = 'minigame-area';
        const footer = document.createElement('div');
        footer.className = 'd-flex justify-content-end mt-2';
        const quitBtn = document.createElement('button');
        quitBtn.className = 'btn btn-outline-secondary btn-sm';
        quitBtn.innerText = 'Quit';

        root.appendChild(header); root.appendChild(area); root.appendChild(footer);
        footer.appendChild(quitBtn);

        let timeLeft = seconds;
        let spawned = 0;
        let cleared = 0;
        const timerEl = header.querySelector('#mg2-timer');
        const clearedEl = header.querySelector('#mg2-cleared');

        function spawnFee() {
            if (spawned >= maxSpawn) return;
            const fee = document.createElement('div');
            fee.className = 'fee';
            fee.innerHTML = `<div>Fee<br/><small>-$${reducePerHit}</small></div>`;
            const rect = area.getBoundingClientRect();
            const w = 70, h = 50;
            fee.style.left = Math.random() * (rect.width - w) + 'px';
            fee.style.top = Math.random() * (rect.height - h) + 'px';
            fee.onclick = () => {
                if (!fee.classList.contains('hit')) {
                    fee.classList.add('hit');
                    cleared += reducePerHit;
                    if (clearedEl) clearedEl.textContent = String(cleared);
                    playSfx('hit');
                    setTimeout(() => area.contains(fee) && area.removeChild(fee), 90);
                }
            };
            area.appendChild(fee);
            spawned++;
        }

        const spawner = setInterval(spawnFee, Math.max(300, Number(config.spawnMs) || 600));
        const timer = setInterval(() => {
            timeLeft -= 1;
            if (timerEl) timerEl.textContent = String(timeLeft);
            if (timeLeft <= 0) {
                clearInterval(spawner);
                clearInterval(timer);
                // return effect: reduce arrears and stress a bit
                if (cleared >= 800) awardAchievement('Bill Ninja');
                resolve({ meta: { reduceArrearsBy: cleared }, stress: -2 });
            }
        }, 1000);

        quitBtn.onclick = () => {
            clearInterval(spawner); clearInterval(timer);
            resolve({ meta: { reduceArrearsBy: Math.floor(cleared * 0.5) }, stress: 0 });
        };
    });
}

// Typing challenge: type the given word in time to earn a bonus
function runTypingChallenge(root, config = {}) {
    return new Promise((resolve) => {
        const seconds = Math.max(5, Math.min(20, Number(config.seconds) || 8));
        const words = Array.isArray(config.words) && config.words.length ? config.words : ['variable','function','closure','promise','adapter','iterator','factory','compose'];
        const reward = Math.max(50, Number(config.reward) || 200);

        const target = words[Math.floor(Math.random() * words.length)];
        const header = document.createElement('div');
        header.className = 'minigame-header';
        header.innerHTML = `<div>⌨️ Coding Test</div><div><strong>Time:</strong> <span id="mg3-timer">${seconds}</span>s</div>`;

        const wrap = document.createElement('div');
        wrap.className = 'typing-wrap';
        const prompt = document.createElement('div');
        prompt.innerHTML = `Type this: <span class="typing-word">${target}</span>`;
        const input = document.createElement('input');
        input.className = 'typing-input';
        input.setAttribute('placeholder', 'Start typing...');
        input.setAttribute('autocomplete', 'off');
        wrap.appendChild(prompt);
        wrap.appendChild(input);

        const footer = document.createElement('div');
        footer.className = 'd-flex justify-content-end mt-2';
        const giveUp = document.createElement('button');
        giveUp.className = 'btn btn-outline-secondary btn-sm';
        giveUp.innerText = 'Give up';
        footer.appendChild(giveUp);

        root.appendChild(header);
        root.appendChild(wrap);
        root.appendChild(footer);

        let timeLeft = seconds;
        const timerEl = header.querySelector('#mg3-timer');
        const timer = setInterval(() => {
            timeLeft -= 1;
            if (timerEl) timerEl.textContent = String(timeLeft);
            if (timeLeft <= 0) {
                clearInterval(timer);
                resolve({ money: 0, stress: 2 });
            }
        }, 1000);

        input.focus();
        input.addEventListener('input', () => {
            if (input.value.trim() === target) {
                clearInterval(timer);
                awardAchievement('Typist');
                resolve({ money: reward, stress: -2 });
            }
        });

        giveUp.onclick = () => {
            clearInterval(timer);
            resolve({ money: 0, stress: 0 });
        };
    });
}

// Simple SFX system (no external assets)
function playSfx(kind) {
    try {
        if (!gameState.sfxEnabled) return;
        let freq = 440, duration = 100;
        if (kind === 'win') { freq = 880; duration = 160; }
        if (kind === 'lose') { freq = 220; duration = 200; }
        if (kind === 'hit') { freq = 660; duration = 100; }
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;
        osc.connect(gain); gain.connect(ctx.destination);
        gain.gain.setValueAtTime(0.0001, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + 0.02);
        osc.start();
        setTimeout(() => { osc.stop(); ctx.close(); }, duration);
    } catch {}
}

function awardAchievement(name) {
    if (!name || gameState.achievements.has(name)) return;
    gameState.achievements.add(name);
    const wrap = document.getElementById('achievements');
    if (!wrap) return;
    const badge = document.createElement('span');
    badge.className = 'badge-ach';
    badge.textContent = `🏅 ${name}`;
    wrap.appendChild(badge);
}

// Apply effects from an event option
function applyEffects(effects, category) {
    if (!effects) return;
    // Adjust money with housing multiplier if applicable
    if (typeof effects.money === 'number') {
        let moneyDelta = effects.money;
        if (category === 'housing' && moneyDelta < 0) {
            const mult = gameState.housingCostMultiplier || 1;
            moneyDelta = Math.round(moneyDelta * mult);
        }
        gameState.cash += moneyDelta;
    }
    if (typeof effects.stress === 'number') gameState.stress = (gameState.stress || 0) + effects.stress;
    if (typeof effects.debt === 'number') gameState.debt = (gameState.debt || 0) + effects.debt;
    if (typeof effects.stocksValue === 'number') {
        gameState.investedInStocks = true;
        gameState.stocksValue = Math.max(0, gameState.stocksValue + effects.stocksValue);
    }
    // Meta side-effects for rent flow and housing costs
    if (effects.meta) {
        const m = effects.meta;
        if (typeof m.increaseHousingCosts === 'number') {
            gameState.housingCostMultiplier = Math.min(3, (gameState.housingCostMultiplier || 1) + m.increaseHousingCosts);
        }
        if (typeof m.reduceHousingMultiplier === 'number') {
            gameState.housingCostMultiplier = Math.max(1, (gameState.housingCostMultiplier || 1) - m.reduceHousingMultiplier);
        }
        if (typeof m.addArrearsAmount === 'number') {
            gameState.rentArrears += Math.max(0, m.addArrearsAmount);
        }
        if (m.includeArrears) {
            const owed = gameState.rentArrears || 0;
            if (owed > 0) {
                gameState.cash -= owed;
                gameState.rentArrears = 0;
            }
        }
        if (typeof m.reduceArrearsBy === 'number' && m.reduceArrearsBy > 0) {
            gameState.rentArrears = Math.max(0, (gameState.rentArrears || 0) - m.reduceArrearsBy);
        }
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
    // Bind UI first so minigame playground works even if data fails to load
    const menuContainer = document.getElementById("menu-container");
    const gameContainer = document.getElementById("game-container");
    const startGameButton = document.getElementById("start-game");
    const quitGameButton = document.getElementById("quit-game");
    const sfxToggle = document.getElementById("sfx-toggle");
    const playCoin = document.getElementById('play-coinrush');
    const playFee = document.getElementById('play-billdodge');
    const playTyping = document.getElementById('play-typing');
    const menuToast = document.getElementById('menu-toast');

    function showMenuToast(msg, good = true) {
        if (!menuToast) return;
        menuToast.classList.remove('d-none', 'result-success', 'result-fail');
        menuToast.classList.add(good ? 'result-success' : 'result-fail');
        menuToast.innerText = msg;
    }

    if (startGameButton) startGameButton.onclick = () => {
        menuContainer.classList.add("d-none");
        gameContainer.classList.remove("d-none");
        renderNextEvent();
    };

    if (quitGameButton) quitGameButton.onclick = () => {
        gameContainer.classList.add("d-none");
        menuContainer.classList.remove("d-none");
        resetGameState();
    };

    if (sfxToggle) {
        sfxToggle.onclick = () => {
            gameState.sfxEnabled = !gameState.sfxEnabled;
            sfxToggle.textContent = gameState.sfxEnabled ? '🔊 SFX: On' : '🔇 SFX: Off';
        };
    }

    if (playCoin) playCoin.onclick = () => {
        runMinigame('coin-rush', { seconds: 10, coinValue: 25, spawnMs: 450 }).then(eff => {
            showMenuToast(`Coin Rush: You earned $${eff.money || 0}.`, true);
        }).catch(() => showMenuToast('Minigame cancelled.', false));
    };
    if (playFee) playFee.onclick = () => {
        runMinigame('whack-a-fee', { seconds: 10, reducePerHit: 120, spawnMs: 550 }).then(eff => {
            const amt = eff?.meta?.reduceArrearsBy || 0;
            showMenuToast(`Bill Dodge: Cleared $${amt} in fees.`, true);
        }).catch(() => showMenuToast('Minigame cancelled.', false));
    };
    if (playTyping) playTyping.onclick = () => {
        runMinigame('typing-challenge', { seconds: 8, reward: 250 }).then(eff => {
            showMenuToast(`Typing Challenge: Reward $${eff.money || 0}.`, true);
        }).catch(() => showMenuToast('Minigame cancelled.', false));
    };

    // Now load events asynchronously (don’t block UI)
    loadEvents();
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
    gameState.rentArrears = 0;
    gameState.housingCostMultiplier = 1;
    usedEvents.job.clear();
    usedEvents.housing.clear();
    usedEvents.random.clear();
    updateCounters();
}

// Start the game
initializeGame();