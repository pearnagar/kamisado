/**
 * debug_sim.ts — Kamisado engine smoke test
 *
 * Initialises a game, makes 2 legal moves, and prints each state.
 * Run with:  npx ts-node src/debug_sim.ts
 *
 * Move sequence:
 *   1. Black: Orange [0,0] → [5,0]  (straight forward 5 squares)
 *      Lands on Purple cell → White must move their Purple piece next.
 *   2. White: Purple [7,2] → [2,2]  (straight forward 5 squares)
 *      Lands on Orange cell → Black must move their Orange piece next.
 */

import { BOARD_COLORS, COLOR_KANJI } from './constants/gameConstants';
import { createInitialGameState } from './engine/gameState';
import { makeMove } from './engine/moveLogic';
import { getLegalMoves } from './engine/moveValidator';

// ---------------------------------------------------------------------------
// Pretty-print helpers
// ---------------------------------------------------------------------------

const RESET  = '\x1b[0m';
const BOLD   = '\x1b[1m';
const CYAN   = '\x1b[36m';
const YELLOW = '\x1b[33m';
const GREEN  = '\x1b[32m';

const header = (label: string): void =>
  console.log(`\n${BOLD}${CYAN}${'─'.repeat(60)}${RESET}\n${BOLD}${label}${RESET}`);

const printBoard = (board: ReturnType<typeof createInitialGameState>['board']): void => {
  console.log('\n     c0   c1   c2   c3   c4   c5   c6   c7');
  for (let r = 0; r < 8; r++) {
    const cells = board[r].map((piece) => {
      if (piece === null) return '  . ';
      const initial = piece.player === 'Black' ? 'B' : 'W';
      return ` ${initial}${COLOR_KANJI[piece.color]} `;
    });
    console.log(`r${r} [${cells.join('|')}]`);
  }
};

const printState = (
  label: string,
  state: ReturnType<typeof createInitialGameState>,
): void => {
  header(label);
  printBoard(state.board);
  console.log(`\n  turn       : ${YELLOW}${state.turn}${RESET}`);
  console.log(`  activeColor: ${state.activeColor ?? GREEN + 'null (free choice)' + RESET}`);
  console.log(`  status     : ${state.status}`);
};

// ---------------------------------------------------------------------------
// Simulation
// ---------------------------------------------------------------------------

let state = createInitialGameState();
printState('INITIAL STATE', state);

// --- Move 1: Black Orange [0,0] → [5,0] ---
const move1From = { row: 0, col: 0 };
const move1To   = { row: 5, col: 0 };

const legal1 = getLegalMoves(state.board, move1From.row, move1From.col);
console.log(`\n${BOLD}Legal moves for Black Orange at [0,0]:${RESET}`, legal1);

state = makeMove(state, move1From, move1To);
printState(
  `AFTER MOVE 1 — Black: Orange [0,0] → [5,0]  (lands on ${BOARD_COLORS[5][0]} cell)`,
  state,
);

// --- Move 2: White Purple [7,2] → [2,2] ---
const move2From = { row: 7, col: 2 };
const move2To   = { row: 2, col: 2 };

const legal2 = getLegalMoves(state.board, move2From.row, move2From.col);
console.log(`\n${BOLD}Legal moves for White Purple at [7,2]:${RESET}`, legal2);

state = makeMove(state, move2From, move2To);
printState(
  `AFTER MOVE 2 — White: Purple [7,2] → [2,2]  (lands on ${BOARD_COLORS[2][2]} cell)`,
  state,
);

console.log(`\n${BOLD}${GREEN}Simulation complete. Engine is operational.${RESET}\n`);
