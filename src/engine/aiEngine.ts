/**
 * Kamisado AI Engine — Minimax with Alpha-Beta Pruning
 *
 * Pure functions — no side effects, no UI concerns.
 *
 * Evaluation heuristics:
 *   - Advancement: pieces closer to the opponent's home rank score higher.
 *   - Mobility: pieces with more legal moves score higher.
 *   - Terminal states: +/-Infinity for win/loss, 0 for draw.
 *
 * Usage:
 *   const move = findBestMove(gameState, 4, Player.Black);
 *   // move is null only when the current player has no legal moves (should not
 *   // occur in a valid, non-terminal state handed to the AI).
 */

import { Player, GameStatus, BOARD_SIZE } from '../constants/gameConstants';
import type { GameState } from './gameState';
import type { BoardPosition } from './moveValidator';
import { getLegalMoves, getAvailablePieces } from './moveValidator';
import { makeMove } from './moveLogic';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AiMove {
  readonly from: BoardPosition;
  readonly to:   BoardPosition;
}

// ---------------------------------------------------------------------------
// Weights
// ---------------------------------------------------------------------------

/** Points awarded per row of advancement toward the opponent's home rank. */
const ADVANCE_WEIGHT  = 10;
/** Points awarded per legal move available to a piece (mobility). */
const MOBILITY_WEIGHT = 1;
/**
 * Bonus applied when one player has just been forfeited (M6).
 * `state.isDeadlocked === true` signals this — the player recorded in
 * `state.turn` is the one who gets the extra move (their opponent was forfeited).
 */
const FORFEIT_BONUS   = 20;

// ---------------------------------------------------------------------------
// 1. evaluateBoard
// ---------------------------------------------------------------------------

/**
 * Static evaluation of `state` from `aiPlayer`'s perspective.
 *
 * Returns:
 *   +Infinity  — aiPlayer has won
 *   -Infinity  — aiPlayer has lost
 *        0     — draw
 *   <integer>  — heuristic score (positive = better for aiPlayer)
 *
 * The `aiPlayer` parameter is accepted so this function can be reused for
 * both sides without inversion; pass `Player.Black` or `Player.White`.
 */
export const evaluateBoard = (state: GameState, aiPlayer: Player): number => {
  // --- Terminal states ---
  if (state.status === GameStatus.WonPlayer1) {
    // WonPlayer1 = White wins
    return aiPlayer === Player.White ? Infinity : -Infinity;
  }
  if (state.status === GameStatus.WonPlayer2) {
    // WonPlayer2 = Black wins
    return aiPlayer === Player.Black ? Infinity : -Infinity;
  }
  if (state.status === GameStatus.Draw) {
    return 0;
  }

  // --- Forfeit bonus (M6): one player lost their turn ---
  // state.turn is the player who gets to move again after the forfeit.
  let score = 0;
  if (state.isDeadlocked) {
    score += state.turn === aiPlayer ? FORFEIT_BONUS : -FORFEIT_BONUS;
  }

  // --- Heuristic: sum over all pieces on the board ---

  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      const piece = state.board[row][col];
      if (piece === null) continue;

      // Advancement: Black moves toward row 7; White moves toward row 0.
      const advancement =
        piece.player === Player.Black ? row : BOARD_SIZE - 1 - row;

      const mobility = getLegalMoves(state.board, row, col).length;

      const pieceScore = advancement * ADVANCE_WEIGHT + mobility * MOBILITY_WEIGHT;

      if (piece.player === aiPlayer) {
        score += pieceScore;
      } else {
        score -= pieceScore;
      }
    }
  }

  return score;
};

// ---------------------------------------------------------------------------
// 2. minimax (internal)
// ---------------------------------------------------------------------------

/**
 * Minimax with alpha-beta pruning.
 *
 * @param state        - Current game state to evaluate.
 * @param depth        - Remaining search depth (plies). Leaf at depth === 0.
 * @param alpha        - Best score the maximiser can guarantee (start: -Infinity).
 * @param beta         - Best score the minimiser can guarantee (start: +Infinity).
 * @param aiPlayer     - The player the AI is playing as (perspective for eval).
 * @returns Heuristic score from aiPlayer's perspective.
 */
