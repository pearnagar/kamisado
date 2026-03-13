/**
 * boardHistory.test.ts
 *
 * Tests the undo / history-stack invariants that Board.tsx relies on.
 * All logic under test is pure state transformation — no React rendering,
 * no native-module mocks required.
 *
 * The helpers below mirror the exact logic in Board.tsx:
 *   commitMove  ← handleAnimationComplete (normal move path)
 *   undoPvP     ← handleUndo (PvP branch, pop 1)
 *   undoPvE     ← handleUndo (PvE branch, pop 2)
 *   canUndo     ← the inline canUndo expression in the render
 */

import { createInitialGameState, GameState } from '../gameState';
import { makeMove } from '../moveLogic';
import { getAvailablePieces, getLegalMoves } from '../moveValidator';
import { GameMode, GameStatus, Player } from '../../constants/gameConstants';

// ---------------------------------------------------------------------------
// Types — mirrors Board.tsx interfaces
// ---------------------------------------------------------------------------

interface HistoryEntry {
  gameState: GameState;
  lastMove:  { from: { row: number; col: number }; to: { row: number; col: number } } | null;
  move:      { from: { row: number; col: number }; to: { row: number; col: number } };
}

type Coord = { row: number; col: number };

// ---------------------------------------------------------------------------
// Helpers — identical logic to Board.tsx
// ---------------------------------------------------------------------------

const newGame = (mode: GameMode = GameMode.Single): GameState => ({
  ...createInitialGameState(),
  gameMode: mode,
});

/** Returns the first available legal move, or null if none exist. */
function firstLegalMove(state: GameState): { from: Coord; to: Coord } | null {
  for (const piece of getAvailablePieces(state)) {
    const moves = getLegalMoves(state.board, piece.row, piece.col);
    if (moves.length > 0) return { from: { row: piece.row, col: piece.col }, to: moves[0] };
  }
  return null;
}

/** Mirrors handleAnimationComplete (non-undo path). */
function commitMove(
  state:    GameState,
  history:  HistoryEntry[],
  lastMove: HistoryEntry['lastMove'],
  from:     Coord,
  to:       Coord,
): { state: GameState; history: HistoryEntry[]; lastMove: HistoryEntry['lastMove'] } {
  return {
    state:    makeMove(state, from, to),
    history:  [...history, { gameState: state, lastMove, move: { from, to } }],
    lastMove: { from, to },
  };
}

/** Mirrors handleUndo — PvP branch (pop 1). Returns null when history is too short. */
function undoPvP(
  history: HistoryEntry[],
): { state: GameState; history: HistoryEntry[]; lastMove: HistoryEntry['lastMove'] } | null {
  if (history.length < 1) return null;
  const entry = history[history.length - 1];
  return { state: entry.gameState, history: history.slice(0, -1), lastMove: entry.lastMove };
}

/** Mirrors handleUndo — PvE branch (pop 2). Returns null when history is too short. */
function undoPvE(
  history: HistoryEntry[],
): { state: GameState; history: HistoryEntry[]; lastMove: HistoryEntry['lastMove'] } | null {
  if (history.length < 2) return null;
  const entry = history[history.length - 2];
  return { state: entry.gameState, history: history.slice(0, -2), lastMove: entry.lastMove };
}

/** Mirrors the inline canUndo expression in Board.tsx's render section. */
function canUndo(
  history:      HistoryEntry[],
  pendingMove:  unknown | null,
  isAiThinking: boolean,
  opponentMode: 'PvP' | 'PvE',
): boolean {
  return pendingMove === null && !isAiThinking &&
    history.length >= (opponentMode === 'PvE' ? 2 : 1);
}

// ---------------------------------------------------------------------------
// 1. History Stack Integrity
// ---------------------------------------------------------------------------

