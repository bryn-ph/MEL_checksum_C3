function mergeEffects(base = {}, bonus = {}) {
    const out = JSON.parse(JSON.stringify(base));
    const numFields = ['money','stress','debt','stocksValue'];
    for (const f of numFields) {
        if (typeof bonus[f] === 'number') {
            out[f] = (out[f] || 0) + bonus[f];
        }
    }
    if (bonus.meta) out.meta = { ...(out.meta || {}), ...bonus.meta };
    return out;
}

function runMinigame(name, config = {}) {
    return new Promise((resolve, reject) => {
        const overlay = document.getElementById('minigame-overlay');
        const root = document.getElementById('minigame-root');
        if (!overlay || !root) { reject(new Error('No minigame overlay')); return; }
        overlay.classList.remove('d-none');
        root.innerHTML = '';

        // notify UI that a minigame started
        try { window.dispatchEvent(new CustomEvent('minigame:started', { detail: { name, config } })); } catch (e) {}

        const cleanup = () => { overlay.classList.add('d-none'); root.innerHTML = ''; };

        // show outcome confirmation UI: wait for user to accept before resolving
        function presentOutcome(result) {
            return new Promise((ok, nope) => {
                // small outcome card appended to the root
                const out = document.createElement('div'); out.className = 'mg-outcome card p-3';
                const title = document.createElement('div'); title.className = 'mb-2';
                title.innerHTML = `<strong>Minigame Result</strong> — ${name}`;
                const body = document.createElement('div'); body.className = 'mb-2';
                const parts = [];
                if (typeof result.money === 'number') parts.push(`${result.money >= 0 ? '💰 +$' + result.money : '💸 -$' + Math.abs(result.money)}`);
                if (typeof result.stress === 'number') parts.push(`${result.stress >= 0 ? '😰 +' + result.stress : '🧘 ' + result.stress}`);
                if (result.meta && result.meta.minigameOutcome) parts.push(`Outcome: ${result.meta.minigameOutcome}`);
                body.innerText = parts.length ? parts.join(' • ') : 'No tangible rewards.';

                const actions = document.createElement('div'); actions.className = 'd-flex justify-content-end gap-2';
                const cancelBtn = document.createElement('button'); cancelBtn.className = 'btn btn-outline-secondary btn-sm'; cancelBtn.textContent = 'Decline';
                const acceptBtn = document.createElement('button'); acceptBtn.className = 'btn btn-primary btn-sm'; acceptBtn.textContent = 'Confirm outcome';
                actions.appendChild(cancelBtn); actions.appendChild(acceptBtn);

                out.appendChild(title); out.appendChild(body); out.appendChild(actions);
                root.appendChild(out);

                // handlers
                acceptBtn.onclick = () => {
                    try { window.dispatchEvent(new CustomEvent('minigame:finalized', { detail: { name, result } })); } catch (e) {}
                    cleanup(); ok(result);
                };
                cancelBtn.onclick = () => { cleanup(); nope(new Error('minigame-declined')); };
            });
        }

        const onDone = (res, resolvePromise, rejectPromise) => {
            try { window.dispatchEvent(new CustomEvent('minigame:finished', { detail: { name, result: res } })); } catch (e) {}
            // show final outcome and wait for player confirmation before resolving
            presentOutcome(res).then(finalRes => { if (typeof resolvePromise === 'function') resolvePromise(finalRes); }).catch(err => { if (typeof rejectPromise === 'function') rejectPromise(err); });
        };

        const onError = (err, rejectPromise) => { cleanup(); if (typeof rejectPromise === 'function') rejectPromise(err || new Error('minigame-cancelled')); };

        if (name === 'coin-rush') runCoinRush(root, config).then(res => onDone(res, resolve, reject)).catch(err => onError(err, reject));
        else if (name === 'whack-a-fee') runWhackAFee(root, config).then(res => onDone(res, resolve, reject)).catch(err => onError(err, reject));
        else if (name === 'typing-challenge') runTypingChallenge(root, config).then(res => onDone(res, resolve, reject)).catch(err => onError(err, reject));
        else if (name === 'reaction-click') runReactionClick(root, config).then(res => onDone(res, resolve, reject)).catch(err => onError(err, reject));
        else if (name === 'quick-math') runQuickMath(root, config).then(res => onDone(res, resolve, reject)).catch(err => onError(err, reject));
        else { cleanup(); resolve({}); }
    });
}

