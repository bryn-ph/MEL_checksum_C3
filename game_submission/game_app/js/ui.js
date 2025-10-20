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

// Show clear messages when minigames start and finish
window.addEventListener('minigame:started', (ev) => {
    try {
        const banner = document.getElementById('event-result');
        if (!banner) return;
        const name = ev.detail?.name || 'minigame';
        banner.classList.remove('d-none', 'result-success', 'result-fail');
        banner.innerText = `Minigame started: ${name} — complete it to improve outcomes.`;
    } catch (e) {}
});

window.addEventListener('minigame:finished', (ev) => {
    try {
        const banner = document.getElementById('event-result');
        if (!banner) return;
        const name = ev.detail?.name || 'minigame';
        const result = ev.detail?.result || {};
        let human = `Minigame finished: ${name}. `;
        if (typeof result.money === 'number') human += `Reward: $${result.money}. `;
        if (typeof result.stress === 'number') human += `Stress ${result.stress >= 0 ? '+'+result.stress : result.stress}. `;
        if (result.meta && result.meta.minigameOutcome) human += `Outcome: ${result.meta.minigameOutcome}. `;
        banner.classList.remove('d-none', 'result-success', 'result-fail');
        banner.innerText = human;
        // small visual cue
        banner.classList.add('result-success');
        setTimeout(() => banner.classList.remove('result-success'), 1600);
    } catch (e) {}
});

// When a minigame result has been confirmed by the player and finalized, provide a clearer message
window.addEventListener('minigame:finalized', (ev) => {
    try {
        const banner = document.getElementById('event-result');
        if (!banner) return;
        const name = ev.detail?.name || 'minigame';
        const result = ev.detail?.result || {};
        let human = `Minigame confirmed: ${name}. `;
        if (typeof result.money === 'number') human += `Reward: $${result.money}. `;
        if (typeof result.stress === 'number') human += `Stress ${result.stress >= 0 ? '+'+result.stress : result.stress}. `;
        banner.classList.remove('d-none', 'result-success', 'result-fail');
        banner.innerText = human;
        banner.classList.add('result-success');
        setTimeout(() => banner.classList.remove('result-success'), 1800);
    } catch (e) {}
});
})();

// ...existing code...

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

// Render statuses in the sidebar
function renderStatuses(list) {
    const wrap = document.getElementById('statuses-list');
    if (!wrap) return;
    if (!list || !list.length) { wrap.innerHTML = '<small class="text-muted">No active statuses</small>'; return; }
    wrap.innerHTML = '';
    list.forEach(s => {
        const row = document.createElement('div'); row.className = 'status-row d-flex justify-content-between align-items-center mb-2';
        const left = document.createElement('div'); left.innerHTML = `<strong>${s.label || s.type}</strong><div class="text-muted small">${s.persistent ? 'Persistent' : (s.remainingRounds ? s.remainingRounds+' rounds' : '')}</div>`;
        const right = document.createElement('div');
        if (s.type === 'job') {
            right.innerHTML = `<div class="text-success">${s.paymentAmount ? '$'+s.paymentAmount + ' / pay' : 'No pay'}</div>`;
        } else if (typeof s.deltaMoney === 'number') {
            right.innerText = (s.deltaMoney >=0 ? '+$'+s.deltaMoney : '-$'+Math.abs(s.deltaMoney));
        } else {
            right.innerHTML = `<small class="text-muted">${s.note || ''}</small>`;
        }
        row.appendChild(left); row.appendChild(right);
        wrap.appendChild(row);
    });
}

// initial hook
try { window.addEventListener('statuses:changed', ev => { renderStatuses(ev.detail); }); } catch (e) {}

function bindQuitJobButton() {
    const quitJobBtn = document.getElementById('clear-job');
    if (!quitJobBtn) return;
    quitJobBtn.onclick = () => {
        try { if (window.gameState && typeof window.gameState.removeStatusById === 'function') window.gameState.removeStatusById('job'); } catch (e) {}
        try { if (window.gameState && typeof window.gameState.setCurrentJob === 'function') window.gameState.setCurrentJob(null); } catch (e) {}
    };
}

