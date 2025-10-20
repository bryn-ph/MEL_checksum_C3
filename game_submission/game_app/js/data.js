// Data loading
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

function getAvailableEvents(category, order, prerequisites = {}) {
    let events;
    if (category === "job") events = jobEvents; else if (category === "housing") events = housingEvents; else events = randomEvents;
    return events.filter(event => {
        if (usedEvents[category].has(event.id)) return false;
        if (event.order !== order) return false;
        if (event.prerequisite && !prerequisites[event.prerequisite]) return false;
        return true;
    });
}
