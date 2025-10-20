function computeTimeoutEffect(event) {
    let minMoney = 0, maxStress = 0, addDebt = 0, stocksDelta = 0;
    (event.options || []).forEach(opt => {
        const fx = opt.effects || {};
        if (typeof fx.money === 'number') minMoney = Math.min(minMoney, fx.money);
        if (typeof fx.stress === 'number') maxStress = Math.max(maxStress, fx.stress);
        if (typeof fx.debt === 'number') addDebt = Math.max(addDebt, fx.debt);
        if (typeof fx.stocksValue === 'number') stocksDelta = Math.min(stocksDelta, fx.stocksValue);
    });
    return { money: minMoney - 50, stress: Math.max(maxStress, 5), debt: addDebt, stocksValue: stocksDelta };
}

function computeDisplayEffects(effects, category) {
    const out = { ...(effects || {}) };
    if (category === 'housing' && typeof out.money === 'number' && out.money < 0) {
        const mult = gameState.housingCostMultiplier || 1;
        if (mult && mult !== 1) out.money = Math.round(out.money * mult);
    }
    if (out.meta && out.meta.includeArrears) {
        const owed = gameState.rentArrears || 0;
        if (owed > 0) out.money = (out.money || 0) - owed;
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

function applyEffects(effects, category) {
    if (!effects) return;
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
    if (typeof effects.stocksValue === 'number') { gameState.investedInStocks = true; gameState.stocksValue = Math.max(0, gameState.stocksValue + effects.stocksValue); }
    if (effects.meta) {
        const m = effects.meta;
        if (typeof m.increaseHousingCosts === 'number') gameState.housingCostMultiplier = Math.min(3, (gameState.housingCostMultiplier || 1) + m.increaseHousingCosts);
        if (typeof m.reduceHousingMultiplier === 'number') gameState.housingCostMultiplier = Math.max(1, (gameState.housingCostMultiplier || 1) - m.reduceHousingMultiplier);
        if (typeof m.addArrearsAmount === 'number') gameState.rentArrears += Math.max(0, m.addArrearsAmount);
        if (m.includeArrears) { const owed = gameState.rentArrears || 0; if (owed > 0) { gameState.cash -= owed; gameState.rentArrears = 0; } }
        if (typeof m.reduceArrearsBy === 'number' && m.reduceArrearsBy > 0) gameState.rentArrears = Math.max(0, (gameState.rentArrears || 0) - m.reduceArrearsBy);
    }
    updateCounters();
    if (gameState.cash < 0 && gameState.debt <= 0) { gameState.debt += Math.abs(gameState.cash); gameState.cash = 0; }
    if (gameState.cash <= 0 && gameState.debt > 5000) { showGameOver("Debt spiral! You couldn't keep up with the bills."); return 'gameover'; }
    if ((gameState.stress || 0) >= 100) { showGameOver("Burnout! Life isn't just numbers—take care of yourself."); return 'gameover'; }
}

function startTimer(seconds, timerElement, onTimeout, onTick) {
    let timeLeft = seconds;
    timerElement.innerText = `Time left: ${timeLeft}s`;
    const interval = setInterval(() => {
        timeLeft -= 1;
        timerElement.innerText = `Time left: ${timeLeft}s`;
        if (typeof onTick === 'function') onTick(timeLeft, seconds);
        if (timeLeft <= 0) { clearInterval(interval); onTimeout(); }
    }, 1000);
    clearActiveTimer();
    gameState.timer = interval;
}

function triggerEvent(category, order, prerequisites = {}) {
    const availableEvents = getAvailableEvents(category, order, prerequisites);
    if (availableEvents.length === 0) return false;
    const randomIndex = Math.floor(Math.random() * availableEvents.length);
    const event = availableEvents[randomIndex];
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
                setTimeout(advanceOrEnd, 450);
            }
        };
        gameOptions.appendChild(button);
    });
    if (event.timeLimit > 0) {
        const timerElement = document.createElement("div"); timerElement.id = "timer";
        const wrapper = document.createElement('div'); wrapper.className = 'timer-wrapper';
        const bar = document.createElement('div'); bar.className = 'timer-bar'; wrapper.appendChild(bar);
        gameOptions.appendChild(timerElement); gameOptions.appendChild(wrapper);
        startTimer(event.timeLimit, timerElement, () => {
            const timeoutRaw = event.timeoutEffect || computeTimeoutEffect(event);
            const timeoutFx = computeDisplayEffects(timeoutRaw, category);
            showResultFeedback(timeoutFx, 'Time ran out! Indecision has a price.');
            const state = applyEffects(timeoutRaw, category);
            gameState.questionCount = (gameState.questionCount || 0) + 1;
            if (state === 'gameover') return; setTimeout(advanceOrEnd, 450);
        }, (remaining, total) => {
            const pct = Math.max(0, Math.min(100, (remaining / total) * 100));
            bar.style.width = pct + '%';
            if (remaining <= 5) timerElement.classList.add('timer-low');
        });
        const hint = document.createElement('div'); hint.className = 'text-muted mt-2'; hint.style.fontSize = '0.9rem';
        hint.innerText = event.timeoutEffect ? `If you don't choose in time: ${summarizeEffects(event.timeoutEffect)}` : 'If you don’t choose in time: worst likely outcome hits.';
        gameOptions.appendChild(hint);
    }
    return true;
}

function advanceOrEnd() {
    if (gameState.questionCount >= MAX_QUESTIONS) { showSuccess("You balanced work, housing, and the markets. Not bad for a newcomer!"); return; }
    renderNextEvent();
}

function renderNextEvent() {
    clearActiveTimer();
    let order = "early";
    if (gameState.questionCount > 10) order = "mid";
    if (gameState.questionCount > 20) order = "late";
    const prerequisites = { invested_in_stocks: gameState.investedInStocks || false };
    if (Math.random() < 0.35 && triggerEvent("random", order, prerequisites)) return;
    if (triggerEvent("job", order, prerequisites)) return;
    if (triggerEvent("housing", order, prerequisites)) return;
    const altOrders = order === 'early' ? ['mid','late'] : order === 'mid' ? ['late','early'] : ['mid','early'];
    for (const alt of altOrders) { if (triggerEvent("random", alt, prerequisites)) return; if (triggerEvent("job", alt, prerequisites)) return; if (triggerEvent("housing", alt, prerequisites)) return; }
    if (gameState.cash <= 0) { showGameOver("You ran out of money and couldn't continue your journey."); return; }
    showSuccess("You successfully navigated life in Australia and achieved your dreams!");
}