const minimax = (
  state:     GameState,
  depth:     number,
  alpha:     number,
  beta:      number,
  aiPlayer:  Player,
): number => {
  // Base case: depth limit or terminal state
  if (depth === 0 || state.status !== GameStatus.Active) {
    return evaluateBoard(state, aiPlayer);
  }

  const available = getAvailablePieces(state);

  // Guard: no available pieces while still active (degenerate state)
  if (available.length === 0) {
    return evaluateBoard(state, aiPlayer);
  }

  const isMaximising = state.turn === aiPlayer;

  if (isMaximising) {
    let best = -Infinity;

    outer: for (const from of available) {
      const moves = getLegalMoves(state.board, from.row, from.col);
      for (const to of moves) {
        const next  = makeMove(state, from, to);
        const score = minimax(next, depth - 1, alpha, beta, aiPlayer);
        if (score > best) best = score;
        if (score > alpha) alpha = score;
        if (beta <= alpha) break outer; // beta cut-off
      }
    }

    // No legal moves found for the maximiser — treat as terminal
    return best === -Infinity ? evaluateBoard(state, aiPlayer) : best;
  } else {
    let best = Infinity;

    outer: for (const from of available) {
      const moves = getLegalMoves(state.board, from.row, from.col);
      for (const to of moves) {
        const next  = makeMove(state, from, to);
        const score = minimax(next, depth - 1, alpha, beta, aiPlayer);
        if (score < best) best = score;
        if (score < beta) beta = score;
        if (beta <= alpha) break outer; // alpha cut-off
      }
    }

    return best === Infinity ? evaluateBoard(state, aiPlayer) : best;
  }
};

// ---------------------------------------------------------------------------
// 3. findBestMove
// ---------------------------------------------------------------------------

/**
 * Finds the best move for the current player in `state`.
 *
 * Iterates over all legal moves of the available piece(s), calls minimax on
 * each resulting state, and returns the move that yields the highest score
 * from `aiPlayer`'s perspective.
 *
 * @param state    - Current game state (should have `status === Active` and
 *                   `state.turn === aiPlayer`).
 * @param depth    - Search depth in half-moves (plies). 4–6 recommended.
 * @param aiPlayer - The player the AI controls.
 * @returns Best `{from, to}` move, or `null` if no moves are available.
 */
export const findBestMove = (
  state:    GameState,
  depth:    number,
  aiPlayer: Player,
): AiMove | null => {
  const available = getAvailablePieces(state);
  
  let bestScore = -Infinity;
  let candidates: AiMove[] = [];

  for (const from of available) {
    // יצירת עותק של המהלכים וערבוב שלו
    const rawMoves = getLegalMoves(state.board, from.row, from.col);
    const moves = [...rawMoves].sort(() => Math.random() - 0.5);

    if (__DEV__) {
      console.log(`[AI Debug] Piece at [${from.row},${from.col}] has ${moves.length} legal moves.`);
    }

    for (const to of moves) {
      const next  = makeMove(state, from, to);
      const score = minimax(next, depth - 1, -Infinity, Infinity, aiPlayer);

      if (score > bestScore) {
        bestScore = score;
        candidates = [{ from, to }];
      } else if (score === bestScore) {
        candidates.push({ from, to });
      }
    }
  }

  if (candidates.length === 0) return null;
  
  // בחירה רנדומלית מתוך המהלכים הטובים ביותר
  const randomIndex = Math.floor(Math.random() * candidates.length);
  const selectedMove = candidates[randomIndex];

  if (__DEV__) {
    console.log(`[AI Debug] Best score: ${bestScore}. Chose move to [${selectedMove.to.row},${selectedMove.to.col}] from ${candidates.length} options.`);
  }

  return selectedMove;
};
