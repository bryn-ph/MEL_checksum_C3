// Game state
const gameState = {
    cash: 2000,
    debt: 0,
    properties: [],
    currentScene: "start",
    timer: null, // Timer reference
};

// Scenes
const scenes = {
    start: {
        text: "You’ve just arrived in Australia with $2,000. What do you want to do first?",
        options: [
            { text: "Look for a job", nextScene: "job_search" },
            { text: "Find a place to stay", nextScene: "housing_search" },
        ],
        timeoutEffect: () => {
            gameState.cash -= 200; // Lose money for wasting time
            alert("You wasted time and lost $200!");
        },
    },
    job_search: {
        text: "You start looking for a job. After a week of searching, you find two options.",
        options: [
            { text: "Take a high-paying but stressful job", nextScene: "stressful_job" },
            { text: "Take a low-paying but stable job", nextScene: "stable_job" },
        ],
        timeoutEffect: () => {
            gameState.cash -= 500; // Lose money for not finding a job
            alert("You couldn't find a job in time and lost $500!");
        },
    },
    housing_search: {
        text: "You start looking for housing. You find two options.",
        options: [
            { text: "Rent a cheap apartment", nextScene: "cheap_apartment" },
            { text: "Rent a modern apartment", nextScene: "modern_apartment" },
        ],
        timeoutEffect: () => {
            gameState.cash -= 300; // Lose money for staying in temporary housing
            alert("You had to stay in temporary housing and lost $300!");
        },
    },
    stressful_job: {
        text: "You took the high-paying job. You earn $5,000 but lose 10 health points due to stress.",
        options: [
            { text: "Continue", nextScene: "start" },
        ],
        effect: () => {
            gameState.cash += 5000;
            gameState.health -= 10;
        },
    },
    stable_job: {
        text: "You took the stable job. You earn $2,000 and maintain your health.",
        options: [
            { text: "Continue", nextScene: "start" },
        ],
        effect: () => {
            gameState.cash += 2000;
        },
    },
    cheap_apartment: {
        text: "You rented a cheap apartment. It costs $500 per month.",
        options: [
            { text: "Continue", nextScene: "start" },
        ],
        effect: () => {
            gameState.cash -= 500;
        },
    },
    modern_apartment: {
        text: "You rented a modern apartment. It costs $1,500 per month.",
        options: [
            { text: "Continue", nextScene: "start" },
        ],
        effect: () => {
            gameState.cash -= 1500;
        },
    },
};

// Update the counters dynamically
function updateCounters() {
    const moneyCounter = document.getElementById("money-counter");
    const stressCounter = document.getElementById("stress-counter");
    const debtCounter = document.getElementById("debt-counter");

    moneyCounter.innerText = `💰 Money: $${gameState.cash}`;
    stressCounter.innerText = `😰 Stress: ${gameState.stress || 0}`;

    if (gameState.debt > 0) {
        debtCounter.classList.remove("d-none");
        debtCounter.innerText = `💳 Debt: $${gameState.debt}`;
    } else {
        debtCounter.classList.add("d-none");
    }
}

// Render the game
function renderScene(sceneKey) {
    const scene = scenes[sceneKey];
    const gameText = document.getElementById("game-text");
    const gameOptions = document.getElementById("game-options");
    const timerElement = document.createElement("div");
    timerElement.id = "timer";

    // Clear any existing timer
    if (gameState.timer) clearTimeout(gameState.timer);

    // Update game state if the scene has an effect
    if (scene.effect) scene.effect();

    // Update counters
    updateCounters();

    // Display scene text
    gameText.innerText = scene.text;

    // Display options
    gameOptions.innerHTML = "";
    scene.options.forEach((option) => {
        const button = document.createElement("button");
        button.className = "btn btn-secondary m-2";
        button.innerText = option.text;
        button.onclick = () => {
            clearTimeout(gameState.timer); // Clear timer on decision
            renderScene(option.nextScene);
        };
        gameOptions.appendChild(button);
    });

    // Add timer
    gameOptions.appendChild(timerElement);
    startTimer(10, timerElement, () => {
        if (scene.timeoutEffect) scene.timeoutEffect();
        renderScene("start"); // Return to start scene after timeout
    });
}

// Start a countdown timer
function startTimer(seconds, timerElement, onTimeout) {
    let timeLeft = seconds;
    timerElement.innerText = `Time left: ${timeLeft}s`;

    const interval = setInterval(() => {
        timeLeft -= 1;
        timerElement.innerText = `Time left: ${timeLeft}s`;

        if (timeLeft <= 0) {
            clearInterval(interval);
            onTimeout();
        }
    }, 1000);

    gameState.timer = interval;
}

// Initialize the game
function initializeGame() {
    const menuContainer = document.getElementById("menu-container");
    const gameContainer = document.getElementById("game-container");
    const startGameButton = document.getElementById("start-game");

    startGameButton.onclick = () => {
        menuContainer.classList.add("d-none");
        gameContainer.classList.remove("d-none");
        renderScene(gameState.currentScene);
    };
}

// Start the game
initializeGame();