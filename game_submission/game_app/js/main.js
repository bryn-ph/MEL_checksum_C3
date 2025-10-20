async function initializeGame() {
    const menuContainer = document.getElementById("menu-container");
    const gameContainer = document.getElementById("game-container");
    const startGameButton = document.getElementById("start-game");
    const quitGameButton = document.getElementById("quit-game");
    const sfxToggle = document.getElementById("sfx-toggle");
    const playCoin = document.getElementById('play-coinrush');
    const playFee = document.getElementById('play-billdodge');
    const playTyping = document.getElementById('play-typing');
    const playReaction = document.getElementById('play-reaction');
    const playMath = document.getElementById('play-math');
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

    if (sfxToggle) sfxToggle.onclick = () => {
        gameState.sfxEnabled = !gameState.sfxEnabled;
        sfxToggle.textContent = gameState.sfxEnabled ? '🔊 SFX: On' : '🔇 SFX: Off';
    };

    if (playCoin) playCoin.onclick = () => { runMinigame('coin-rush', { seconds: 10, coinValue: 25, spawnMs: 450 }).then(eff => { showMenuToast(`Coin Rush: You earned $${eff.money || 0}.`, true); }).catch(() => showMenuToast('Minigame cancelled.', false)); };
    if (playFee) playFee.onclick = () => { runMinigame('whack-a-fee', { seconds: 10, reducePerHit: 120, spawnMs: 550 }).then(eff => { const amt = eff?.meta?.reduceArrearsBy || 0; showMenuToast(`Bill Dodge: Cleared $${amt} in fees.`, true); }).catch(() => showMenuToast('Minigame cancelled.', false)); };
    if (playTyping) playTyping.onclick = () => { runMinigame('typing-challenge', { seconds: 8, reward: 250 }).then(eff => { showMenuToast(`Typing Challenge: Reward $${eff.money || 0}.`, true); }).catch(() => showMenuToast('Minigame cancelled.', false)); };
    if (playReaction) playReaction.onclick = () => { runMinigame('reaction-click', { maxReward: 200 }).then(eff => { showMenuToast(`Reaction Test: Reward $${eff.money || 0}.`, true); }).catch(() => showMenuToast('Minigame cancelled.', false)); };
    if (playMath) playMath.onclick = () => { runMinigame('quick-math', { seconds: 8, reward: 200 }).then(eff => { showMenuToast(`Quick Math: Reward $${eff.money || 0}.`, true); }).catch(() => showMenuToast('Minigame cancelled.', false)); };

    // load event data (non-blocking for menu playground)
    loadEvents();
}

initializeGame();
