// src/adversarial.js

export const ACTIONS = ['attack', 'defend', 'potion'];

export class BattleState {
  constructor({
    playerHp = 100,
    npcHp = 100,
    playerPotions = 2,
    npcPotions = 2,
    playerDefending = false,
    npcDefending = false,
    turn = 'npc'
  } = {}) {
    this.playerHp = Math.max(0, playerHp);
    this.npcHp = Math.max(0, npcHp);
    this.playerPotions = Math.max(0, playerPotions);
    this.npcPotions = Math.max(0, npcPotions);
    this.playerDefending = playerDefending;
    this.npcDefending = npcDefending;
    this.turn = turn; // 'npc' (MAX) atau 'player' (MIN)
  }

  isTerminal() {
    return this.playerHp <= 0 || this.npcHp <= 0;
  }

  getTerminalUtility() {
    if (this.npcHp > 0 && this.playerHp <= 0) return 1000;  // NPC Menang
    if (this.npcHp <= 0 && this.playerHp > 0) return -1000; // Player Menang
    return 0; // Seri
  }

  evaluate(evalType = 'balanced') {
    if (this.isTerminal()) {
      return this.getTerminalUtility();
    }

    const hpDiff = this.npcHp - this.playerHp;
    const potionDiff = (this.npcPotions - this.playerPotions) * 15;

    if (evalType === 'aggressive') {
      return (100 - this.playerHp) * 2.5 + this.npcHp * 1.0;
    } else if (evalType === 'defensive') {
      return this.npcHp * 2.5 - this.playerHp * 1.0 + potionDiff;
    }
    // Balanced
    return hpDiff * 1.5 + potionDiff;
  }

  getAvailableActions(role) {
    const actions = ['attack', 'defend'];
    const potions = role === 'npc' ? this.npcPotions : this.playerPotions;
    if (potions > 0) {
      actions.push('potion');
    }
    return actions;
  }

  applyAction(action, role, { damageMultiplier = 1.0 } = {}) {
    const next = new BattleState({
      playerHp: this.playerHp,
      npcHp: this.npcHp,
      playerPotions: this.playerPotions,
      npcPotions: this.npcPotions,
      playerDefending: role === 'player' ? false : this.playerDefending,
      npcDefending: role === 'npc' ? false : this.npcDefending,
      turn: role === 'npc' ? 'player' : 'npc'
    });

    const baseDamage = 20 * damageMultiplier;
    const healAmount = 25;

    if (role === 'npc') {
      if (action === 'attack') {
        const damage = next.playerDefending ? Math.floor(baseDamage * 0.4) : baseDamage;
        next.playerHp = Math.max(0, next.playerHp - damage);
        next.playerDefending = false;
      } else if (action === 'defend') {
        next.npcDefending = true;
      } else if (action === 'potion' && next.npcPotions > 0) {
        next.npcHp = Math.min(100, next.npcHp + healAmount);
        next.npcPotions--;
      }
    } else {
      if (action === 'attack') {
        const damage = next.npcDefending ? Math.floor(baseDamage * 0.4) : baseDamage;
        next.npcHp = Math.max(0, next.npcHp - damage);
        next.npcDefending = false;
      } else if (action === 'defend') {
        next.playerDefending = true;
      } else if (action === 'potion' && next.playerPotions > 0) {
        next.playerHp = Math.min(100, next.playerHp + healAmount);
        next.playerPotions--;
      }
    }
    return next;
  }
}

export class AdversarialSolver {
  constructor(options = {}) {
    this.maxDepth = options.maxDepth || 4;
    this.algorithm = options.algorithm || 'alphabeta'; // 'minimax' | 'alphabeta' | 'expectimax'
    this.evalType = options.evalType || 'balanced';
    this.actionOrdering = options.actionOrdering || 'default'; // 'default' | 'optimal' | 'reverse'
    this.nodeCount = 0;
    this.actionScores = {};
  }

  sortActions(actions) {
    const priority = { attack: 3, potion: 2, defend: 1 };
    if (this.actionOrdering === 'optimal') {
      return [...actions].sort((a, b) => priority[b] - priority[a]);
    } else if (this.actionOrdering === 'reverse') {
      return [...actions].sort((a, b) => priority[a] - priority[b]);
    }
    return actions;
  }

