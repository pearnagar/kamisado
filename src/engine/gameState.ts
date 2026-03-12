/**
 * Kamisado Game State
 *
 * activeColor: After each move, this is set to the color of the destination cell.
 * The OPPONENT must then move the piece whose color matches activeColor.
 * null = game start — the first player (Black) may move any of their pieces freely.
 */

import {
  type Piece,
  type KamisadoColor,
  Player,
  GameStatus,
  BOARD_SIZE,
  INITIAL_PIECES_POSITION,
} from '../constants/gameConstants';

// ---------------------------------------------------------------------------
// Board
// ---------------------------------------------------------------------------

/** Each cell holds a Piece or is empty. [row][col], row 0 = Black's home rank. */
export type BoardState = Readonly<(Piece | null)[][]>;

// ---------------------------------------------------------------------------
// Game State
// ---------------------------------------------------------------------------

export interface GameState {
  readonly board:         BoardState;
  readonly turn:          Player;
  /**
   * The color that the current player MUST move this turn.
   * Determined by the color of the cell where the previous move landed.
   * null only at game start — White moves any piece freely on the first turn.
   */
  readonly activeColor:   KamisadoColor | null;
  /** UI-only: the [row, col] of the piece the current player has tapped/selected. */
  readonly selectedPiece: { readonly row: number; readonly col: number } | null;
  readonly status:        GameStatus;
  /** True for exactly one state transition after a single-player deadlock, so the UI can animate and notify. */
  readonly isDeadlocked:     boolean;
  /** Position of the piece that was blocked. Set alongside isDeadlocked; null otherwise. */
  readonly deadlockedPiece:  { readonly row: number; readonly col: number } | null;
}

// ---------------------------------------------------------------------------
// Initial State
// ---------------------------------------------------------------------------

const buildEmptyBoard = (): (Piece | null)[][] =>
  Array.from({ length: BOARD_SIZE }, () => Array<Piece | null>(BOARD_SIZE).fill(null));

/**
 * Factory for the canonical starting state.
 * Pieces are placed using INITIAL_PIECES_POSITION so layout stays in sync
 * with BOARD_COLORS — a single source of truth.
 */
export const createInitialGameState = (): GameState => {
  const board = buildEmptyBoard();

  for (const { piece, row, col } of INITIAL_PIECES_POSITION) {
    board[row][col] = piece;
  }

  return {
    board:            board as BoardState,
    turn:             Player.White, // White (PLAYER1) always moves first
    activeColor:      null,         // Free choice on the opening move
    selectedPiece:    null,
    status:           GameStatus.Active,
    isDeadlocked:     false,
    deadlockedPiece:  null,
  };
};

/** Canonical starting state — treat as immutable; call createInitialGameState() for a fresh copy. */
export const initialGameState: GameState = createInitialGameState();

/** Returns a brand-new initial GameState. Call this to restart the game. */
export const resetGame = (): GameState => createInitialGameState();
