/**
 * Kamisado Game State
 *
 * activeColor: After each move, this is set to the color of the destination cell.
 * The OPPONENT must then move the piece whose color matches activeColor.
 * null = game start — the first player (Black) may move any of their pieces freely.
 *
 * boardConfig: Embeds the active board configuration (8×8 Standard or 10×10 Mega)
 * so that all engine functions can read size, colors, and rule constraints from state
 * without importing module-level singletons.
 */

import {
  type Piece,
  type KamisadoColor,
  Player,
  GameStatus,
  GameMode,
  BoardVariant,
  type BoardConfig,
  BOARD_CONFIGS,
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
  /**
   * Compact hashes of the last N (board + turn) states after each real piece move.
   * Used to detect M8 repetition loops — if the same position recurs the mover loses.
   */
  readonly moveHistory:      readonly string[];

  // --- Scoring ---
  /** Which scoring variant is being played. */
  readonly gameMode:    GameMode;
  /** Running score: p1 = White (Player1), p2 = Black (Player2). */
  readonly matchScore:  { readonly p1: number; readonly p2: number };
  /** Starts at 1; increments each time a new round begins (Match mode only). */
  readonly roundNumber: number;

  // --- Board variant ---
  /** Active board configuration — drives size, color grid, and rule variants. */
  readonly boardConfig: BoardConfig;
}

// ---------------------------------------------------------------------------
// Initial State
// ---------------------------------------------------------------------------

const buildEmptyBoard = (size: number): (Piece | null)[][] =>
  Array.from({ length: size }, () => Array<Piece | null>(size).fill(null));

/**
 * Factory for the canonical starting state.
 *
 * Pieces are placed on the home rows using the board config's color grid,
 * so layout always stays in sync with the cell colors — a single source of truth.
 *
 * @param variant - Defaults to Standard (8×8). Pass Mega for the 10×10 board.
 */
export const createInitialGameState = (
  variant: BoardVariant = BoardVariant.Standard,
): GameState => {
  const config = BOARD_CONFIGS[variant];
  const board  = buildEmptyBoard(config.size);

  for (let col = 0; col < config.size; col++) {
    // Black: home row 0, piece color matches cell color
    board[0][col] = { color: config.colors[0][col], player: Player.Black };
    // White: home row (size-1), piece color matches cell color
    board[config.size - 1][col] = { color: config.colors[config.size - 1][col], player: Player.White };
  }

  return {
    board:            board as BoardState,
    turn:             Player.White, // White (PLAYER1) always moves first
    activeColor:      null,         // Free choice on the opening move
    selectedPiece:    null,
    status:           GameStatus.Active,
    isDeadlocked:     false,
    deadlockedPiece:  null,
    moveHistory:      [],
    gameMode:         GameMode.Single,
    matchScore:       { p1: 0, p2: 0 },
    roundNumber:      1,
    boardConfig:      config,
  };
};

/** Canonical starting state (Standard 8×8). Treat as immutable. */
export const initialGameState: GameState = createInitialGameState();

/** Returns a brand-new initial GameState for the given variant. */
export const resetGame = (variant: BoardVariant = BoardVariant.Standard): GameState =>
  createInitialGameState(variant);