  solve(state) {
    this.nodeCount = 0;
    this.actionScores = {};

    let bestAction = null;
    let bestScore = -Infinity;
    let alpha = -Infinity;
    let beta = Infinity;

    const availableActions = this.sortActions(state.getAvailableActions('npc'));

    for (const action of availableActions) {
      let score;
      if (this.algorithm === 'expectimax') {
        // Chance node evaluasi untuk attack (80% normal, 20% critical 1.5x)
        if (action === 'attack') {
          const sNormal = state.applyAction(action, 'npc', { damageMultiplier: 1.0 });
          const sCrit = state.applyAction(action, 'npc', { damageMultiplier: 1.5 });
          const vNormal = this.expectimax(sNormal, this.maxDepth - 1, false);
          const vCrit = this.expectimax(sCrit, this.maxDepth - 1, false);
          score = 0.8 * vNormal + 0.2 * vCrit;
        } else {
          const nextState = state.applyAction(action, 'npc');
          score = this.expectimax(nextState, this.maxDepth - 1, false);
        }
      } else if (this.algorithm === 'alphabeta') {
        const nextState = state.applyAction(action, 'npc');
        score = this.alphaBeta(nextState, this.maxDepth - 1, alpha, beta, false);
        alpha = Math.max(alpha, score);
      } else {
        const nextState = state.applyAction(action, 'npc');
        score = this.minimax(nextState, this.maxDepth - 1, false);
      }

      this.actionScores[action] = score;

      if (score > bestScore) {
        bestScore = score;
        bestAction = action;
      }
    }

    return {
      bestAction: bestAction || availableActions[0],
      bestScore,
      actionScores: this.actionScores,
      nodeCount: this.nodeCount
    };
  }

  minimax(state, depth, isMaximizing) {
    this.nodeCount++;
    if (depth === 0 || state.isTerminal()) {
      return state.evaluate(this.evalType);
    }

    if (isMaximizing) {
      let maxEval = -Infinity;
      for (const action of this.sortActions(state.getAvailableActions('npc'))) {
        const next = state.applyAction(action, 'npc');
        maxEval = Math.max(maxEval, this.minimax(next, depth - 1, false));
      }
      return maxEval;
    } else {
      let minEval = Infinity;
      for (const action of this.sortActions(state.getAvailableActions('player'))) {
        const next = state.applyAction(action, 'player');
        minEval = Math.min(minEval, this.minimax(next, depth - 1, true));
      }
      return minEval;
    }
  }

  alphaBeta(state, depth, alpha, beta, isMaximizing) {
    this.nodeCount++;
    if (depth === 0 || state.isTerminal()) {
      return state.evaluate(this.evalType);
    }

    if (isMaximizing) {
      let maxEval = -Infinity;
      for (const action of this.sortActions(state.getAvailableActions('npc'))) {
        const next = state.applyAction(action, 'npc');
        const evalScore = this.alphaBeta(next, depth - 1, alpha, beta, false);
        maxEval = Math.max(maxEval, evalScore);
        alpha = Math.max(alpha, evalScore);
        if (alpha >= beta) break; // Pruning
      }
      return maxEval;
    } else {
      let minEval = Infinity;
      for (const action of this.sortActions(state.getAvailableActions('player'))) {
        const next = state.applyAction(action, 'player');
        const evalScore = this.alphaBeta(next, depth - 1, alpha, beta, true);
        minEval = Math.min(minEval, evalScore);
        beta = Math.min(beta, evalScore);
        if (alpha >= beta) break; // Pruning
      }
      return minEval;
    }
  }

  expectimax(state, depth, isMaximizing) {
    this.nodeCount++;
    if (depth === 0 || state.isTerminal()) {
      return state.evaluate(this.evalType);
    }

    if (isMaximizing) {
      let maxEval = -Infinity;
      for (const action of this.sortActions(state.getAvailableActions('npc'))) {
        const next = state.applyAction(action, 'npc');
        maxEval = Math.max(maxEval, this.expectimax(next, depth - 1, false));
      }
      return maxEval;
    } else {
      // Chance layer asumsi player memilih aksi dengan peluang seragam
      const actions = state.getAvailableActions('player');
      let expectedVal = 0;
      for (const action of actions) {
        const next = state.applyAction(action, 'player');
        expectedVal += this.expectimax(next, depth - 1, true) / actions.length;
      }
      return expectedVal;
    }
  }
}