document.addEventListener('DOMContentLoaded', () => bindQuitJobButton());
try { window.addEventListener('statuses:changed', () => bindQuitJobButton()); } catch (e) {}

function showGameOver(message) {
    const gameContainer = document.getElementById("game-container");
    const gameOverScreen = document.getElementById("game-over-screen");
    const gameOverMessage = document.getElementById("game-over-message");
    gameContainer.classList.add("d-none");
    gameOverScreen.classList.remove("d-none");
    gameOverMessage.innerText = message;
    // populate education panel
    try {
        const panel = document.getElementById('education-panel');
        const content = document.getElementById('edu-content');
        if (panel && content) {
            panel.classList.remove('d-none');
            content.innerHTML = generateEducation(false);
        }
    } catch (e) {}
    const restartButton = document.getElementById("restart-game");
    restartButton.onclick = () => {
        // Hide game over screen, reset state, and show main menu
        gameOverScreen.classList.add("d-none");
        try { resetGameState(); } catch (e) {}
        try { document.getElementById('game-container').classList.add('d-none'); } catch (e) {}
        try { document.getElementById('menu-container').classList.remove('d-none'); } catch (e) {}
    };
}

function showSuccess(message) {
    const gameContainer = document.getElementById("game-container");
    const successScreen = document.getElementById("success-screen");
    const successMessage = document.getElementById("success-message");
    gameContainer.classList.add("d-none");
    successScreen.classList.remove("d-none");
    successMessage.innerText = message;
    // populate education panel
    try {
        const panel = document.getElementById('education-panel-success');
        const content = document.getElementById('edu-content-success');
        if (panel && content) {
            panel.classList.remove('d-none');
            content.innerHTML = generateEducation(true);
        }
    } catch (e) {}
    const restartButton = document.getElementById("restart-success");
    restartButton.onclick = () => {
        // Hide success screen, reset state, and return to menu
        successScreen.classList.add("d-none");
        try { resetGameState(); } catch (e) {}
        try { document.getElementById('game-container').classList.add('d-none'); } catch (e) {}
        try { document.getElementById('menu-container').classList.remove('d-none'); } catch (e) {}
    };
}

// Produce a short educational summary based on player state at game end
function generateEducation(won) {
    const parts = [];
    // evaluate money
    if (gameState.cash >= 1000) parts.push('You finished with healthy cash reserve — keep building an emergency fund of 3–6 months expenses.');
    else if (gameState.cash > 0) parts.push('Your cash balance was low — try saving small regular amounts to avoid short-term shocks.');
    else parts.push('You ran out of cash — building an emergency buffer and tracking monthly expenses helps avoid this.');

    // jobs
    const job = (window.gameState && typeof window.gameState.getCurrentJob === 'function') ? window.gameState.getCurrentJob() : gameState.currentJob;
    if (job) parts.push(`Your job: ${job.title || job.name || 'Work'} — think about stability vs pay. Consider upskilling for higher-paying, lower-stress roles.`);

    // statuses
    if (gameState.statuses && gameState.statuses.length) {
        const s = gameState.statuses.map(x => x.label || x.type).slice(0,3).join(', ');
        parts.push(`You had active statuses affecting you: ${s}. Addressing root causes (health, housing, or unexpected bills) can reduce stress over time.`);
    }

    // stress
    if (gameState.stress >= 40) parts.push('Your stress went high during play. Real-life tips: schedule small breaks, reduce debt, and seek support when needed.');
    else parts.push('Stress stayed moderate — that’s a good sign. Keep balancing work and rest.');

    // return formatted HTML
    return '<ul>' + parts.map(p => `<li>${p}</li>`).join('') + '</ul>';
}