function runCoinRush(root, config = {}) {
    return new Promise((resolve) => {
    // harder: less time, smaller coin value, fewer spawns so it's tougher to get big payouts
    const seconds = Math.max(5, Math.min(18, Number(config.seconds) || 9));
    const coinValue = Math.max(5, Math.min(150, Number(config.coinValue) || 15));
    const spawnInterval = Math.max(220, Number(config.spawnMs) || 520);
    const maxCoins = Math.max(8, Number(config.maxCoins) || 32);

        const header = document.createElement('div'); header.className = 'minigame-header';
        const title = document.createElement('div'); title.innerHTML = '💼 Work Sprint: Coin Rush';
        const meta = document.createElement('div'); meta.innerHTML = `<strong>Time:</strong> <span id="mg-timer">${seconds}</span>s · <strong>Score:</strong> $<span id="mg-score">0</span>`;
        header.appendChild(title); header.appendChild(meta);
        const area = document.createElement('div'); area.className = 'minigame-area';
        const footer = document.createElement('div'); footer.className = 'd-flex justify-content-end mt-2';
        const quitBtn = document.createElement('button'); quitBtn.className = 'btn btn-outline-secondary btn-sm'; quitBtn.innerText = 'Quit'; footer.appendChild(quitBtn);
        root.appendChild(header); root.appendChild(area); root.appendChild(footer);

        let score = 0; let timeLeft = seconds; let coinsSpawned = 0;
        const timerEl = header.querySelector('#mg-timer'); const scoreEl = header.querySelector('#mg-score');
        function spawnCoin() {
            if (coinsSpawned >= maxCoins) return;
            const coin = document.createElement('div'); coin.className = 'coin'; coin.textContent = '$';
            const rect = area.getBoundingClientRect(); const size = 28;
            coin.style.left = Math.random() * (rect.width - size) + 'px';
            coin.style.top = Math.random() * (rect.height - size) + 'px';
            coin.onclick = () => { score += coinValue; if (scoreEl) scoreEl.textContent = String(score); coin.classList.add('pop'); setTimeout(() => area.contains(coin) && area.removeChild(coin), 180); };
            area.appendChild(coin); coinsSpawned++;
        }
        const spawner = setInterval(spawnCoin, spawnInterval);
        const timer = setInterval(() => {
            timeLeft -= 1; if (timerEl) timerEl.textContent = String(timeLeft);
            if (timeLeft <= 0) {
                clearInterval(spawner); clearInterval(timer);
                Array.from(area.querySelectorAll('.coin')).forEach(c => c.remove());
                // require a higher threshold to be truly successful
                if (score >= 700) awardAchievement('Overtime Hero');
                // smaller payouts overall make winning less common
                resolve({ money: Math.floor(score * 0.9), stress: -1, meta: { minigameOutcome: score >= 700 ? 'big' : (score > 200 ? 'small' : 'none') } });
            }
        }, 1000);
        quitBtn.onclick = () => { clearInterval(spawner); clearInterval(timer); resolve({ money: Math.floor(score * 0.5), stress: 0 }); };
    });
}

