function updateCounters() {
    const moneyCounter = document.getElementById("money-counter");
    const stressCounter = document.getElementById("stress-counter");
    const debtCounter = document.getElementById("debt-counter");
    const progressEl = document.getElementById("progress-counter");
    const progressBar = document.getElementById("progress-bar");
    const stocksCounter = document.getElementById("stocks-counter");

    if (moneyCounter) moneyCounter.innerText = `💰 Money: $${gameState.cash}`;
    if (stressCounter) stressCounter.innerText = `😰 Stress: ${gameState.stress || 0}`;

    if (debtCounter) {
        if (gameState.debt > 0) {
            debtCounter.classList.remove("d-none");
            debtCounter.innerText = `💳 Debt: $${gameState.debt}`;
        } else {
            debtCounter.classList.add("d-none");
        }
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

    container.classList.remove('flash-green', 'flash-red');
    if (good && !bad) container.classList.add('flash-green');
    if (bad && !good) container.classList.add('flash-red');
    setTimeout(() => container.classList.remove('flash-green', 'flash-red'), 400);

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
    setTimeout(() => { container.innerHTML = ''; }, 2200);
}

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