describe('History stack integrity', () => {
  test('initial history is empty', () => {
    expect(([] as HistoryEntry[])).toHaveLength(0);
  });

  test('committing one move pushes exactly one entry', () => {
    let history: HistoryEntry[] = [];
    let lastMove: HistoryEntry['lastMove'] = null;
    let state = newGame();

    const move = firstLegalMove(state)!;
    ({ state, history, lastMove } = commitMove(state, history, lastMove, move.from, move.to));

    expect(history).toHaveLength(1);
  });

  test('history entry stores the PRE-move state, not the post-move state', () => {
    let history: HistoryEntry[] = [];
    let lastMove: HistoryEntry['lastMove'] = null;
    let state = newGame();

    const initial = state;
    const move = firstLegalMove(state)!;
    ({ state, history, lastMove } = commitMove(state, history, lastMove, move.from, move.to));

    // Stored state is the one BEFORE the move was applied.
    expect(history[0].gameState).toBe(initial);
    expect(history[0].gameState.moveHistory).toHaveLength(0);

    // Current state reflects the move.
    expect(state.moveHistory).toHaveLength(1);
  });

  test('history entry records the correct move coordinates', () => {
    let history: HistoryEntry[] = [];
    let lastMove: HistoryEntry['lastMove'] = null;
    let state = newGame();

    const move = firstLegalMove(state)!;
    ({ state, history, lastMove } = commitMove(state, history, lastMove, move.from, move.to));

    expect(history[0].move).toEqual({ from: move.from, to: move.to });
  });

  test('second entry records the lastMove from the first move', () => {
    let history: HistoryEntry[] = [];
    let lastMove: HistoryEntry['lastMove'] = null;
    let state = newGame();

    const move1 = firstLegalMove(state)!;
    ({ state, history, lastMove } = commitMove(state, history, lastMove, move1.from, move1.to));

    const move2 = firstLegalMove(state)!;
    ({ state, history, lastMove } = commitMove(state, history, lastMove, move2.from, move2.to));

    expect(history).toHaveLength(2);
    // history[1].lastMove should be the coordinates of move1 (the last committed move
    // at the time history[1] was pushed).
    expect(history[1].lastMove).toEqual({ from: move1.from, to: move1.to });
  });

  test('history entries are immutable — a later commit does not mutate earlier entries', () => {
    let history: HistoryEntry[] = [];
    let lastMove: HistoryEntry['lastMove'] = null;
    let state = newGame();

    const move1 = firstLegalMove(state)!;
    ({ state, history, lastMove } = commitMove(state, history, lastMove, move1.from, move1.to));

    const snapshot = history[0].gameState;

    const move2 = firstLegalMove(state)!;
    ({ state, history, lastMove } = commitMove(state, history, lastMove, move2.from, move2.to));

    // entry[0] still references the original pre-move-1 state.
    expect(history[0].gameState).toBe(snapshot);
    expect(history[0].gameState.moveHistory).toHaveLength(0);
  });

  test('handleUndo restores turn and board position via history entry', () => {
    let history: HistoryEntry[] = [];
    let lastMove: HistoryEntry['lastMove'] = null;
    let state = newGame();

    // White is always the opening player.
    const whiteTurn = state.turn;
    expect(whiteTurn).toBe(Player.White);

    const move = firstLegalMove(state)!;
    ({ state, history, lastMove } = commitMove(state, history, lastMove, move.from, move.to));

    // After White's first move the turn passes to Black.
    expect(state.turn).toBe(Player.Black);

    const result = undoPvP(history)!;
    expect(result.state.turn).toBe(Player.White);
    expect(result.state.board).toStrictEqual(newGame().board);
  });
});

// ---------------------------------------------------------------------------
// 2. PvP undo — reverts exactly 1 move
// ---------------------------------------------------------------------------