function runWhackAFee(root, config = {}) {
    return new Promise((resolve) => {
    // bill-dodge: make it slightly harder to clear big arrears
    const seconds = Math.max(6, Math.min(18, Number(config.seconds) || 9));
    const maxSpawn = Math.max(8, Number(config.maxFees) || 14);
    const reducePerHit = Math.max(30, Number(config.reducePerHit) || 80);

        const header = document.createElement('div'); header.className = 'minigame-header'; header.innerHTML = `<div>🏠 Bill Dodge</div><div><strong>Time:</strong> <span id="mg2-timer">${seconds}</span>s · <strong>Arrears cleared:</strong> $<span id="mg2-cleared">0</span></div>`;
        const area = document.createElement('div'); area.className = 'minigame-area';
        const footer = document.createElement('div'); footer.className = 'd-flex justify-content-end mt-2';
        const quitBtn = document.createElement('button'); quitBtn.className = 'btn btn-outline-secondary btn-sm'; quitBtn.innerText = 'Quit'; footer.appendChild(quitBtn);
        root.appendChild(header); root.appendChild(area); root.appendChild(footer);
        let timeLeft = seconds; let spawned = 0; let cleared = 0;
        const timerEl = header.querySelector('#mg2-timer'); const clearedEl = header.querySelector('#mg2-cleared');
        function spawnFee() {
            if (spawned >= maxSpawn) return;
            const fee = document.createElement('div'); fee.className = 'fee'; fee.innerHTML = `<div>Fee<br/><small>-$${reducePerHit}</small></div>`;
            const rect = area.getBoundingClientRect(); const w = 70, h = 50;
            fee.style.left = Math.random() * (rect.width - w) + 'px'; fee.style.top = Math.random() * (rect.height - h) + 'px';
            fee.onclick = () => { if (!fee.classList.contains('hit')) { fee.classList.add('hit'); cleared += reducePerHit; if (clearedEl) clearedEl.textContent = String(cleared); playSfx('hit'); setTimeout(() => area.contains(fee) && area.removeChild(fee), 90); } };
            area.appendChild(fee); spawned++;
        }
        const spawner = setInterval(spawnFee, Math.max(300, Number(config.spawnMs) || 600));
        const timer = setInterval(() => {
            timeLeft -= 1; if (timerEl) timerEl.textContent = String(timeLeft);
            if (timeLeft <= 0) {
                clearInterval(spawner); clearInterval(timer);
                // require more cleared to get max benefit
                if (cleared >= 1000) awardAchievement('Bill Ninja');
                resolve({ meta: { reduceArrearsBy: Math.floor(cleared) }, stress: -2, metaNote: cleared >= 1000 ? 'major' : (cleared >= 400 ? 'minor' : 'none') });
            }
        }, 1000);
        quitBtn.onclick = () => { clearInterval(spawner); clearInterval(timer); resolve({ meta: { reduceArrearsBy: Math.floor(cleared * 0.5) }, stress: 0 }); };
    });
}

function runTypingChallenge(root, config = {}) {
    return new Promise((resolve) => {
    const seconds = Math.max(4, Math.min(16, Number(config.seconds) || 7));
    const words = Array.isArray(config.words) && config.words.length ? config.words : ['variable','function','closure','promise','adapter','iterator','factory','compose'];
    const reward = Math.max(30, Number(config.reward) || 150);
        const target = words[Math.floor(Math.random() * words.length)];
        const header = document.createElement('div'); header.className = 'minigame-header'; header.innerHTML = `<div>⌨️ Coding Test</div><div><strong>Time:</strong> <span id="mg3-timer">${seconds}</span>s</div>`;
        const wrap = document.createElement('div'); wrap.className = 'typing-wrap';
        const prompt = document.createElement('div'); prompt.innerHTML = `Type this: <span class="typing-word">${target}</span>`;
        const input = document.createElement('input'); input.className = 'typing-input'; input.setAttribute('placeholder', 'Start typing...'); input.setAttribute('autocomplete', 'off');
        wrap.appendChild(prompt); wrap.appendChild(input);
        const footer = document.createElement('div'); footer.className = 'd-flex justify-content-end mt-2';
        const giveUp = document.createElement('button'); giveUp.className = 'btn btn-outline-secondary btn-sm'; giveUp.innerText = 'Give up'; footer.appendChild(giveUp);
        root.appendChild(header); root.appendChild(wrap); root.appendChild(footer);
        let timeLeft = seconds; const timerEl = header.querySelector('#mg3-timer');
    const timer = setInterval(() => { timeLeft -= 1; if (timerEl) timerEl.textContent = String(timeLeft); if (timeLeft <= 0) { clearInterval(timer); resolve({ money: 0, stress: 2, meta: { minigameOutcome: 'timeout' } }); } }, 1000);
        input.focus();
        input.addEventListener('input', () => { if (input.value.trim() === target) { clearInterval(timer); awardAchievement('Typist'); resolve({ money: reward, stress: -2 }); } });
        giveUp.onclick = () => { clearInterval(timer); resolve({ money: 0, stress: 0 }); };
    });
}

