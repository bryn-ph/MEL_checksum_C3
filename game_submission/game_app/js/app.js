/* House of Cards — Housing Crisis Card Game
   Front-end only. Single file game logic.
   Drop into game_app/js/app.js
*/

(() => {
  // CONFIG
  const START_CASH = 50000;
  const START_DEBT = 0;
  const MAX_HAND = 6;

  // DOM refs
  const DOM = {
    menu: document.getElementById('menu'),
    rules: document.getElementById('rules'),
    play: document.getElementById('play'),
    startBtn: document.getElementById('startBtn'),
    rulesBtn: document.getElementById('rulesBtn'),
    backBtns: Array.from(document.getElementsByClassName('backBtn')),
    playerCount: document.getElementById('playerCount'),
    roundCount: document.getElementById('roundCount'),
    roundNum: document.getElementById('roundNum'),
    roundMax: document.getElementById('roundMax'),
    currentPlayerName: document.getElementById('currentPlayerName'),
    playersList: document.getElementById('playersList'),
    hand: document.getElementById('hand'),
    drawBtn: document.getElementById('drawBtn'),
    deckCount: document.getElementById('deckCount'),
    discardCount: document.getElementById('discardCount'),
    deckPreview: document.getElementById('deckPreview'),
    log: document.getElementById('log'),
    propertiesArea: document.getElementById('propertiesArea'),
    drawButton: document.getElementById('drawBtn'),
    endTurnBtn: document.getElementById('endTurnBtn'),
    pauseBtn: document.getElementById('pauseBtn'),
    cardModal: document.getElementById('cardModal'),
    modalTitle: document.getElementById('modalTitle'),
    modalText: document.getElementById('modalText'),
    modalChoices: document.getElementById('modalChoices'),
    modalOk: document.getElementById('modalOk'),
    resultModal: document.getElementById('resultModal'),
    resultTitle: document.getElementById('resultTitle'),
    resultBody: document.getElementById('resultBody'),
    playAgainBtn: document.getElementById('playAgainBtn'),
    backToMenuBtn: document.getElementById('backToMenuBtn')
  };

  // Game state
  let state = {
    players: [],
    deck: [],
    discard: [],
    currentPlayerIndex: 0,
    round: 1,
    roundMax: 12,
    playCountThisTurn: 0, // track how many cards player played this turn
    crisisEvery: 3,
    gameOver: false,
  };

  // Card factories
  function makePropertyCard(name, price, rent, risk = 'medium') {
    return {type: 'property', name, price, rent, value: price, risk, id: uid()};
  }

  function makeEventCard(text, effectFn) {
    return {type: 'event', name: 'Event', text, effectFn, id: uid()};
  }

  function makeActionCard(name, text, playFn) {
    return {type: 'action', name, text, playFn, id: uid()};
  }

  function makeCrisisCard(name, text, applyFn) {
    return {type: 'crisis', name, text, applyFn, id: uid()};
  }

  // Utilities
  function uid() {
    return Math.random().toString(36).slice(2, 9);
  }
  function shuffle(array) {
    for(let i=array.length-1;i>0;i--){
      const j=Math.floor(Math.random()*(i+1));
      [array[i],array[j]]=[array[j],array[i]];
    }
    return array;
  }
  function log(msg) {
    const p = document.createElement('div');
    p.textContent = msg;
    DOM.log.prepend(p);
  }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  // --- Card effect registry: implement card behavior here ---
  const CardEffects = {
    // EVENTS
    'evt-001': (game, player) => { // Interest Rate Hike
      game.players.forEach(p => {
        const inc = Math.round(p.debt * 0.10);
        p.debt += inc;
      });
      log('Event: Interest Rate Hike — all debts +10%.');
    },
    'evt-002': (game, player) => {
      game.players.forEach(p => p.cash += 500);
      log('Event: Community Garden — everyone +$500.');
    },
    'evt-003': (game, player) => { // Eviction Notice
      const candidates = game.players.filter(p => p.properties && p.properties.length);
      if(candidates.length === 0){ log('Eviction attempted but no properties in play.'); return; }
      const target = candidates[Math.floor(Math.random()*candidates.length)];
      if(target && target.properties.length){
        const lost = target.properties.splice(Math.floor(Math.random()*target.properties.length),1)[0];
        game.discard.push(lost);
        log(`Event: Eviction — ${target.name} lost ${lost.name || lost}.`);
      }
    },
    'evt-004': (game, player) => { player.discount = (player.discount || 1) * 0.90; log(`${player.name} got First Home Grant (10% off next purchase).`); },
    'evt-005': (game, player) => {
      if(player.cash >= 7500){ player.cash -= 7500; log(`${player.name} paid $7,500 maintenance.`); }
      else if(player.properties.length){ player.properties[0].skipRent = true; log(`${player.name} couldn't pay maintenance: one property loses rent this round.`); }
      else log('Unexpected Maintenance: no properties to mark.');
    },
    'evt-006': (game, player) => {
      if(player.properties.length){
        const pr = player.properties[0];
        pr.value = Math.round(pr.value * 1.15);
        pr.rent = Math.round(pr.rent * 1.10);
        log(`${player.name} renovation boom on ${pr.name}: +15% value, +10% rent.`);
      }
    },
    'evt-007': (game, player) => {
      game.players.forEach(p => {
        const d = Math.floor(Math.random()*6)+1;
        if(d <= 2){ p.cash -= 2000; log(`${p.name} lost $2,000 (protest roll ${d}).`); }
        else if(d >=5){ p.cash += 2000; log(`${p.name} gained $2,000 (protest roll ${d}).`); }
        else log(`${p.name} no change (protest roll ${d}).`);
      });
    },
    'evt-008': (game, player) => {
      // choose random target property if exists
      const props = game.players.flatMap(p => p.properties.map(pr => ({owner:p, prop:pr})));
      if(props.length === 0){ log('Tenant Strike: no properties available.'); return; }
      const target = props[Math.floor(Math.random()*props.length)];
      target.prop.skipRent = true;
      log(`Tenant Strike: ${target.owner.name}'s ${target.prop.name} yields no rent this round.`);
    },
    'evt-009': (game, player) => {
      if(player.properties.length === 0){ log('Landlord Sells: no properties to discard.'); return; }
      if(player.cash >= 10000){ player.cash -= 10000; log(`${player.name} paid $10,000 to keep property.`); }
      else {
        const removed = player.properties.pop();
        game.discard.push(removed);
        log(`${player.name} discarded ${removed.name} due to Landlord Sells.`);
      }
    },
    'evt-010': (game, player) => { game.marketModifier = (game.marketModifier || 1) * 0.92; log('Local Development Approval: property values reduced by 8% for valuation.'); },
    'evt-011': (game, player) => { game.evictionProtectionRounds = 2; log('Renters\' Union: eviction protection for 2 rounds.'); },
    'evt-012': (game, player) => { player.cash -= 5000; log(`${player.name} paid $5,000 inspection fine.`); },
    'evt-013': (game, player) => {
      // choose any property in play — pick random
      const props = game.players.flatMap(p => p.properties.map(pr => ({owner:p, prop:pr})));
      if(props.length === 0) return log('Pop-up Cafe: no properties.');
      const target = props[Math.floor(Math.random()*props.length)];
      target.prop.popupBonus = (target.prop.popupBonus || 0) + 200;
      log(`Pop-up Cafe: ${target.owner.name}'s ${target.prop.name} gets +$200 next rent.`);
    },
    'evt-014': (game, player) => { player.cash += 12000; log(`${player.name} received Insurance Payout +$12,000.`); },
    'evt-015': (game, player) => { player.greenRetrofit = true; log(`${player.name} got Green Retrofit Grant (next renovation -$7,500).`); },
    'evt-016': (game, player) => {
      if(player.properties.length){
        const pr = player.properties[0];
        pr.rent = Math.round(pr.rent * 1.5);
        pr.rentBoostRounds = (pr.rentBoostRounds || 0) + 1;
        log(`${player.name}'s ${pr.name} +50% rent next collection.`);
      }
    },
    'evt-017': (game, player) => {
      game.players.forEach(p => p.properties.forEach(pr => pr.value = Math.round(pr.value * 0.95)));
      log('Developer Fails to Deliver: all property values -5% this round.');
    },
    'evt-018': (game, player) => { player.interestRelief = (player.interestRelief || 0) + 2000; log(`${player.name} reduces interest due by $2,000 this round.`); },
    'evt-019': (game, player) => {
      if(player.properties.length){
        const pr = player.properties[0];
        // auto-flip to higher tier
        pr.value = Math.round(pr.value * 1.25);
        log(`${player.name} used Zoning Change: ${pr.name} +25% value.`);
      }
    },
    'evt-020': (game, player) => {
      const props = game.players.flatMap(p => p.properties.map(pr => ({owner:p, prop:pr})));
      if(props.length === 0) return log('Local Business Closes: no properties available.');
      const target = props[Math.floor(Math.random()*props.length)];
      target.prop.value = Math.round(target.prop.value * 0.90);
      log(`Local Business Closes: ${target.owner.name}'s ${target.prop.name} -10% value.`);
    },
    'evt-021': (game, player) => {
      const props = game.players.flatMap(p => p.properties.map(pr => ({owner:p, prop:pr})));
      if(props.length === 0) return;
      const target = props[Math.floor(Math.random()*props.length)];
      target.prop.rent = (target.prop.rent || 0) + 300;
      log(`Pop-up Artist Collective: ${target.owner.name}'s ${target.prop.name} +$300 rent this round.`);
    },
    'evt-022': (game, player) => { player.cash += 8000; log(`${player.name} received $8,000 from Housing Pitch.`); },
    'evt-023': (game, player) => {
      const opponents = game.players.filter(p => p !== player && p.properties.length);
      if(opponents.length === 0) return log('Squatter Settlement: no opponent properties.');
      const target = opponents[Math.floor(Math.random()*opponents.length)];
      target.properties[0].rent = Math.round(target.properties[0].rent * 0.5);
      log(`${target.name} will receive 50% rent on one property next round.`);
    },
    'evt-024': (game, player) => {
      // player choice not interactive here; default to cash
      player.cash += 4000;
      log(`${player.name} received $4,000 tax break.`);
    },
    'evt-025': (game, player) => {
      const props = game.players.flatMap(p => p.properties.map(pr => ({owner:p, prop:pr})));
      if(props.length === 0) return;
      const target = props[Math.floor(Math.random()*props.length)];
      target.prop.value = Math.round(target.prop.value * 0.88);
      log(`Media Scandal: ${target.owner.name}'s ${target.prop.name} -12% value.`);
    },
    'evt-026': (game, player) => { player.cash -= 2000; player.charityEvictionSafe = true; log(`${player.name} donated $2,000 and gains one eviction immunity.`); },
    'evt-027': (game, player) => {
      if(player.properties.length){
        const pr = player.properties[0];
        pr.value = Math.round(pr.value * 1.12);
        log(`${player.name} Price Discovery: ${pr.name} +12% value.`);
      }
    },
    'evt-028': (game, player) => {
      if(player.cash >= 6000){ player.cash -= 6000; log(`${player.name} paid $6,000 to dodgy contractor.`); }
      else if(player.properties.length){ player.properties[0].skipRent = true; log(`${player.name} couldn't pay: one property loses next rent.`); }
    },
    'evt-029': (game, player) => { game.players.forEach(p => p.cash += 300); log('Community Hub: all players +$300.'); },
    'evt-030': (game, player) => {
      const props = game.players.flatMap(p => p.properties.map(pr => ({owner:p, prop:pr})));
      if(props.length === 0) return;
      const target = props[Math.floor(Math.random()*props.length)];
      target.prop.value = Math.round(target.prop.value * 0.90);
      log(`Speculator Drops Out: ${target.owner.name}'s ${target.prop.name} -10% value.`);
    },

    // ACTIONS
    'act-001': (game, player) => { player.cash += 30000; player.debt += 30000; log(`${player.name} took a $30,000 loan.`); },
    'act-002': (game, player) => {
      if(player.properties.length === 0) return log('Renovate: no properties.');
      const prop = player.properties[0];
      const cost = Math.round(prop.value * 0.10);
      const discount = (player.greenRetrofit ? 7500 : 0);
      const pay = Math.max(0, cost - discount);
      if(player.cash >= pay){ player.cash -= pay; prop.value = Math.round(prop.value * 1.20); prop.rent = Math.round(prop.rent * 1.20); log(`${player.name} renovated ${prop.name} for $${formatNum(pay)}.`); }
      else log(`${player.name} cannot afford renovation ($${formatNum(pay)}).`);
    },
    'act-003': (game, player) => { if(player.cash >= 3000){ player.cash -= 3000; player.quickFix = true; log(`${player.name} paid $3,000 for Quick Fix.`); } else log('Quick Fix unaffordable.'); },
    'act-004': (game, player) => { game.rentBoost = 1.10; game.rentBoostRounds = 1; log(`${player.name} played Rent Increase: +10% rent next collection.`); },
    'act-005': (game, player) => {
      if(player.properties.length === 0) return log('Offer Renovation Loan: no property.');
      if(player.cash >= 5000){ player.cash -= 5000; const pr = player.properties[0]; pr.value = Math.round(pr.value * 1.12); pr.rent = Math.round(pr.rent * 1.08); log(`${player.name} offered renovation loan on ${pr.name}.`); } else log('Not enough cash for Offer Renovation Loan.');
    },
    'act-006': (game, player) => { if(Math.random() < 0.5) log(`${player.name} successfully evaded tax.`); else { player.cash -= 15000; log(`${player.name} failed Evade Tax: paid $15,000 fine.`); } },
    'act-007': (game, player) => { if(player.cash >= 6000){ player.cash -= 6000; player.insurance = true; log(`${player.name} bought Insurance Policy.`); } else log('Cannot afford insurance.'); },
    'act-008': (game, player) => { player.cash += 50000; player.debt += 50000; player.subsidizedLoan = (player.subsidizedLoan||0)+50000; log(`${player.name} took a subsidized loan +$50,000.`); },
    'act-009': (game, player) => {
      if(player.properties.length === 0) return log('Sell Property: none owned.');
      const pr = player.properties.shift();
      const gain = Math.round(pr.value * 0.95);
      player.cash += gain;
      game.discard.push(pr);
      log(`${player.name} sold ${pr.name} for $${formatNum(gain)}.`);
    },
    'act-010': (game, player) => { player.cash += 15000; player.bridgeDue = game.round + 2; log(`${player.name} received Bridge Funding +$15,000 (due in 2 rounds).`); },
    'act-011': (game, player) => {
      if(player.properties.length === 0) return log('Community Outreach: no property.');
      const pr = player.properties[0];
      pr.protectedRounds = 2; pr.extraRent = (pr.extraRent||0)+200;
      log(`${player.name} applied Community Outreach to ${pr.name} (+$200 rent, eviction protected for 2 rounds).`);
    },
    'act-012': (game, player) => { player.nextBuyDiscount = 0.95; player.nextBuyRentBoostRounds = 3; log(`${player.name} can buy next property at 5% discount and +10% rent for 3 rounds.`); },
    'act-013': (game, player) => {
      if(player.properties.length === 0) return log('Crowdfund: no property.');
      const pr = player.properties[0];
      pr.value = Math.round(pr.value * 1.10);
      log(`${player.name} crowdfunded improvement on ${pr.name} (+10% value).`);
    },
    'act-014': (game, player) => { player.leaseGuarantee = true; log(`${player.name} will have +$500 on next purchased property first rent.`); },
    'act-015': (game, player) => {
      if(player.properties.length < 2) return log('Bulk Sale: need 2 properties.');
      const sold = [player.properties.shift(), player.properties.shift()];
      const total = sold.reduce((s,pr)=>s+pr.value,0);
      const gain = Math.round(total * 0.92);
      player.cash += gain;
      sold.forEach(s=> game.discard.push(s));
      log(`${player.name} bulk sold 2 properties for $${formatNum(gain)}.`);
    },
    'act-016': (game, player) => {
      if(player.properties.length === 0) return log('Community Housing Partnership: no property.');
      const pr = player.properties[0];
      pr.extraRentRounds = 3; pr.extraRent = (pr.extraRent||0)+400; pr.locked = true;
      log(`${player.name} locked ${pr.name} into Community Partnership (+$400 for 3 rounds).`);
    },
    'act-017': (game, player) => {
      for(let i=0;i<Math.min(2, player.properties.length); i++){
        const pr = player.properties[i];
        if(pr.risk === 'high') pr.risk = 'medium';
        else if(pr.risk === 'medium') pr.risk = 'low';
      }
      log(`${player.name} reassessed portfolio (risk reduced on up to 2 properties).`);
    },
    'act-018': (game, player) => {
      if(player.properties.length === 0) return log('Short Sell: no target.');
      const target = player.properties[0];
      player.shortSell = { targetName: target.name, snapshotValue: target.value, active: true };
      log(`${player.name} short sold ${target.name}.`);
    },
    'act-019': (game, player) => { if(player.cash >= 12000){ player.cash -= 12000; player.preventLossThisRound = true; log(`${player.name} paid $12,000 for Emergency Repair.`); } else log('Emergency Repair unaffordable.'); },
    'act-020': (game, player) => {
      const d = Math.floor(Math.random()*6)+1;
      if(d >= 4){ player.cash += 8000; log(`${player.name} lobbying success (+$8,000).`); } else { player.cash -= 4000; log(`${player.name} lobbying failed (-$4,000).`); }
    },
    'act-021': (game, player) => { player.evictionCancel = true; player.tenantMediationBonus = 300; log(`${player.name} prepared Tenant Mediation (cancel next eviction, +$300 rent on that property).`); },
    'act-022': (game, player) => {
      if(player.properties.length === 0) return log('Affordable Grant: no property to apply to.');
      if(Math.random() < 0.5){
        const pr = player.properties[0];
        pr.affordable = true; pr.value = Math.round(pr.value * 1.08);
        log(`${player.name} succeeded in Affordable Housing Grant: ${pr.name} +8% value and protections.`);
      } else { player.cash -= 2000; log(`${player.name} grant application rejected (-$2,000).`); }
    },

    // CRISES
    'crs-001': (game) => { game.players.forEach(p => p.properties.forEach(pr => pr.value = Math.round(pr.value * 0.6/100)*100)); log('CRISIS: Market Crash! Property values fell 40%.'); },
    'crs-002': (game) => { game.players.forEach(p => { const inc = Math.round(p.debt * 0.10); p.debt += inc; }); log('CRISIS: Interest Rate Spike — debts +10%.'); },
    'crs-003': (game) => { game.rentFreeze = 1; log('CRISIS: Rent Freeze — no rent next collection.'); },
    'crs-004': (game) => { game.players.forEach(p => p.cash += 10000); log('CRISIS: Government Stimulus — +$10,000 each.'); },
    'crs-005': (game) => {
      // flood-exposed by name heuristic
      const floodNames = /coast|beach|bungalow|coastal/i;
      game.players.forEach(p => {
        p.properties.forEach(pr => {
          if(floodNames.test(pr.name || '')){
            if(p.cash >= 20000){ p.cash -= 20000; log(`${p.name} paid $20,000 to repair ${pr.name}.`); }
            else { pr.value = Math.round(pr.value * 0.5); log(`${pr.name} damaged by flood (-50%).`); }
          }
        });
      });
    },
    'crs-006': (game) => { game.players.forEach(p => p.properties.forEach(pr => pr.value = Math.round(pr.value * 0.85))); log('CRISIS: Developer Collapse — -15% property values.'); },
    'crs-007': (game) => { game.evictionProtectionRounds = 2; log('CRISIS: Eviction Moratorium — evictions blocked for 2 rounds.'); },
    'crs-008': (game) => { game.players.forEach(p => p.properties.forEach(pr => pr.value = Math.round(pr.value * 1.2))); log('CRISIS: Foreign Investment Surge — +20% property values.'); },
    'crs-009': (game) => {
      game.players.forEach(p => { if(p.debt > 0){ p.cash -= 5000; log(`${p.name} processed $5,000 fee for regulatory reform.`); }});
      game.players.forEach(p => p.properties.forEach(pr => { if(pr.affordable) pr.value = Math.round(pr.value * 1.08); }));
    },
    'crs-010': (game) => { game.wageShock = 1; log('CRISIS: Wage Shock — rents 15% lower next collection.'); }
  };

  // --- end CardEffects registry ---

  // Build deck
  function buildDeck() {
    const deck = [];

    // Properties: a mix of affordable to expensive
    const properties = [
      makePropertyCard('Studio Unit', 80000, 450, 'high'),
      makePropertyCard('Two-bed Apt', 200000, 1200, 'medium'),
      makePropertyCard('Victorian House', 500000, 2500, 'medium'),
      makePropertyCard('Suburban 3BR', 350000, 1500, 'low'),
      makePropertyCard('Tiny Home', 40000, 300, 'low'),
      makePropertyCard('High-rise Condo', 420000, 2200, 'high'),
      makePropertyCard('Run-down Duplex', 120000, 700, 'high'),
      makePropertyCard('Renovated Terrace', 430000, 2300, 'medium'),
      makePropertyCard('Student Share Room', 25000, 250, 'high'),
      makePropertyCard('Luxury Penthouse', 1200000, 8000, 'medium'),
    ];
    properties.forEach(p => deck.push(p));

    // Events
    deck.push(makeEventCard('Local council approves new development: cheap units enter market. Reduce next property prices by 8%.', (game, player) => {
      game.marketModifier = (game.marketModifier || 1)*0.92;
      log('Event: council development -> property prices eased.');
    }));
    deck.push(makeEventCard('Eviction wave: one random player loses rent from one property this round.', (game, player) => {
      const others = game.players.filter(pl => pl.properties.length>0);
      if(others.length){
        const target = others[Math.floor(Math.random()*others.length)];
        const lost = target.properties.pop();
        game.discard.push(lost.card || lost);
        log(`Event: ${target.name} lost a property due to eviction: ${lost.name}`);
      } else {
        log('Event: eviction attempted but no properties to evict.');
      }
    }));
    deck.push(makeEventCard('Grant for first-time buyers: next property you buy is 10% cheaper.', (game, player) => {
      player.discount = (player.discount || 1)*0.90;
      log(`${player.name} received a first-time buyer benefit.`);
    }));
    deck.push(makeEventCard('Unexpected maintenance costs: pay $7,500', (game, player) => {
      player.cash -= 7500;
      log(`${player.name} paid $7,500 maintenance.`);
    }));

    // Action cards: Buy property is handled by playing a property from hand.
    deck.push(makeActionCard('Take Loan', 'Take $30,000 loan (debt +30000).', (game, player) => {
      player.cash += 30000;
      player.debt += 30000;
      log(`${player.name} took a $30,000 loan.`);
    }));
    deck.push(makeActionCard('Renovate', 'Pick one of your properties to renovate: +20% value, +20% rent', (game, player) => {
      if(player.properties.length === 0) {
        log('Renovate: no properties to renovate.');
        return;
      }
      const prop = player.properties[0];
      prop.value = Math.round(prop.value * 1.20);
      prop.rent = Math.round(prop.rent * 1.20);
      log(`${player.name} renovated ${prop.name}.`);
    }));
    deck.push(makeActionCard('Rent Increase', 'All players collect +10% rent this round', (game, player) => {
      game.rentBoost = 1.10;
      log(`${player.name} played Rent Increase. Rent boosted this round.`);
    }));
    deck.push(makeActionCard('Evade Tax (Risky)', '50% chance avoid tax, 50% chance pay heavy fine $15k', (game, player) => {
      if(Math.random() < 0.5) {
        log(`${player.name} evaded tax successfully.`);
      } else {
        player.cash -= 15000;
        log(`${player.name} was fined $15,000 for tax evasion.`);
      }
    }));

    // Crisis cards (go into special crisis deck or the main deck; here we add some and they trigger when market phase happens)
    deck.push(makeCrisisCard('Market Crash', 'All property values drop 40%', (game) => {
      game.players.forEach(p => {
        p.properties.forEach(pr => {
          pr.value = Math.round(pr.value * 0.6);
        });
      });
      log('CRISIS: Market Crash! Property values fell 40%.');
    }));
    deck.push(makeCrisisCard('Interest Rate Hike', 'Debt interest increases: all debts +10% (applied once)', (game) => {
      game.players.forEach(p => {
        const inc = Math.round(p.debt * 0.10);
        p.debt += inc;
      });
      log('CRISIS: Interest rate hike increased debts by 10%.');
    }));
    deck.push(makeCrisisCard('Rent Freeze', 'No rent collected next round', (game) => {
      game.rentFreeze = 1;
      log('CRISIS: Rent Freeze! No rent next round.');
    }));
    deck.push(makeCrisisCard('Government Stimulus', 'Each player receives $10,000 subsidy', (game) => {
      game.players.forEach(p => { p.cash += 10000; });
      log('CRISIS: Government stimulus — everyone gets $10,000.');
    }));

    // Add duplicates of some lighter cards to enlarge deck
    for(let i=0;i<4;i++){
      deck.push(makeEventCard('Market chatter: minor slowdown, nothing immediate.', () => log('Event: market chatter.')));
    }
    for(let i=0;i<3;i++){
      deck.push(makeActionCard('Small Renovation', 'Minor renovation: +8% value +8% rent', (game, player) => {
        if(player.properties.length){
          const ppp = player.properties[0];
          ppp.value = Math.round(ppp.value * 1.08);
          ppp.rent = Math.round(ppp.rent * 1.08);
          log(`${player.name} did a small renovation on ${ppp.name}.`);
        } else {
          log(`${player.name} has no properties to renovate.`);
        }
      }));
    }

    return shuffle(deck);
  }

  // Player factory
  function makePlayer(name, isHuman=true) {
    return {
      name,
      isHuman,
      cash: START_CASH,
      debt: START_DEBT,
      properties: [],
      hand: [],
      eliminated: false,
      discount: 1,
      // decisions this turn
      actionsPlayed: 0,
    };
  }

  // Initialize new game
  function newGame(playerCount = 2, rounds = 12) {
    state.deck = buildDeck();
    state.discard = [];
    state.players = [];
    state.round = 1;
    state.currentPlayerIndex = 0;
    state.playCountThisTurn = 0;
    state.roundMax = rounds;
    state.gameOver = false;
    state.marketModifier = 1;
    state.rentBoost = 1;
    state.rentFreeze = 0;

    // create players: first is human, rest AI
    const humanCount = 1;
    for(let i=0;i<playerCount;i++){
      const isHuman = (i < humanCount);
      state.players.push(makePlayer(isHuman ? `You` : `AI ${i}` , isHuman));
    }

    // initial draw
    for(const p of state.players){
      for(let k=0;k<4;k++) dealTo(p);
    }

    renderAll();
    log('Game started. Good luck!');
    startTurn();
  }

  // Deal one card
  function drawCard() {
    if(state.deck.length === 0) {
      // reshuffle discard (except crisis cards? keep simple)
      state.deck = shuffle(state.discard.splice(0));
      log('Deck reshuffled from discard.');
      if(state.deck.length === 0) return null;
    }
    return state.deck.pop();
  }

  function dealTo(player) {
    const c = drawCard();
    if(!c) return;
    player.hand.push(c);
  }

  // UI rendering
  function renderAll() {
    DOM.roundNum.textContent = state.round;
    DOM.roundMax.textContent = state.roundMax;
    DOM.deckCount.textContent = state.deck.length;
    DOM.discardCount.textContent = state.discard.length;
    DOM.deckPreview.innerHTML = '';
    for(let i = state.deck.length-1; i>= Math.max(0, state.deck.length-3); i--){
      const li = document.createElement('li');
      const card = state.deck[i];
      li.textContent = `${card.type.toUpperCase()}: ${card.name || card.text || card}`;
      DOM.deckPreview.appendChild(li);
    }

    // players list
    DOM.playersList.innerHTML = '';
    state.players.forEach((p, idx) => {
      const div = document.createElement('div');
      div.className = 'player-summary';
      div.innerHTML = `<strong>${p.name}${p.eliminated ? ' (Out)' : (idx === state.currentPlayerIndex ? ' ←' : '')}</strong>
        <div>Cash: $${formatNum(p.cash)} | Debt: $${formatNum(p.debt)}</div>
        <div>Properties: ${p.properties.length}</div>
      `;
      DOM.playersList.appendChild(div);
    });

    // current player info
    const cp = state.players[state.currentPlayerIndex];
    DOM.currentPlayerName.textContent = cp ? cp.name : '-';

    // hand - for human only show human player hand
    const human = state.players.find(p => p.isHuman) || state.players[0];
    renderHand(human);

    // properties area
    DOM.propertiesArea.innerHTML = '';
    state.players.forEach(p => {
      const sec = document.createElement('div');
      sec.style.borderBottom = '1px dashed #e6f2f3';
      sec.style.padding = '6px 0';
      const header = document.createElement('div');
      header.innerHTML = `<strong>${p.name}</strong> — Net: $${formatNum(netWorth(p))}`;
      sec.appendChild(header);
      p.properties.forEach(pr => {
        const card = document.createElement('div');
        card.className = 'card';
        card.style.width = '100%';
        card.innerHTML = `<div class="title">${pr.name}</div>
          <div class="meta">Value: $${formatNum(pr.value)} | Rent: $${formatNum(pr.rent)}</div>`;
        sec.appendChild(card);
      });
      DOM.propertiesArea.appendChild(sec);
    });

    // result check
    checkGameOver();
  }

  function renderHand(player) {
    DOM.hand.innerHTML = '';
    if(!player) return;
    player.hand.forEach((card, idx) => {
      const cdiv = document.createElement('div');
      cdiv.className = 'card';
      cdiv.innerHTML = `<div class="title">${card.type === 'property' ? card.name : (card.name || card.text || card.type)}</div>
        <div class="meta">${card.type==='property' ? `Price: $${formatNum(card.price)} | Rent: $${formatNum(card.rent)}` : (card.text || '')}</div>`;
      // For human player, show controls to play card
      if(player.isHuman){
        const btn = document.createElement('button');
        btn.textContent = 'Play';
        btn.onclick = () => humanPlayCard(player, idx);
        cdiv.appendChild(btn);
      }
      DOM.hand.appendChild(cdiv);
    });
  }

  function formatNum(n) {
    return Math.max(0, Math.round(n)).toLocaleString();
  }

  function netWorth(p) {
    const propVal = p.properties.reduce((s,pr)=>s+pr.value, 0);
    return Math.round(p.cash + propVal - p.debt);
  }

  // Turn management
  function startTurn() {
    if(state.gameOver) return;
    state.playCountThisTurn = 0;
    const cp = state.players[state.currentPlayerIndex];
    if(cp.eliminated){
      advanceTurn();
      return;
    }
    log(`--- ${cp.name}'s turn ---`);
    // If human, allow UI; if AI, run AI moves
    if(cp.isHuman){
      // enable draw and buttons
      DOM.drawBtn.disabled = false;
      DOM.endTurnBtn.disabled = false;
    } else {
      DOM.drawBtn.disabled = true;
      DOM.endTurnBtn.disabled = true;
      // AI: draw then auto-play then end
      setTimeout(() => {
        aiTakeTurn(cp);
      }, 600);
    }
    renderAll();
  }

  function aiTakeTurn(player) {
    // draw
    dealTo(player);
    log(`${player.name} drew a card.`);
    // simple AI: if has property and cash>price*0.6 buy it
    for(let i=0;i<player.hand.length && player.actionsPlayed < 2;i++){
      const c = player.hand[i];
      if(c.type === 'property'){
        const effectivePrice = Math.round(c.price * (player.discount || 1));
        if(player.cash > effectivePrice * 0.6){
          buyProperty(player, i);
          i--; // hand changed
          player.actionsPlayed++;
        }
      } else if(c.type === 'action'){
        // prefer Take Loan only if cash < 10000
        if(c.name === 'Take Loan' && player.cash < 10000){
          playActionCard(player, i);
          i--;
          player.actionsPlayed++;
        } else if(c.name.includes('Renovate') && player.properties.length>0){
          playActionCard(player, i);
          i--;
          player.actionsPlayed++;
        } else if(c.name.includes('Rent Increase')){
          playActionCard(player, i);
          i--;
          player.actionsPlayed++;
        } else {
          // maybe keep it
        }
      } else if(c.type === 'event'){
        // events usually auto-resolve on play; play if harmless
        playEventCard(player, i);
        i--;
        player.actionsPlayed++;
      }
    }
    // ensure hand cap
    while(player.hand.length > MAX_HAND){
      const dropped = player.hand.pop();
      state.discard.push(dropped);
      log(`${player.name} discarded a card due to hand limit.`);
    }

    // end AI turn after small delay
    setTimeout(() => {
      player.actionsPlayed = 0;
      advanceTurn();
    }, 600);
  }

  // Play card handlers
  function humanPlayCard(player, handIndex) {
    const card = player.hand[handIndex];
    if(!card) return;
    if(state.players[state.currentPlayerIndex] !== player) {
      alert('Not your turn');
      return;
    }
    if(state.playCountThisTurn >= 2) {
      alert('You can play at most 2 cards per turn.');
      return;
    }

    if(card.type === 'property'){
      // show modal confirm buy
      showModal(`${card.name}`, `Buy this property for $${card.price * (player.discount || 1)}? Rent: $${card.rent}`, [
        {label: 'Buy', onClick: () => { buyProperty(player, handIndex); hideModal(); }},
        {label: 'Skip', onClick: ()=>hideModal()}
      ]);
    } else if(card.type === 'action'){
      // apply playFn
      playActionCard(player, handIndex);
    } else if(card.type === 'event'){
      playEventCard(player, handIndex);
    } else {
      // other
      state.discard.push(player.hand.splice(handIndex,1)[0]);
    }
  }

  function buyProperty(player, handIndex) {
    const card = player.hand[handIndex];
    const price = Math.round(card.price * (player.discount || 1));
    if(player.cash >= price){
      player.cash -= price;
      const prop = {
        name: card.name,
        value: card.price,
        rent: card.rent,
        originalPrice: card.price
      };
      player.properties.push(prop);
      state.discard.push(player.hand.splice(handIndex,1)[0]);
      log(`${player.name} bought ${prop.name} for $${formatNum(price)}.`);
      state.playCountThisTurn++;
      renderAll();
    } else {
      // offer to take loan
      showModal('Insufficient Cash', `You don't have $${formatNum(price)}. Take a $30,000 loan to cover?`, [
        {label:'Take Loan & Buy', onClick: () => { player.cash += 30000; player.debt += 30000; buyProperty(player, handIndex); hideModal(); }},
        {label:'Cancel', onClick: ()=>hideModal()}
      ]);
    }
  }

  // Play card handlers (override to use registry)
  function playActionCard(player, handIndex) {
    const card = player.hand[handIndex];
    if(!card) return;
    try {
      // priority: explicit playFn, then registry by id, then effect/playFn on card if present
      if(card.playFn) {
        card.playFn(state, player);
      } else if(card.id && CardEffects[card.id]) {
        CardEffects[card.id](state, player);
      } else if(card.effectFn) {
        card.effectFn(state, player);
      } else {
        console.warn('No action function for card', card);
      }
    } catch (e) {
      console.error('Error running action', e);
    }
    state.discard.push(player.hand.splice(handIndex,1)[0]);
    state.playCountThisTurn++;
    renderAll();
  }

  function playEventCard(player, handIndex) {
    const card = player.hand[handIndex];
    if(!card) return;
    try {
      if(card.effectFn) {
        card.effectFn(state, player);
      } else if(card.id && CardEffects[card.id]) {
        CardEffects[card.id](state, player);
      } else {
        console.warn('No event function for card', card);
      }
    } catch(e){
      console.error('Event error', e);
    }
    state.discard.push(player.hand.splice(handIndex,1)[0]);
    state.playCountThisTurn++;
    renderAll();
  }

  // Modal helpers
  function showModal(title, text, choices = []) {
    DOM.modalTitle.textContent = title;
    DOM.modalText.textContent = text;
    DOM.modalChoices.innerHTML = '';
    choices.forEach(c => {
      const b = document.createElement('button');
      b.textContent = c.label;
      b.onclick = c.onClick;
      DOM.modalChoices.appendChild(b);
    });
    if(choices.length === 0){
      DOM.modalOk.style.display = 'inline-block';
      DOM.modalOk.onclick = hideModal;
    } else {
      DOM.modalOk.style.display = 'none';
    }
    DOM.cardModal.classList.remove('hidden');
  }

  function hideModal() {
    DOM.cardModal.classList.add('hidden');
  }

  // End turn and round logic
  function advanceTurn() {
    // end-of-turn housekeeping for current player
    const cp = state.players[state.currentPlayerIndex];
    cp.actionsPlayed = 0;
    state.currentPlayerIndex++;
    if(state.currentPlayerIndex >= state.players.length){
      // end of round
      state.currentPlayerIndex = 0;
      endOfRound();
    }
    renderAll();
    if(!state.gameOver) startTurn();
  }

  function endOfRound() {
    log(`--- End of Round ${state.round} ---`);
    // Rent collection unless rentFreeze set
    if(state.rentFreeze){
      log('Rent freeze active — no rent collected this round.');
      state.rentFreeze = 0; // only lasts one round
    } else {
      state.players.forEach(p => {
        let total = 0;
        p.properties.forEach(pr => {
          total += Math.round(pr.rent * (state.rentBoost || 1));
        });
        p.cash += total;
        if(total > 0) log(`${p.name} collected $${formatNum(total)} rent.`);
      });
    }
    // reset rentBoost
    state.rentBoost = 1;

    // market phase every N rounds
    if(state.round % state.crisisEvery === 0){
      // pick a random crisis card from discard or from deck (we'll draw until we hit a crisis)
      let crisis = null;
      // search deck for crisis
      for(let i = state.deck.length-1; i>=0; i--){
        if(state.deck[i].type === 'crisis'){
          crisis = state.deck.splice(i,1)[0];
          break;
        }
      }
      if(!crisis){
        // search discard
        for(let i = state.discard.length-1; i>=0; i--){
          if(state.discard[i].type === 'crisis'){
            crisis = state.discard.splice(i,1)[0];
            break;
          }
        }
      }
      if(crisis){
        log(`--- Market Phase: ${crisis.name} ---`);
        // prefer registry effect
        if(crisis.id && CardEffects[crisis.id]) {
          CardEffects[crisis.id](state, /*no player*/);
        }
        // fallback to crisis.applyFn if present
        else if(crisis.applyFn) {
          crisis.applyFn(state);
        }
      } else {
        log('Market Phase: no crisis card found.');
      }
    }

    // eliminate bankrupt players
    state.players.forEach(p => {
      if(p.cash < -50000){
        p.eliminated = true;
        log(`${p.name} is bankrupt and eliminated.`);
      }
    });

    state.round++;
    if(state.round > state.roundMax){
      finishGame();
    }
  }

  function finishGame() {
    state.gameOver = true;
    const standings = [...state.players].sort((a,b)=> netWorth(b)-netWorth(a));
    const winner = standings[0];
    DOM.resultTitle.textContent = `Game Over — Winner: ${winner.name}`;
    let body = `<p>Final standings:</p><ol>`;
    standings.forEach(p => {
      body += `<li>${p.name} — Net Worth: $${formatNum(netWorth(p))} | Cash: $${formatNum(p.cash)} | Debt: $${formatNum(p.debt)} | Properties: ${p.properties.length}</li>`;
    });
    body += `</ol>`;
    DOM.resultBody.innerHTML = body;
    DOM.resultModal.classList.remove('hidden');
    log('Game ended. Check results.');
  }

  function checkGameOver() {
    // if only one not eliminated left -> finish
    const alive = state.players.filter(p => !p.eliminated);
    if(alive.length <= 1 && !state.gameOver){
      finishGame();
    }
  }

  // Buttons & bindings
  function bindUI(){
    DOM.startBtn.onclick = () => {
      const pc = parseInt(DOM.playerCount.value,10);
      const rounds = clamp(parseInt(DOM.roundCount.value,10)||12, 6, 24);
      hideAllScreens();
      DOM.play.classList.add('active');
      newGame(pc, rounds);
    };
    DOM.rulesBtn.onclick = () => { hideAllScreens(); DOM.rules.classList.add('active'); };
    DOM.backBtns.forEach(b => b.addEventListener('click', () => { hideAllScreens(); DOM.menu.classList.add('active'); }));
    DOM.drawBtn.onclick = () => {
      const cp = state.players[state.currentPlayerIndex];
      if(cp.hand.length >= MAX_HAND) { alert('Hand full. Play or discard first.'); return; }
      dealTo(cp);
      log(`${cp.name} drew a card.`);
      renderAll();
    };
    DOM.endTurnBtn.onclick = () => {
      advanceTurn();
    };
    DOM.pauseBtn.onclick = () => {
      hideAllScreens();
      DOM.menu.classList.add('active');
    };
    DOM.modalOk.onclick = hideModal;
    DOM.playAgainBtn.onclick = () => {
      hideAllScreens();
      DOM.menu.classList.add('active');
      DOM.resultModal.classList.add('hidden');
    };
    DOM.backToMenuBtn.onclick = () => {
      hideAllScreens();
      DOM.menu.classList.add('active');
      DOM.resultModal.classList.add('hidden');
    };
  }

  function hideAllScreens() {
    DOM.menu.classList.remove('active');
    DOM.play.classList.remove('active');
    DOM.rules.classList.remove('active');
  }

  // start
  bindUI();
  hideAllScreens();
  DOM.menu.classList.add('active');

  // Expose small helpers for debugging if needed
  window._hic = {
    state, newGame, log, renderAll
  };
})();
