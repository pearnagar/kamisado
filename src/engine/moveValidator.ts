/**
 * Kamisado Move Validator
 *
 * Pure logic — no side effects, no UI concerns.
 *
 * DEADLOCK RULE: If the mandatory piece (activeColor) has zero legal moves, the
 * current player cannot move. Per Kamisado rules the OPPONENT then moves again
 * (effectively skipping this player's turn). The engine calling this module is
 * responsible for detecting a zero-legal-moves result and applying that rule.
 * Infinite mutual deadlock (both players blocked) is theoretically possible but
 * extremely rare; if detected, the game is a draw.
 *
 * MEGASADO RULE: On the 10×10 board, a piece may travel at most 7 squares in
 * any single move (straight or diagonal). This cap is read from boardConfig.maxMoveDist.
 */

import { Player, BoardVariant, BOARD_CONFIGS, type BoardConfig } from '../constants/gameConstants';
import type { BoardState, GameState } from './gameState';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface BoardPosition {
  readonly row: number;
  readonly col: number;
}

export interface PieceMoves {
  readonly from:  BoardPosition;
  readonly moves: readonly BoardPosition[];
}

// ---------------------------------------------------------------------------
// Direction helpers
// ---------------------------------------------------------------------------

/** The three forward directions for each player, expressed as [dRow, dCol]. */
const DIRECTIONS: Record<Player, readonly [number, number][]> = {
  // Black sits at row 0 and advances toward row N-1 (increasing row index)
  [Player.Black]: [[1, 0], [1, -1], [1, 1]],
  // White sits at row N-1 and advances toward row 0 (decreasing row index)
  [Player.White]: [[-1, 0], [-1, -1], [-1, 1]],
};

const inBounds = (row: number, col: number, size: number): boolean =>
  row >= 0 && row <= size - 1 && col >= 0 && col <= size - 1;

// Fallback config used when getLegalMoves is called without an explicit config
// (e.g. from test helpers that pre-date the Mega variant).
const DEFAULT_CONFIG: BoardConfig = BOARD_CONFIGS[BoardVariant.Standard];

// ---------------------------------------------------------------------------
// 1. getLegalMoves
// ---------------------------------------------------------------------------

/**
 * Returns all legal destination squares for the piece at [row, col].
 *
 * A piece slides any number of squares in one of its three forward directions.
 * It stops immediately before an occupied square and cannot jump over pieces.
 * Landing on an occupied square is also illegal (no captures in Kamisado).
 *
 * @param config - Board configuration (size + optional maxMoveDist cap).
 *                 Defaults to the Standard 8×8 config for backwards compatibility.
 */
export const getLegalMoves = (
  board:  BoardState,
  row:    number,
  col:    number,
  config: BoardConfig = DEFAULT_CONFIG,
): readonly BoardPosition[] => {
  const piece = board[row]?.[col];
  if (piece === null || piece === undefined) return [];

  const directions = DIRECTIONS[piece.player];
  const legal: BoardPosition[] = [];

  for (const [dRow, dCol] of directions) {
    let r     = row + dRow;
    let c     = col + dCol;
    let steps = 0;

    while (inBounds(r, c, config.size)) {
      if (config.maxMoveDist !== null && steps >= config.maxMoveDist) break;
      if (board[r][c] !== null) break; // blocked — stop before this square
      legal.push({ row: r, col: c });
      r += dRow;
      c += dCol;
      steps++;
    }
  }

  return legal;
};

// ---------------------------------------------------------------------------
// 2. getAvailablePieces
// ---------------------------------------------------------------------------

/**
 * Returns the position(s) of piece(s) the current player is allowed to move.
 *
 * - activeColor === null (opening move): all pieces belonging to the current player.
 * - activeColor is set: only the single piece whose color matches activeColor.
 *   If that piece doesn't exist on the board (shouldn't happen in a valid game),
 *   returns an empty array — the caller should treat this as a deadlock.
 */
export const getAvailablePieces = (gameState: GameState): readonly BoardPosition[] => {
  const { board, turn, activeColor, boardConfig } = gameState;
  const available: BoardPosition[] = [];

  for (let row = 0; row < boardConfig.size; row++) {
    for (let col = 0; col < boardConfig.size; col++) {
      const piece = board[row][col];
      if (piece === null || piece.player !== turn) continue;

      if (activeColor === null || piece.color === activeColor) {
        available.push({ row, col });
      }
    }
  }

  return available;
};

// ---------------------------------------------------------------------------
// 3. getAllValidMovesForCurrentTurn
// ---------------------------------------------------------------------------

/**
 * Combines getAvailablePieces + getLegalMoves for every eligible piece.
 *
 * Returns one entry per movable piece, each containing its position and the
 * list of legal destination squares. Pieces with zero legal moves are included
 * so the caller can detect deadlock (all entries have empty `moves` arrays).
 */
export const getAllValidMovesForCurrentTurn = (
  gameState: GameState,
): readonly PieceMoves[] => {
  const available = getAvailablePieces(gameState);

  return available.map((from) => ({
    from,
    moves: getLegalMoves(gameState.board, from.row, from.col, gameState.boardConfig),
  }));
};

// ---------------------------------------------------------------------------
// 4. Deadlock detection helper
// ---------------------------------------------------------------------------

/**
 * Returns true if the current player has no legal moves at all.
 * The engine should respond by passing the turn back to the opponent
 * and preserving the same activeColor (the opponent's last move color).
 */
export const isDeadlocked = (gameState: GameState): boolean =>
  getAllValidMovesForCurrentTurn(gameState).every(({ moves }) => moves.length === 0);
