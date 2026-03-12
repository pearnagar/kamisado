/**
 * Kamisado Move Logic
 *
 * Pure function — takes a GameState, returns a new GameState.
 * All updates use immutable spread patterns; the input state is never mutated.
 */

import { Player, GameStatus, BOARD_COLORS, BOARD_SIZE, type KamisadoColor } from '../constants/gameConstants';
import type { GameState } from './gameState';
import type { BoardPosition } from './moveValidator';
import { isDeadlocked } from './moveValidator';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const opponent = (player: Player): Player =>
  player === Player.Black ? Player.White : Player.Black;

/** Black wins by reaching row BOARD_SIZE-1; White wins by reaching row 0. */
const isWinningMove = (player: Player, toRow: number): boolean =>
  (player === Player.Black && toRow === BOARD_SIZE - 1) ||
  (player === Player.White && toRow === 0);

/**
 * Finds the board position of the piece matching `color` for `player`.
 * Returns null if the piece is not on the board (should not occur in a valid game).
 */
const findPiecePosition = (
  gameState: GameState,
  player: Player,
  color: KamisadoColor,
): BoardPosition | null => {
  const { board } = gameState;
  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      const piece = board[row][col];
      if (piece !== null && piece.player === player && piece.color === color) {
        return { row, col };
      }
    }
  }
  return null;
};

// ---------------------------------------------------------------------------
// handleDeadlock
// ---------------------------------------------------------------------------

/**
 * Resolves a deadlock state and returns a new GameState that allows play to continue.
 *
 * Called when the player whose turn it is has no legal moves for their mandatory piece.
 *
 * Resolution (per Kamisado rules):
 *   1. The turn reverts to the opponent (the player who just moved).
 *   2. activeColor is set to the board color of the cell the blocked piece
 *      is currently standing on — this locks the opponent onto the piece that
 *      corresponds to the blocked piece's standing cell color.
 *
 * If the blocked piece cannot be located (degenerate state), the current
 * activeColor is preserved as a safe fallback and a warning is emitted.
 */
export const handleDeadlock = (gameState: GameState): GameState => {
  const { turn, activeColor } = gameState;

  // The blocked player must have an activeColor — null only on the opening move
  // and a deadlock cannot occur before the first move is made.
  if (activeColor === null) return gameState;

  const blockedPiecePos = findPiecePosition(gameState, turn, activeColor);

  if (blockedPiecePos === null) {
    console.warn(
      `[Kamisado] handleDeadlock: could not locate ${turn}'s ${activeColor} piece. ` +
      `Preserving current activeColor as fallback.`,
    );
    return {
      ...gameState,
      turn:            opponent(turn),
      selectedPiece:   null,
      status:          GameStatus.Active,
      isDeadlocked:    false,
      deadlockedPiece: null,
    };
  }

  // The new activeColor is the board color of the square the blocked piece stands on.
  const newActiveColor = BOARD_COLORS[blockedPiecePos.row][blockedPiecePos.col];

  const candidateState: GameState = {
    ...gameState,
    turn:            opponent(turn),   // revert to the player who just moved
    activeColor:     newActiveColor,   // lock them onto the cell color under the blocked piece
    selectedPiece:   null,
    status:          GameStatus.Active,
    isDeadlocked:    true,
    deadlockedPiece: blockedPiecePos,
  };

  // Double-deadlock: if the opponent is also stuck → draw (no banner, game ends)
  if (isDeadlocked(candidateState)) {
    return { ...candidateState, status: GameStatus.Draw, isDeadlocked: false, deadlockedPiece: null };
  }

  return candidateState;
};

// ---------------------------------------------------------------------------
// makeMove
// ---------------------------------------------------------------------------

/**
 * Applies a validated move and returns the resulting GameState.
 *
 * Assumes the caller has already verified the move is legal via moveValidator.
 * No validation is performed here — makeMove is a pure state transition.
 *
 * Post-move deadlock is resolved immediately via handleDeadlock so the
 * returned state is always ready for the next player to act.
 */
export const makeMove = (
  gameState: GameState,
  from: BoardPosition,
  to: BoardPosition,
): GameState => {
  const { board, turn } = gameState;
  const piece = board[from.row][from.col];

  // --- 1. Build the new board (immutable row replacement) ---
  const newBoard = board.map((row, rIdx) => {
    if (rIdx !== from.row && rIdx !== to.row) return row;

    // Both from and to may be on the same row — handle in one pass
    return row.map((cell, cIdx) => {
      if (rIdx === from.row && cIdx === from.col) return null;
      if (rIdx === to.row   && cIdx === to.col)   return piece;
      return cell;
    });
  });

  // --- 2. Derive next activeColor from the destination cell's board color ---
  const nextActiveColor = BOARD_COLORS[to.row][to.col];

  // --- 3. Check win condition before switching turn ---
  if (isWinningMove(turn, to.row)) {
    return {
      board:           newBoard as GameState['board'],
      turn:            opponent(turn),
      activeColor:     nextActiveColor,
      selectedPiece:   null,
      status:          turn === Player.White ? GameStatus.WonPlayer1 : GameStatus.WonPlayer2,
      isDeadlocked:    false,
      deadlockedPiece: null,
    };
  }

  // --- 4. Build candidate next state (opponent's turn) ---
  const nextState: GameState = {
    board:           newBoard as GameState['board'],
    turn:            opponent(turn),
    activeColor:     nextActiveColor,
    selectedPiece:   null,
    status:          GameStatus.Active,
    isDeadlocked:    false,
    deadlockedPiece: null,
  };

  // --- 5. Resolve deadlock immediately so the state is always actionable ---
  if (isDeadlocked(nextState)) {
    return handleDeadlock(nextState);
  }

  return nextState;
};