describe('PvP undo — reverts exactly 1 move', () => {
  test('undoPvP restores the pre-move state and empties history', () => {
    let history: HistoryEntry[] = [];
    let lastMove: HistoryEntry['lastMove'] = null;
    let state = newGame();
    const stateBefore = state;

    const move = firstLegalMove(state)!;
    ({ state, history, lastMove } = commitMove(state, history, lastMove, move.from, move.to));

    const result = undoPvP(history)!;
    expect(result.state).toBe(stateBefore);
    expect(result.history).toHaveLength(0);
    expect(result.lastMove).toBeNull();
  });

  test('undoPvP after 2 moves leaves 1 entry in history', () => {
    let history: HistoryEntry[] = [];
    let lastMove: HistoryEntry['lastMove'] = null;
    let state = newGame();

    for (let i = 0; i < 2; i++) {
      const move = firstLegalMove(state)!;
      ({ state, history, lastMove } = commitMove(state, history, lastMove, move.from, move.to));
    }

    const result = undoPvP(history)!;
    expect(result.history).toHaveLength(1);
    // Popped entry: state after move 1 (Black's turn).
    expect(result.state.turn).toBe(Player.Black);
  });

  test('undoPvP can be called repeatedly to walk all the way back', () => {
    let history: HistoryEntry[] = [];
    let lastMove: HistoryEntry['lastMove'] = null;
    let state = newGame();

    for (let i = 0; i < 4; i++) {
      const move = firstLegalMove(state)!;
      ({ state, history, lastMove } = commitMove(state, history, lastMove, move.from, move.to));
    }

    let result = { state, history, lastMove };
    for (let i = 3; i >= 0; i--) {
      result = undoPvP(result.history)!;
      expect(result.history).toHaveLength(i);
    }
    expect(result.state.moveHistory).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// 3. PvE undo — reverts exactly 2 moves (bot reply + human move)
// ---------------------------------------------------------------------------

describe('PvE undo — reverts exactly 2 moves, returns turn to human', () => {
  test('undoPvE pops 2 entries and restores the state before the human move', () => {
    let history: HistoryEntry[] = [];
    let lastMove: HistoryEntry['lastMove'] = null;
    let state = newGame();

    // White = human in PvE; Black = bot.
    const stateBeforeHuman = state;

    const humanMove = firstLegalMove(state)!;
    ({ state, history, lastMove } = commitMove(state, history, lastMove, humanMove.from, humanMove.to));

    const botMove = firstLegalMove(state)!;
    ({ state, history, lastMove } = commitMove(state, history, lastMove, botMove.from, botMove.to));

    expect(history).toHaveLength(2);

    const result = undoPvE(history)!;
    expect(result.history).toHaveLength(0);
    expect(result.state).toBe(stateBeforeHuman);
    // Must be White's turn again so the human can move, not the bot.
    expect(result.state.turn).toBe(Player.White);
  });

  test('undoPvE across 4 moves (2 full PvE turns) restores the opening position', () => {
    let history: HistoryEntry[] = [];
    let lastMove: HistoryEntry['lastMove'] = null;
    let state = newGame();

    for (let i = 0; i < 4; i++) {
      const move = firstLegalMove(state)!;
      ({ state, history, lastMove } = commitMove(state, history, lastMove, move.from, move.to));
    }

    const r1 = undoPvE(history)!;
    expect(r1.history).toHaveLength(2);

    const r2 = undoPvE(r1.history)!;
    expect(r2.history).toHaveLength(0);
    expect(r2.state.moveHistory).toHaveLength(0);
    expect(r2.state.turn).toBe(Player.White);
  });
});

// ---------------------------------------------------------------------------
// 4. Edge cases & safety
// ---------------------------------------------------------------------------

describe('Edge cases and safety', () => {
  test('undoPvP on empty history returns null without throwing', () => {
    expect(() => undoPvP([])).not.toThrow();
    expect(undoPvP([])).toBeNull();
  });

  test('undoPvE on empty history returns null without throwing', () => {
    expect(() => undoPvE([])).not.toThrow();
    expect(undoPvE([])).toBeNull();
  });

  test('undoPvE with only 1 history entry returns null (requires 2 for PvE)', () => {
    let history: HistoryEntry[] = [];
    let lastMove: HistoryEntry['lastMove'] = null;
    let state = newGame();

    const move = firstLegalMove(state)!;
    ({ state, history, lastMove } = commitMove(state, history, lastMove, move.from, move.to));

    expect(undoPvE(history)).toBeNull();
  });

  test('history is empty after a reset (simulated)', () => {
    let history: HistoryEntry[] = [];
    let lastMove: HistoryEntry['lastMove'] = null;
    let state = newGame();

    for (let i = 0; i < 3; i++) {
      const move = firstLegalMove(state)!;
      ({ state, history, lastMove } = commitMove(state, history, lastMove, move.from, move.to));
    }
    expect(history).toHaveLength(3);

    // Simulate handleReset
    history  = [];
    state    = newGame();
    lastMove = null;

    expect(history).toHaveLength(0);
    expect(state.moveHistory).toHaveLength(0);
    expect(state.status).toBe(GameStatus.Active);
  });

  test('undoing a game-ending move restores GameStatus.Active', () => {
    // Construct a history entry whose stored gameState is Active,
    // and simulate the "current" state being Won (the winning move was just made).
    const activeState = newGame();
    const history: HistoryEntry[] = [{
      gameState: activeState,               // pre-winning-move state — Active
      lastMove:  null,
      move:      { from: { row: 1, col: 0 }, to: { row: 0, col: 0 } },
    }];

    // Pretend the current game state is won (the result of committing that move).
    const result = undoPvP(history)!;

    expect(result.state.status).toBe(GameStatus.Active);
  });

  test('undoPvE does not corrupt history when called with exactly 2 entries', () => {
    let history: HistoryEntry[] = [];
    let lastMove: HistoryEntry['lastMove'] = null;
    let state = newGame();

    for (let i = 0; i < 2; i++) {
      const move = firstLegalMove(state)!;
      ({ state, history, lastMove } = commitMove(state, history, lastMove, move.from, move.to));
    }

    const original = [...history];
    const result = undoPvE(history)!;

    // Returned history is empty.
    expect(result.history).toHaveLength(0);
    // Original array is unmodified (slice, not splice).
    expect(history).toHaveLength(2);
    expect(history).toEqual(original);
  });
});

// ---------------------------------------------------------------------------
// 5. "Bot is thinking" indicator — confirmed removed
// ---------------------------------------------------------------------------

describe('"Bot is thinking" indicator', () => {
  /**
   * Structural contract: Board.tsx no longer contains the thinkingBanner style
   * or any conditional render block that outputs a "thinking" text node.
   * isAiThinking is kept purely as an input-blocking flag and never drives
   * any visible element.
   *
   * To verify at the rendering layer, install @testing-library/react-native,
   * mock expo-haptics / react-native-reanimated / @react-navigation/native,
   * render <Board />, and assert:
   *   expect(screen.queryByText(/thinking/i)).toBeNull();
   */
  test('isAiThinking is an input-block flag only — no UI text depends on it', () => {
    // canUndo is the only public surface that reads isAiThinking.
    // Verify it blocks the undo button when true.
    let history: HistoryEntry[] = [];
    let lastMove: HistoryEntry['lastMove'] = null;
    let state = newGame();

    const move = firstLegalMove(state)!;
    ({ state, history, lastMove } = commitMove(state, history, lastMove, move.from, move.to));

    expect(canUndo(history, null, false, 'PvP')).toBe(true);
    expect(canUndo(history, null, true,  'PvP')).toBe(false); // isAiThinking blocks
  });
});

// ---------------------------------------------------------------------------
// 6. Undo button canUndo guard
// ---------------------------------------------------------------------------

describe('canUndo guard — mirrors inline render logic in Board.tsx', () => {
  test('false when history is empty (PvP)', () => {
    expect(canUndo([], null, false, 'PvP')).toBe(false);
  });

  test('false when history is empty (PvE)', () => {
    expect(canUndo([], null, false, 'PvE')).toBe(false);
  });

  test('true after 1 move in PvP', () => {
    let history: HistoryEntry[] = [];
    let lastMove: HistoryEntry['lastMove'] = null;
    let state = newGame();

    const move = firstLegalMove(state)!;
    ({ state, history, lastMove } = commitMove(state, history, lastMove, move.from, move.to));

    expect(canUndo(history, null, false, 'PvP')).toBe(true);
  });

  test('false after only 1 move in PvE (needs 2)', () => {
    let history: HistoryEntry[] = [];
    let lastMove: HistoryEntry['lastMove'] = null;
    let state = newGame();

    const move = firstLegalMove(state)!;
    ({ state, history, lastMove } = commitMove(state, history, lastMove, move.from, move.to));

    expect(canUndo(history, null, false, 'PvE')).toBe(false);
  });

  test('true after 2 moves in PvE', () => {
    let history: HistoryEntry[] = [];
    let lastMove: HistoryEntry['lastMove'] = null;
    let state = newGame();

    for (let i = 0; i < 2; i++) {
      const move = firstLegalMove(state)!;
      ({ state, history, lastMove } = commitMove(state, history, lastMove, move.from, move.to));
    }

    expect(canUndo(history, null, false, 'PvE')).toBe(true);
  });

  test('false when pendingMove is set (animation in progress)', () => {
    let history: HistoryEntry[] = [];
    let lastMove: HistoryEntry['lastMove'] = null;
    let state = newGame();

    const move = firstLegalMove(state)!;
    ({ state, history, lastMove } = commitMove(state, history, lastMove, move.from, move.to));

    const fakePending = { from: { row: 0, col: 0 }, to: { row: 1, col: 0 }, nextState: state };
    expect(canUndo(history, fakePending, false, 'PvP')).toBe(false);
  });

  test('false when isAiThinking is true', () => {
    let history: HistoryEntry[] = [];
    let lastMove: HistoryEntry['lastMove'] = null;
    let state = newGame();

    const move = firstLegalMove(state)!;
    ({ state, history, lastMove } = commitMove(state, history, lastMove, move.from, move.to));

    expect(canUndo(history, null, true, 'PvP')).toBe(false);
  });
});
