/**
 * Kamisado Scoring Logic — Strategy Pattern
 *
 * IRoundStrategy.handleRoundEnd is called by makeMove whenever a player lands on
 * the opponent's home rank. Each implementation decides whether to:
 *   a) end the match outright (SingleGameStrategy, or when a target is reached), or
 *   b) update the score and start a fresh board for the next round.
 *
 * Round-start convention: the loser of each round moves first in the next round
 * (standard Kamisado tournament rule).
 */

import { Player, GameStatus, GameMode } from '../constants/gameConstants';
import type { GameState } from './gameState';
import { createInitialGameState } from './gameState';

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

/** First to this many round-wins takes the match. */
const DEFAULT_MATCH_TARGET = 3;

/**
 * Points per round equal the round number (round 1 = 1 pt, round 2 = 2 pts …).
 * First player to accumulate this many points wins the marathon.
 */
const DEFAULT_MARATHON_TARGET = 10;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const opponent = (p: Player): Player =>
  p === Player.Black ? Player.White : Player.Black;

/**
 * Resets the board for a new round, carrying over match metadata.
 * The loser (opponent of winner) moves first in the next round.
 */
const startNextRound = (state: GameState, winner: Player): GameState => {
  const fresh = createInitialGameState();
  return {
    ...fresh,
    gameMode:    state.gameMode,
    matchScore:  state.matchScore,   // caller has already incremented
    roundNumber: state.roundNumber + 1,
    turn:        opponent(winner),   // loser moves first
  };
};

// ---------------------------------------------------------------------------
// Interface
// ---------------------------------------------------------------------------

export interface IRoundStrategy {
  /**
   * Called when `winner` has just reached the opponent's home rank.
   * `state` is the post-move state with the new board (status still Active).
   * Returns the fully-resolved next GameState.
   */
  handleRoundEnd(state: GameState, winner: Player): GameState;
}

// ---------------------------------------------------------------------------
// SingleGameStrategy
// ---------------------------------------------------------------------------

/**
 * Default: one game, no series. A back-rank landing immediately ends everything.
 */
export class SingleGameStrategy implements IRoundStrategy {
  handleRoundEnd(state: GameState, winner: Player): GameState {
    return {
      ...state,
      status:          winner === Player.White ? GameStatus.WonPlayer1 : GameStatus.WonPlayer2,
      isDeadlocked:    false,
      deadlockedPiece: null,
    };
  }
}

// ---------------------------------------------------------------------------
// MatchStrategy  (LongGameStrategy / best-of-N)
// ---------------------------------------------------------------------------

/**
 * Best-of-N-rounds series. Each round win adds 1 point.
 * First player to reach `target` wins the match.
 */
export class MatchStrategy implements IRoundStrategy {
  private readonly target: number;

  constructor(target: number = DEFAULT_MATCH_TARGET) {
    this.target = target;
  }

  handleRoundEnd(state: GameState, winner: Player): GameState {
    const newScore = {
      p1: state.matchScore.p1 + (winner === Player.White ? 1 : 0),
      p2: state.matchScore.p2 + (winner === Player.Black ? 1 : 0),
    };

    if (newScore.p1 >= this.target || newScore.p2 >= this.target) {
      return {
        ...state,
        matchScore:      newScore,
        status:          winner === Player.White ? GameStatus.WonPlayer1 : GameStatus.WonPlayer2,
        isDeadlocked:    false,
        deadlockedPiece: null,
      };
    }

    return startNextRound({ ...state, matchScore: newScore }, winner);
  }
}

// ---------------------------------------------------------------------------
// MarathonStrategy  (point accumulation)
// ---------------------------------------------------------------------------

/**
 * Rounds yield increasing points (round N is worth N points).
 * First player to accumulate `target` total points wins.
 */
export class MarathonStrategy implements IRoundStrategy {
  private readonly target: number;

  constructor(target: number = DEFAULT_MARATHON_TARGET) {
    this.target = target;
  }

  handleRoundEnd(state: GameState, winner: Player): GameState {
    const points = state.roundNumber;          // escalating value
    const newScore = {
      p1: state.matchScore.p1 + (winner === Player.White ? points : 0),
      p2: state.matchScore.p2 + (winner === Player.Black ? points : 0),
    };

    const matchWinner = newScore.p1 >= this.target
      ? Player.White
      : newScore.p2 >= this.target
        ? Player.Black
        : null;

    if (matchWinner !== null) {
      return {
        ...state,
        matchScore:      newScore,
        status:          matchWinner === Player.White ? GameStatus.WonPlayer1 : GameStatus.WonPlayer2,
        isDeadlocked:    false,
        deadlockedPiece: null,
      };
    }

    return startNextRound({ ...state, matchScore: newScore }, winner);
  }
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/** Returns the correct strategy instance for the given game mode. */
export const getStrategy = (mode: GameMode): IRoundStrategy => {
  switch (mode) {
    case GameMode.Single:   return new SingleGameStrategy();
    case GameMode.Match:    return new MatchStrategy();
    case GameMode.Marathon: return new MarathonStrategy();
  }
};