function runReactionClick(root, config = {}) {
    return new Promise((resolve) => {
    // tighter reaction window and smaller top reward
    const minDelay = Math.max(700, Number(config.minDelayMs) || 900);
    const maxDelay = Math.max(minDelay + 300, Number(config.maxDelayMs) || 1800);
    const maxReward = Math.max(40, Number(config.maxReward) || 140);
        const header = document.createElement('div'); header.className = 'minigame-header'; header.innerHTML = `<div>⚡ Reaction Test</div><div>Wait for green, then click!</div>`;
        const area = document.createElement('div'); area.className = 'minigame-area'; area.style.display = 'grid'; area.style.placeItems = 'center';
        const prompt = document.createElement('div'); prompt.textContent = 'Wait...'; prompt.style.fontSize = '22px'; area.appendChild(prompt);
        const footer = document.createElement('div'); footer.className = 'd-flex justify-content-end mt-2';
        const quitBtn = document.createElement('button'); quitBtn.className = 'btn btn-outline-secondary btn-sm'; quitBtn.textContent = 'Quit'; footer.appendChild(quitBtn);
        root.appendChild(header); root.appendChild(area); root.appendChild(footer);
        let canClick = false; let greenAt = 0; const delay = Math.random() * (maxDelay - minDelay) + minDelay;
        const timer = setTimeout(() => { canClick = true; greenAt = performance.now(); area.style.background = '#e7fbe9'; prompt.textContent = 'Click!'; }, delay);
    area.onclick = () => { if (!canClick) { playSfx('lose'); resolve({ money: 0, stress: 1, meta: { minigameOutcome: 'falseStart' } }); return; } const rt = performance.now() - greenAt; const clamped = Math.max(40, Math.min(600, rt)); const score = Math.round(maxReward * (1 - (clamped - 40) / (600 - 40))); if (score >= maxReward * 0.85) awardAchievement('Lightning Reflex'); clearTimeout(timer); resolve({ money: Math.max(0, score), stress: -1, meta: { reactionTime: rt } }); };
        quitBtn.onclick = () => { clearTimeout(timer); resolve({ money: 0, stress: 0 }); };
    });
}

function runQuickMath(root, config = {}) {
    return new Promise((resolve) => {
    const seconds = Math.max(4, Math.min(16, Number(config.seconds) || 7));
    const reward = Math.max(30, Number(config.reward) || 150);
        const a = Math.floor(Math.random() * 20) + 5; const b = Math.floor(Math.random() * 12) + 3; const ops = ['+','-','×'];
        const op = ops[Math.floor(Math.random()*ops.length)]; const ans = op === '+' ? a + b : op === '-' ? a - b : a * b;
        const header = document.createElement('div'); header.className = 'minigame-header'; header.innerHTML = `<div>🧮 Quick Math</div><div><strong>Time:</strong> <span id=\"mgm-timer\">${seconds}</span>s</div>`;
        const wrap = document.createElement('div'); wrap.className = 'typing-wrap';
        const prompt = document.createElement('div'); prompt.innerHTML = `Solve: <span class=\"typing-word\">${a} ${op} ${b}</span>`;
        const input = document.createElement('input'); input.className = 'typing-input'; input.setAttribute('type','number'); input.setAttribute('placeholder','Your answer');
        wrap.appendChild(prompt); wrap.appendChild(input);
        const footer = document.createElement('div'); footer.className = 'd-flex justify-content-end mt-2';
        const btn = document.createElement('button'); btn.className = 'btn btn-primary btn-sm'; btn.textContent = 'Submit'; footer.appendChild(btn);
        root.appendChild(header); root.appendChild(wrap); root.appendChild(footer);
        input.focus(); let timeLeft = seconds; const timerEl = header.querySelector('#mgm-timer');
        const timer = setInterval(() => { timeLeft -= 1; if (timerEl) timerEl.textContent = String(timeLeft); if (timeLeft <= 0) { clearInterval(timer); resolve({ money: 0, stress: 1 }); } }, 1000);
    function submit() { const val = Number(input.value); clearInterval(timer); if (val === ans) { awardAchievement('Human Calculator'); resolve({ money: reward, stress: -2, meta: { minigameOutcome: 'correct' } }); } else { resolve({ money: 0, stress: 1, meta: { minigameOutcome: 'wrong' } }); } }
        btn.onclick = submit; input.addEventListener('keydown', e => { if (e.key === 'Enter') submit(); });
    });
}
