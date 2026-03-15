/**
 * AI Greedy Win Logic — Jest Test Suite
 *
 * Verifies that findBestMove returns the immediate winning move without
 * requiring full minimax depth. Tests both back-rank wins (piece lands on
 * opponent's home rank) and correct win-status mapping for each player.
 *
 * Board coordinate system:
 *   row 0 = Black's home rank (top)
 *   row 7 = White's home rank (bottom)
 *   Black wins by landing on row 7.
 *   White wins by landing on row 0.
 */

import {
  Player,
  GameStatus,
  GameMode,
  KamisadoColor,
  BOARD_SIZE,
  BoardVariant,
  BOARD_CONFIGS,
} from '../../constants/gameConstants';
import type { GameState, BoardState } from '../gameState';
import { findBestMove } from '../aiEngine';
import { describe, test, expect } from '@jest/globals';

// ---------------------------------------------------------------------------
// Helpers (mirrors gameLogic.test.ts)
// ---------------------------------------------------------------------------

const emptyBoard = (): null[][] =>
  Array.from({ length: BOARD_SIZE }, () => Array<null>(BOARD_SIZE).fill(null));

const makeState = (overrides: Partial<GameState> & { board: BoardState }): GameState => ({
  turn:            Player.Black,
  activeColor:     null,
  selectedPiece:   null,
  status:          GameStatus.Active,
  isDeadlocked:    false,
  deadlockedPiece: null,
  moveHistory:     [],
  gameMode:        GameMode.Single,
  matchScore:      { p1: 0, p2: 0 },
  roundNumber:     1,
  boardConfig:     BOARD_CONFIGS[BoardVariant.Standard],
  ...overrides,
});

// ---------------------------------------------------------------------------
// 1. Black wins immediately (back-rank — row 7)
// ---------------------------------------------------------------------------

describe('Greedy Win — Black AI', () => {
  test('returns the back-rank move at depth 1', () => {
    // Black Purple piece at (6,0); one step to (7,0) or (7,1) = instant win.
    // White Orange piece at (0,7) — present but nowhere near the winning path.
    const board = emptyBoard() as BoardState;
    board[6][0] = { player: Player.Black, color: KamisadoColor.Purple };
    board[0][7] = { player: Player.White, color: KamisadoColor.Orange };

    const state = makeState({
      board,
      turn:        Player.Black,
      activeColor: KamisadoColor.Purple,  // forced to move the Purple piece
    });

    const move = findBestMove(state, 1, Player.Black);

    expect(move).not.toBeNull();
    expect(move!.to.row).toBe(7); // must land on White's home rank
  });

  test('returns the back-rank move even at depth 6 (no false negative)', () => {
    const board = emptyBoard() as BoardState;
    board[6][3] = { player: Player.Black, color: KamisadoColor.Yellow };
    board[0][4] = { player: Player.White, color: KamisadoColor.Yellow };

    // Black Yellow piece at (6,3) can move straight to (7,3) = win.
    const state = makeState({
      board,
      turn:        Player.Black,
      activeColor: KamisadoColor.Yellow,
    });

    const move = findBestMove(state, 6, Player.Black);

    expect(move).not.toBeNull();
    expect(move!.to.row).toBe(7);
  });
});

// ---------------------------------------------------------------------------
// 2. White wins immediately (back-rank — row 0)
// ---------------------------------------------------------------------------

describe('Greedy Win — White AI', () => {
  test('returns the back-rank move for White (row 0)', () => {
    // White Red piece at (1,5) — BOARD_COLORS[1][5] = Yellow, but piece color
    // is arbitrary for movement; what matters is activeColor matching the piece.
    // Use KamisadoColor.Red so activeColor = Red forces this piece to move.
    const board = emptyBoard() as BoardState;
    board[1][0] = { player: Player.White, color: KamisadoColor.Red };
    board[7][7] = { player: Player.Black, color: KamisadoColor.Orange };

    // White Red piece at (1,0) can step straight to (0,0) or diagonally to (0,1).
    const state = makeState({
      board,
      turn:        Player.White,
      activeColor: KamisadoColor.Red,
    });

    const move = findBestMove(state, 1, Player.White);

    expect(move).not.toBeNull();
    expect(move!.to.row).toBe(0); // must land on Black's home rank
  });
});
