/**
 * Kamisado Move Logic
 *
 * Pure function — takes a GameState, returns a new GameState.
 * All updates use immutable spread patterns; the input state is never mutated.
 *
 * Rules implemented:
 *   M6 (Forfeit): if the forced piece has no moves, the turn reverts to the
 *       opponent whose next forced color is the cell color UNDER the trapped piece.
 *   M8 (Loop / repetition loss): if a (board + turn) position recurs in the last
 *       HISTORY_LIMIT moves, the player who caused the loop immediately loses.
 */

import { Player, GameStatus, BOARD_COLORS, BOARD_SIZE, type KamisadoColor } from '../constants/gameConstants';
import type { GameState, BoardState } from './gameState';
import type { BoardPosition } from './moveValidator';
import { isDeadlocked } from './moveValidator';
import { getStrategy } from './scoringLogic';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Number of past state-hashes retained for M8 loop detection. */
const HISTORY_LIMIT = 10;

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

/**
 * Produces a compact, unique string identifying the (board, turn) pair.
 * Used for M8 repetition detection.
 *
 * Format: {turnChar}{64 cells × 3 chars}
 *   turnChar  : 'B' (Black to move) | 'W' (White to move)
 *   cell      : '...' (empty) | {playerChar}{colorSlice2}
 *     playerChar : 'b' | 'w'
 *     colorSlice2: first 2 chars of KamisadoColor enum string (all are unique)
 */
const computeStateHash = (board: BoardState, turn: Player): string => {
  let h = turn === Player.Black ? 'B' : 'W';
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      const p = board[r][c];
      if (p === null) {
        h += '...';
      } else {
        h += (p.player === Player.Black ? 'b' : 'w') + p.color.slice(0, 2);
      }
    }
  }
  return h;
};

// ---------------------------------------------------------------------------
// handleDeadlock  (Rule M6)
// ---------------------------------------------------------------------------

/**
 * Resolves a forfeit state and returns a new GameState that allows play to continue.
 *
 * Called when the player whose turn it is has no legal moves for their forced piece.
 *
 * Rule M6 resolution:
 *   1. The turn reverts to the opponent (the player who just moved).
 *   2. activeColor is set to the board color of the cell the trapped piece
 *      currently occupies — this forces the opponent to move the piece whose
 *      color matches that cell (i.e. the piece "on top of" the blocked piece's square).
 *
 * If the blocked piece cannot be located (degenerate state), the current
 * activeColor is preserved as a safe fallback and a warning is emitted.
 */
export const handleDeadlock = (gameState: GameState): GameState => {
  const { turn, activeColor } = gameState;

  // A deadlock cannot occur before the first move (activeColor is null then).
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

  // M6: next forced color = color of the cell where the trapped piece sits.
  const forfeitColor = BOARD_COLORS[blockedPiecePos.row][blockedPiecePos.col];

  const candidateState: GameState = {
    ...gameState,                          // inherits moveHistory from caller
    turn:            opponent(turn),       // revert to the player who just moved
    activeColor:     forfeitColor,         // M6: forced onto the cell color under the blocked piece
    selectedPiece:   null,
    status:          GameStatus.Active,
    isDeadlocked:    true,
    deadlockedPiece: blockedPiecePos,
  };

  // Double-forfeit: if the opponent is also stuck → draw
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
 * Guards:
 *   - Forced-color check (step 0): piece must match activeColor when set.
 *   - M8 loop detection (step 3b): if the resulting (board, turn) was seen in
 *     the last HISTORY_LIMIT states, the moving player immediately loses.
 *
 * Post-move forfeit (M6) is resolved immediately via handleDeadlock so the
 * returned state is always ready for the next player to act.
 */
export const makeMove = (
  gameState: GameState,
  from: BoardPosition,
  to: BoardPosition,
): GameState => {
  const { board, turn, activeColor } = gameState;
  const piece = board[from.row][from.col];

  // --- 0. Forced-color guard ---
  if (activeColor !== null && piece !== null && piece.color !== activeColor) {
    console.error(
      `[Kamisado] makeMove: illegal move — ${turn} tried to move ${piece.color} piece ` +
      `but forcedColor is ${activeColor}. Move blocked.`,
    );
    return gameState;
  }

  // --- 1. Build the new board (immutable row replacement) ---
  const newBoard = board.map((row, rIdx) => {
    if (rIdx !== from.row && rIdx !== to.row) return row;

    return row.map((cell, cIdx) => {
      if (rIdx === from.row && cIdx === from.col) return null;
      if (rIdx === to.row   && cIdx === to.col)   return piece;
      return cell;
    });
  });

  // --- 2. Derive next activeColor from the destination cell's board color ---
  const nextActiveColor = BOARD_COLORS[to.row][to.col];
  const nextTurn        = opponent(turn);

  // --- 3a. Update move history ---
  const nextHash   = computeStateHash(newBoard as BoardState, nextTurn);
  const newHistory = [
    ...gameState.moveHistory.slice(-(HISTORY_LIMIT - 1)),
    nextHash,
  ] as string[];

  // --- 3b. M8 loop detection: if this position was seen before, mover loses ---
  if (gameState.moveHistory.includes(nextHash)) {
    return {
      board:           newBoard as GameState['board'],
      turn:            nextTurn,
      activeColor:     nextActiveColor,
      selectedPiece:   null,
      // The player who caused the loop loses.
      status:          turn === Player.White ? GameStatus.WonPlayer2 : GameStatus.WonPlayer1,
      isDeadlocked:    false,
      deadlockedPiece: null,
      moveHistory:     newHistory,
      gameMode:        gameState.gameMode,
      matchScore:      gameState.matchScore,
      roundNumber:     gameState.roundNumber,
    };
  }

  // --- 4. Check win condition — delegate to the active scoring strategy ---
  if (isWinningMove(turn, to.row)) {
    const postMoveState: GameState = {
      board:           newBoard as GameState['board'],
      turn:            nextTurn,
      activeColor:     nextActiveColor,
      selectedPiece:   null,
      status:          GameStatus.Active,  // strategy will set the real status
      isDeadlocked:    false,
      deadlockedPiece: null,
      moveHistory:     newHistory,
      gameMode:        gameState.gameMode,
      matchScore:      gameState.matchScore,
      roundNumber:     gameState.roundNumber,
    };
    return getStrategy(gameState.gameMode).handleRoundEnd(postMoveState, turn);
  }

  // --- 5. Build candidate next state ---
  const nextState: GameState = {
    board:           newBoard as GameState['board'],
    turn:            nextTurn,
    activeColor:     nextActiveColor,
    selectedPiece:   null,
    status:          GameStatus.Active,
    isDeadlocked:    false,
    deadlockedPiece: null,
    moveHistory:     newHistory,
    gameMode:        gameState.gameMode,
    matchScore:      gameState.matchScore,
    roundNumber:     gameState.roundNumber,
  };

  // --- 6. Resolve forfeit (M6) immediately so the state is always actionable ---
  if (isDeadlocked(nextState)) {
    return handleDeadlock(nextState);
  }

  return nextState;
};
