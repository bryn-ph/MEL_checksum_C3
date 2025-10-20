
// Game state
const gameState = {
    cash: 2000,
    debt: 0,
    properties: [],
    currentScene: "start",
};

// Scenes
const scenes = {
    start: {
        text: "You’ve just arrived in Australia with $2,000. What do you want to do first?",
        options: [
            { text: "Look for a job", nextScene: "job_search" },
            { text: "Find a place to stay", nextScene: "housing_search" },
        ],
    },
    job_search: {
        text: "You start looking for a job. After a week of searching, you find two options.",
        options: [
            { text: "Take a high-paying but stressful job", nextScene: "stressful_job" },
            { text: "Take a low-paying but stable job", nextScene: "stable_job" },
        ],
    },
    housing_search: {
        text: "You start looking for housing. You find two options.",
        options: [
            { text: "Rent a cheap apartment", nextScene: "cheap_apartment" },
            { text: "Rent a modern apartment", nextScene: "modern_apartment" },
        ],
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

// Render the game
function renderScene(sceneKey) {
    const scene = scenes[sceneKey];
    const gameText = document.getElementById("game-text");
    const gameOptions = document.getElementById("game-options");

    // Update game state if the scene has an effect
    if (scene.effect) scene.effect();

    // Display scene text
    gameText.innerText = scene.text;

    // Display options
    gameOptions.innerHTML = "";
    scene.options.forEach((option) => {
        const button = document.createElement("button");
        button.innerText = option.text;
        button.onclick = () => renderScene(option.nextScene);
        gameOptions.appendChild(button);
    });
}

// Start the game
renderScene(gameState.currentScene);