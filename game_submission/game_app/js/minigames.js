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

        const closeWith = (effects) => { overlay.classList.add('d-none'); root.innerHTML = ''; resolve(effects || {}); };
        const cancel = () => { overlay.classList.add('d-none'); root.innerHTML = ''; reject(new Error('minigame-cancelled')); };

        if (name === 'coin-rush') runCoinRush(root, config).then(closeWith).catch(cancel);
        else if (name === 'whack-a-fee') runWhackAFee(root, config).then(closeWith).catch(cancel);
        else if (name === 'typing-challenge') runTypingChallenge(root, config).then(closeWith).catch(cancel);
        else if (name === 'reaction-click') runReactionClick(root, config).then(closeWith).catch(cancel);
        else if (name === 'quick-math') runQuickMath(root, config).then(closeWith).catch(cancel);
        else closeWith({});
    });
}

function runCoinRush(root, config = {}) {
    return new Promise((resolve) => {
        const seconds = Math.max(5, Math.min(20, Number(config.seconds) || 10));
        const coinValue = Math.max(5, Math.min(200, Number(config.coinValue) || 25));
        const spawnInterval = Math.max(200, Number(config.spawnMs) || 500);
        const maxCoins = Math.max(10, Number(config.maxCoins) || 40);

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
            if (timeLeft <= 0) { clearInterval(spawner); clearInterval(timer); Array.from(area.querySelectorAll('.coin')).forEach(c => c.remove()); if (score >= 500) awardAchievement('Overtime Hero'); resolve({ money: score, stress: -1 }); }
        }, 1000);
        quitBtn.onclick = () => { clearInterval(spawner); clearInterval(timer); resolve({ money: Math.floor(score * 0.5), stress: 0 }); };
    });
}

function runWhackAFee(root, config = {}) {
    return new Promise((resolve) => {
        const seconds = Math.max(6, Math.min(20, Number(config.seconds) || 10));
        const maxSpawn = Math.max(8, Number(config.maxFees) || 16);
        const reducePerHit = Math.max(50, Number(config.reducePerHit) || 100);

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
            if (timeLeft <= 0) { clearInterval(spawner); clearInterval(timer); if (cleared >= 800) awardAchievement('Bill Ninja'); resolve({ meta: { reduceArrearsBy: cleared }, stress: -2 }); }
        }, 1000);
        quitBtn.onclick = () => { clearInterval(spawner); clearInterval(timer); resolve({ meta: { reduceArrearsBy: Math.floor(cleared * 0.5) }, stress: 0 }); };
    });
}

function runTypingChallenge(root, config = {}) {
    return new Promise((resolve) => {
        const seconds = Math.max(5, Math.min(20, Number(config.seconds) || 8));
        const words = Array.isArray(config.words) && config.words.length ? config.words : ['variable','function','closure','promise','adapter','iterator','factory','compose'];
        const reward = Math.max(50, Number(config.reward) || 200);
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
        const timer = setInterval(() => { timeLeft -= 1; if (timerEl) timerEl.textContent = String(timeLeft); if (timeLeft <= 0) { clearInterval(timer); resolve({ money: 0, stress: 2 }); } }, 1000);
        input.focus();
        input.addEventListener('input', () => { if (input.value.trim() === target) { clearInterval(timer); awardAchievement('Typist'); resolve({ money: reward, stress: -2 }); } });
        giveUp.onclick = () => { clearInterval(timer); resolve({ money: 0, stress: 0 }); };
    });
}

function runReactionClick(root, config = {}) {
    return new Promise((resolve) => {
        const minDelay = Math.max(600, Number(config.minDelayMs) || 800);
        const maxDelay = Math.max(minDelay + 400, Number(config.maxDelayMs) || 2500);
        const maxReward = Math.max(50, Number(config.maxReward) || 200);
        const header = document.createElement('div'); header.className = 'minigame-header'; header.innerHTML = `<div>⚡ Reaction Test</div><div>Wait for green, then click!</div>`;
        const area = document.createElement('div'); area.className = 'minigame-area'; area.style.display = 'grid'; area.style.placeItems = 'center';
        const prompt = document.createElement('div'); prompt.textContent = 'Wait...'; prompt.style.fontSize = '22px'; area.appendChild(prompt);
        const footer = document.createElement('div'); footer.className = 'd-flex justify-content-end mt-2';
        const quitBtn = document.createElement('button'); quitBtn.className = 'btn btn-outline-secondary btn-sm'; quitBtn.textContent = 'Quit'; footer.appendChild(quitBtn);
        root.appendChild(header); root.appendChild(area); root.appendChild(footer);
        let canClick = false; let greenAt = 0; const delay = Math.random() * (maxDelay - minDelay) + minDelay;
        const timer = setTimeout(() => { canClick = true; greenAt = performance.now(); area.style.background = '#e7fbe9'; prompt.textContent = 'Click!'; }, delay);
        area.onclick = () => { if (!canClick) { playSfx('lose'); resolve({ money: 0, stress: 1 }); return; } const rt = performance.now() - greenAt; const clamped = Math.max(50, Math.min(700, rt)); const score = Math.round(maxReward * (1 - (clamped - 50) / (700 - 50))); if (score >= maxReward * 0.8) awardAchievement('Lightning Reflex'); clearTimeout(timer); resolve({ money: Math.max(0, score), stress: -1 }); };
        quitBtn.onclick = () => { clearTimeout(timer); resolve({ money: 0, stress: 0 }); };
    });
}

function runQuickMath(root, config = {}) {
    return new Promise((resolve) => {
        const seconds = Math.max(5, Math.min(20, Number(config.seconds) || 8));
        const reward = Math.max(50, Number(config.reward) || 200);
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
        function submit() { const val = Number(input.value); clearInterval(timer); if (val === ans) { awardAchievement('Human Calculator'); resolve({ money: reward, stress: -2 }); } else { resolve({ money: 0, stress: 1 }); } }
        btn.onclick = submit; input.addEventListener('keydown', e => { if (e.key === 'Enter') submit(); });
    });
}
