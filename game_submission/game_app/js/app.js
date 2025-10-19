// Simple Balance Board game logic
const NUM_TILES = 12;
const START_WELL = 75;

const tiles = [
  {desc: "Start: Fresh Day", type: "none"},
  {desc: "Work deadline (stress)", type: "stress"},
  {desc: "Friend call (support)", type: "support"},
  {desc: "Commute delay (stress)", type: "stress"},
  {desc: "Mindful break (selfcare)", type: "selfcare"},
  {desc: "Unexpected bill (stress)", type: "stress"},
  {desc: "Community group (support)", type: "support"},
  {desc: "Overtime (choice)", type: "choice"},
  {desc: "Exercise (selfcare)", type: "selfcare"},
  {desc: "Bad news (stress)", type: "stress"},
  {desc: "Volunteer (support)", type: "support"},
  {desc: "Final Week: Appointment", type: "none"}
];

let state = {
  pos: 0,
  wellbeing: START_WELL
};

const DOM = {};
function q(id){ return document.getElementById(id); }

function initDOM(){
  DOM.menu = q('menu');
  DOM.play = q('play');
  DOM.how = q('how');
  DOM.credits = q('credits');
  DOM.startBtn = q('startBtn');
  DOM.howBtn = q('howBtn');
  DOM.creditsBtn = q('creditsBtn');
  DOM.backBtns = Array.from(document.getElementsByClassName('backBtn'));
  DOM.board = q('board');
  DOM.rollBtn = q('rollBtn');
  DOM.dice = q('dice');
  DOM.pos = q('pos');
  DOM.wellfill = q('wellfill');
  DOM.wellvalue = q('wellvalue');
  DOM.cardArea = q('cardArea');
  DOM.card = q('card');
  DOM.cardText = q('cardText');
  DOM.choiceButtons = q('choiceButtons');
  DOM.cardOk = q('cardOk');
  DOM.result = q('result');
  DOM.resultTitle = q('resultTitle');
  DOM.resultText = q('resultText');
  DOM.restartBtn = q('restartBtn');
  DOM.menuBtn = q('menuBtn');
}

function bind(){
  DOM.startBtn.onclick = ()=>showScreen('play');
  DOM.howBtn.onclick = ()=>showScreen('how');
  DOM.creditsBtn.onclick = ()=>showScreen('credits');
  DOM.backBtns.forEach(b=>b.addEventListener('click', ()=>showScreen('menu')));
  DOM.rollBtn.addEventListener('click', rollDice);
  DOM.cardOk.addEventListener('click', hideCard);
  DOM.restartBtn.addEventListener('click', restartGame);
  DOM.menuBtn.addEventListener('click', ()=>showScreen('menu'));
}

function showScreen(id){
  document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  if(id === 'play') startGame();
}

function startGame(){
  state.pos = 0;
  state.wellbeing = START_WELL;
  renderBoard();
  updateUI();
  hideResult();
  hideCard();
  DOM.dice.textContent = '—';
}

function renderBoard(){
  DOM.board.innerHTML = '';
  for(let i=0;i<NUM_TILES;i++){
    const t = document.createElement('div');
    t.className='tile';
    if(i===state.pos) t.classList.add('current');
    t.innerHTML = `<div class="num">Tile ${i+1}</div><div class="desc">${tiles[i].desc}</div>`;
    DOM.board.appendChild(t);
  }
}

function updateUI(){
  DOM.pos.textContent = `Tile: ${state.pos+1}`;
  const pct = Math.max(0, Math.min(100, state.wellbeing));
  DOM.wellfill.style.width = pct + '%';
  DOM.wellvalue.textContent = Math.round(pct);
  // color fill gradient handled in css
  document.querySelectorAll('.tile').forEach((el, idx)=>{
    el.classList.toggle('current', idx===state.pos);
  });
}

function rollDice(){
  DOM.rollBtn.disabled = true;
  const roll = Math.floor(Math.random()*6)+1;
  DOM.dice.textContent = roll;
  // move
  state.pos = Math.min(NUM_TILES-1, state.pos + roll);
  renderBoard();
  updateUI();
  setTimeout(()=>triggerTile(), 400);
}

function triggerTile(){
  const tile = tiles[state.pos];
  if(tile.type === 'stress'){
    showCard({
      text: `Stressful event: ${tile.desc}. You feel overwhelmed.`,
      choices: [
        {label:"Push through (−15 wellbeing)", effect: ()=>changeWell(-15)},
        {label:"Take time off (+10 wellbeing)", effect: ()=>changeWell(10)}
      ]
    });
  } else if(tile.type === 'support'){
    showCard({
      text: `Support opportunity: ${tile.desc}. Connect with others.`,
      choices: [
        {label:"Accept support (+12 wellbeing)", effect: ()=>changeWell(12)},
        {label:"Decline (no change)", effect: ()=>changeWell(0)}
      ]
    });
  } else if(tile.type === 'selfcare'){
    showCard({
      text: `Self-care action: ${tile.desc}. Choose how to act.`,
      choices: [
        {label:"Quick break (+6 wellbeing)", effect: ()=>changeWell(6)},
        {label:"Deep practice (+12 wellbeing)", effect: ()=>changeWell(12)}
      ]
    });
  } else if(tile.type === 'choice'){
    showCard({
      text: `Trade-off decision: ${tile.desc}. Choose carefully.`,
      choices: [
        {label:"Work overtime (+8 progress, −10 wellbeing)", effect: ()=>{ changeWell(-10); }},
        {label:"Set boundaries (+0 progress, +8 wellbeing)", effect: ()=>{ changeWell(8); }}
      ]
    });
  } else {
    // no event
    DOM.rollBtn.disabled = false;
  }
}

function showCard({text, choices}){
  DOM.cardArea.classList.remove('hidden');
  DOM.cardText.textContent = text;
  DOM.choiceButtons.innerHTML = '';
  DOM.cardOk.classList.add('hidden');
  choices.forEach((c, idx)=>{
    const b = document.createElement('button');
    b.className = 'choiceBtn';
    b.textContent = c.label;
    b.onclick = ()=>{
      c.effect();
      DOM.cardOk.classList.remove('hidden');
      // lock choices
      DOM.choiceButtons.querySelectorAll('button').forEach(btn=>btn.disabled=true);
    };
    DOM.choiceButtons.appendChild(b);
  });
}

function hideCard(){
  DOM.cardArea.classList.add('hidden');
  DOM.rollBtn.disabled = false;
  checkState();
}

function changeWell(delta){
  state.wellbeing += delta;
  updateUI();
}

function checkState(){
  if(state.wellbeing <= 0){
    showResult('Game Over', 'Your wellbeing reached 0. This shows how continuing stress without support can cause harm. Try different choices next time.');
    return;
  }
  if(state.pos >= NUM_TILES-1){
    if(state.wellbeing >= 50){
      showResult('You Win', 'You reached the end with balanced wellbeing. Small supports and self-care helped you maintain balance.');
    } else {
      showResult('Reached End', 'You reached the end but wellbeing was low. Reflect on supports and choices you could use earlier.');
    }
    return;
  }
}

function showResult(title, text){
  DOM.resultTitle.textContent = title;
  DOM.resultText.textContent = text;
  DOM.result.classList.remove('hidden');
  DOM.rollBtn.disabled = true;
}

function hideResult(){
  DOM.result.classList.add('hidden');
}

function restartGame(){
  showScreen('play');
}

window.addEventListener('load', ()=>{
  initDOM();
  bind();
  renderBoard();
  updateUI();
});
