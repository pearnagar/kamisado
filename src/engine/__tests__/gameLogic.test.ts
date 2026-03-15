/**
 * Kamisado Engine — Jest Test Suite (Phase 3 QA)
 *
 * These tests exercise pure engine functions only — no React Native, no UI.
 * The __DEV__ global is set to `false` in jest.config.js so aiEngine debug
 * logs are silenced during test runs.
 *
 * Board coordinate system:
 *   row 0 = Black's home rank (top)
 *   row 7 = White's home rank (bottom)
 *   Black pieces move toward row 7 (+row direction).
 *   White pieces move toward row 0 (-row direction).
 *
 * BOARD_COLORS (used when verifying activeColor after M6):
 *   Row 0: Orange Blue Purple Pink Yellow Red Green Brown
 *   Row 1: Red Orange Pink Green Blue Yellow Brown Purple
 *   Row 2: Green Pink Orange Red Purple Brown Yellow Blue
 *   Row 3: Pink Purple Blue Orange Brown Green Red Yellow
 *   Row 4: Yellow Red Green Brown Orange Blue Purple Pink
 *   Row 5: Blue Yellow Brown Purple Red Orange Pink Green
 *   Row 6: Purple Brown Yellow Blue Green Pink Orange Red
 *   Row 7: Brown Green Red Yellow Pink Purple Blue Orange
 */

import { Player, GameStatus, GameMode, KamisadoColor, BOARD_SIZE, BOARD_COLORS, BoardVariant, BOARD_CONFIGS } from '../../constants/gameConstants';
import type { GameState, BoardState } from '../gameState';
import { getLegalMoves, getAvailablePieces } from '../moveValidator';
import { makeMove, handleDeadlock } from '../moveLogic';
import { findBestMove, evaluateBoard } from '../aiEngine';
import { MatchStrategy } from '../scoringLogic';
import { describe, test, expect } from '@jest/globals';

// ---------------------------------------------------------------------------
// Board builder helpers
// ---------------------------------------------------------------------------

/** Returns an 8×8 board of nulls. */
const emptyBoard = (): null[][] =>
  Array.from({ length: BOARD_SIZE }, () => Array<null>(BOARD_SIZE).fill(null));

/** Minimal valid GameState for unit tests. */
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
// 1. DIAGONAL ESCAPE — findBestMove chooses diagonal when straight is blocked
// ---------------------------------------------------------------------------

describe('1 — Diagonal Escape', () => {
  /**
   * Board sketch (row 0 = top, only relevant pieces shown):
   *
   *   row 0, col 4 : Black Orange piece  (forced to move — cell is Orange = KamisadoColor.Orange)
   *   row 1, col 4 : White Red piece     (blocks straight path)
   *   All other cells: empty
   *
   * Black's Orange piece at (0,4) has directions [+1,0], [+1,-1], [+1,+1].
   *   [+1, 0] → (1,4) occupied by White → no straight moves
   *   [+1,-1] → (1,3), (2,2), … → open
   *   [+1,+1] → (1,5), (2,6), … → open
   *
   * activeColor = Orange → Black must move its Orange piece.
   */
  test('AI picks a diagonal destination when the straight path is blocked', () => {
    const board = emptyBoard() as any;
    board[0][4] = { color: KamisadoColor.Orange, player: Player.Black };
    board[1][4] = { color: KamisadoColor.Red,    player: Player.White }; // blocker

    const state = makeState({
      board:       board as BoardState,
      turn:        Player.Black,
      activeColor: KamisadoColor.Orange, // forced piece is the Orange one
    });

    // Verify getLegalMoves agrees with the test premise
    const legal = getLegalMoves(board as BoardState, 0, 4);
    expect(legal.length).toBeGreaterThan(0);
    expect(legal.every(m => m.col !== 4)).toBe(true); // no straight-ahead moves

    // findBestMove must return a diagonal move
    const move = findBestMove(state, 2, Player.Black);
    expect(move).not.toBeNull();
    expect(move!.from).toEqual({ row: 0, col: 4 });
    expect(move!.to.col).not.toBe(4); // must go diagonally
    expect(move!.to.row).toBeGreaterThan(0); // must advance forward
  });

  test('getLegalMoves returns no straight moves when column is blocked one step ahead', () => {
    const board = emptyBoard() as any;
    board[3][3] = { color: KamisadoColor.Orange, player: Player.Black };
    board[4][3] = { color: KamisadoColor.Pink,   player: Player.White }; // 1 step ahead

    const legal = getLegalMoves(board as BoardState, 3, 3);
    const straightMoves = legal.filter(m => m.col === 3);
    expect(straightMoves).toHaveLength(0);

    // Both diagonals should still be reachable
    const leftDiag  = legal.filter(m => m.col < 3);
    const rightDiag = legal.filter(m => m.col > 3);
    expect(leftDiag.length  + rightDiag.length).toBeGreaterThan(0);
  });

  test('Black Orange piece generates correct diagonal candidate set', () => {
    // Black Orange at (0,4), White piece only at (1,4)
    const board = emptyBoard() as any;
    board[0][4] = { color: KamisadoColor.Orange, player: Player.Black };
    board[1][4] = { color: KamisadoColor.Blue,   player: Player.White };

    const legal = getLegalMoves(board as BoardState, 0, 4);
    const cols = legal.map(m => m.col);

    // Left diagonal: cols 3,2,1,0
    expect(cols).toContain(3);
    // Right diagonal: cols 5,6,7
    expect(cols).toContain(5);
    // No straight col-4 moves
    expect(cols).not.toContain(4);
  });
});

// ---------------------------------------------------------------------------
// 2. RULE M6 (FORFEIT) — makeMove triggers handleDeadlock
// ---------------------------------------------------------------------------

describe('2 — Rule M6 (Forfeit)', () => {
  /**
   * Construction of a complete M6 scenario:
   *
   * We need Black's forced piece to have ZERO legal moves after White's move.
   *
   * Step A: Build a state where White has just moved and the resulting
   *   nextActiveColor forces Black to move its Brown piece.
   * Step B: Black's Brown piece (row 0, col 7) is surrounded:
   *   - (1,7) occupied by White  → blocks straight
   *   - (1,6) occupied by White  → blocks left diagonal
   *   - (1,8) is off-board       → right diagonal unavailable anyway
   *
   * So Black's Brown piece has 0 legal moves → M6 fires inside makeMove.
   *
   * White's last move must land on a Brown cell to force Black's Brown piece.
   * BOARD_COLORS[1][7] = Purple  (not Brown)
   * BOARD_COLORS[0][7] = Brown   ← we need White to land HERE… but that's
   *                               Black's home rank, a very advanced position.
   *
   * Simpler: construct the deadlocked state directly and call handleDeadlock.
   * makeMove calls handleDeadlock internally; we can also test it directly.
   *
   * Direct handleDeadlock test:
   *   - Board has Black's Brown piece at (2, 5)   [BOARD_COLORS[2][5] = Brown]
   *   - White pieces block all three forward squares from (2,5):
   *       straight  (3,5) occupied
   *       left-diag (3,4) occupied
   *       right-diag(3,6) occupied
   *   - turn = Black, activeColor = Brown  → piece has 0 legal moves → deadlock
   */

  // BOARD_COLORS[2][5] = Brown (verify constant)
  test('BOARD_COLORS[2][5] is Brown — required for M6 fixture', () => {
    expect(BOARD_COLORS[2][5]).toBe(KamisadoColor.Brown);
  });

  const buildM6State = (): GameState => {
    const board = emptyBoard() as any;
    // Black's Brown piece — all forward squares blocked by White
    board[2][5] = { color: KamisadoColor.Brown, player: Player.Black };
    board[3][5] = { color: KamisadoColor.Red,   player: Player.White }; // straight
    board[3][4] = { color: KamisadoColor.Blue,  player: Player.White }; // left diagonal
    board[3][6] = { color: KamisadoColor.Green, player: Player.White }; // right diagonal

    // Also need a White piece that can move for the double-forfeit check
    // (otherwise handleDeadlock returns Draw). White Brown piece at (7,0).
    board[7][0] = { color: KamisadoColor.Brown, player: Player.White };

    return makeState({
      board:       board as BoardState,
      turn:        Player.Black,
      activeColor: KamisadoColor.Brown,
    });
  };

  test('Black Brown piece has zero legal moves in M6 fixture', () => {
    const state = buildM6State();
    const legal = getLegalMoves(state.board, 2, 5);
    expect(legal).toHaveLength(0);
  });

  test('handleDeadlock sets isDeadlocked = true', () => {
    const result = handleDeadlock(buildM6State());
    expect(result.isDeadlocked).toBe(true);
  });

  test('handleDeadlock reverts turn to White (the player who just moved)', () => {
    // Before M6: it is Black's turn but Black is stuck → White gets bonus move
    const result = handleDeadlock(buildM6State());
    expect(result.turn).toBe(Player.White);
  });

  test('handleDeadlock sets activeColor to the cell color under the trapped piece', () => {
    // Brown piece sits on BOARD_COLORS[2][5] = Brown
    // → White's next forced color must be Brown
    const result = handleDeadlock(buildM6State());
    expect(result.activeColor).toBe(BOARD_COLORS[2][5]);   // Brown
    expect(result.activeColor).toBe(KamisadoColor.Brown);
  });

  test('handleDeadlock records the trapped piece position in deadlockedPiece', () => {
    const result = handleDeadlock(buildM6State());
    expect(result.deadlockedPiece).toEqual({ row: 2, col: 5 });
  });

  test('handleDeadlock preserves Active status (not game over)', () => {
    const result = handleDeadlock(buildM6State());
    expect(result.status).toBe(GameStatus.Active);
  });

  test('makeMove triggers M6 automatically when next player is deadlocked', () => {
    /**
     * White's Brown piece at (7,0) moves straight up to (6,0).
     * BOARD_COLORS[6][0] = Purple → Black must move its Purple piece.
     * Black's Purple piece at (5,2) is surrounded by White pieces on all three
     * forward squares: (4,2), (4,1), (4,3).
     * → makeMove should detect the deadlock and return a forfeited state.
     */
    // BOARD_COLORS[6][0] = Purple
    expect(BOARD_COLORS[6][0]).toBe(KamisadoColor.Purple);
    // BOARD_COLORS[5][2] = Brown — wait, let me verify the correct Purple position
    // We need Black's Purple piece to be the one forced.
    // BOARD_COLORS[5][2] = Brown, not Purple. Let me use a different cell.
    // Find a cell where BOARD_COLORS[row][col] = Purple for a reachable position.
    // BOARD_COLORS[0][2] = Purple (Black's home row, col 2) — Black Purple starts there.
    // Keep it simple: use a crafted landing that forces Black's Purple, which is blocked.

    const board = emptyBoard() as any;
    // White's piece that will make the triggering move
    // It must land on a cell whose color matches Black's forced piece color,
    // and that forced piece must have 0 legal moves.
    //
    // Let White's Orange piece (arbitrary) move to a Purple cell.
    // BOARD_COLORS[1][2] = Pink — not Purple.
    // BOARD_COLORS[2][0] = Green — not Purple.
    // BOARD_COLORS[0][2] = Purple — but row 0 is Black's home rank.
    // BOARD_COLORS[3][1] = Purple — row 3, col 1.
    //
    // White piece at (4,1) can move straight up to (3,1) → lands on Purple cell.
    // BOARD_COLORS[3][1] = Purple ✓
    expect(BOARD_COLORS[3][1]).toBe(KamisadoColor.Purple);

    // Black's Purple piece at (2,2) — surrounded by White blockers.
    // Forward squares from (2,2) for Black (direction +row):
    //   straight  (3,2) col stays
    //   left-diag (3,1) — will be where White's piece lands (occupied after move)
    //   right-diag(3,3) blocked by another White piece
    board[2][2] = { color: KamisadoColor.Purple, player: Player.Black };
    board[4][1] = { color: KamisadoColor.Orange,  player: Player.White }; // will move to (3,1)
    board[3][2] = { color: KamisadoColor.Blue,    player: Player.White }; // blocks straight
    board[3][3] = { color: KamisadoColor.Red,     player: Player.White }; // blocks right diagonal
    // Black must also have one more piece so the board isn't trivially broken
    board[0][0] = { color: KamisadoColor.Orange, player: Player.Black };

    const stateBefore = makeState({
      board:       board as BoardState,
      turn:        Player.White,
      activeColor: KamisadoColor.Orange, // White moves its Orange piece
    });

    // White's Orange piece moves from (4,1) → (3,1) — lands on Purple
    const stateAfter = makeMove(stateBefore, { row: 4, col: 1 }, { row: 3, col: 1 });

    // (3,1) is Purple → Black must move Purple → Black Purple at (2,2) is blocked →
    // M6 fires: turn flips back to White, isDeadlocked true
    expect(stateAfter.isDeadlocked).toBe(true);
    expect(stateAfter.turn).toBe(Player.White);
    // activeColor = color of the cell under Black's trapped Purple piece (2,2)
    // BOARD_COLORS[2][2] = Orange
    expect(BOARD_COLORS[2][2]).toBe(KamisadoColor.Orange);
    expect(stateAfter.activeColor).toBe(KamisadoColor.Orange);
  });
});

// ---------------------------------------------------------------------------
// 3. RULE M8 (LOOP / REPETITION LOSS) — position seen twice → mover loses
// ---------------------------------------------------------------------------

describe('3 — Rule M8 (Loop / Repetition Loss)', () => {
  /**
   * M8 fires inside makeMove when `gameState.moveHistory` already contains
   * the hash of the state that would result from the current move.
   *
   * Strategy: play the same two-square back-and-forth until the history
   * accumulates a repeated hash, then verify the losing status.
   *
   * Simpler direct test: manually inject the repeated hash into moveHistory.
   */

  test('makeMove returns a losing status for the mover when a position repeats', () => {
    const board = emptyBoard() as any;
    // Two isolated pieces for a minimal looping game
    board[3][3] = { color: KamisadoColor.Orange, player: Player.Black };
    board[4][4] = { color: KamisadoColor.Blue,   player: Player.White };

    // Black will move Orange (3,3) → (4,3).
    // Compute what hash the resulting (board, turn) would have:
    // After Black moves: board[3][3]=null, board[4][3]=Black Orange, turn=White.
    // We'll do the first move legitimately, then reconstruct the loop.

    const state0 = makeState({
      board:       board as BoardState,
      turn:        Player.Black,
      activeColor: null, // opening — free choice
    });

    // Black moves (3,3) → (4,3)
    const state1 = makeMove(state0, { row: 3, col: 3 }, { row: 4, col: 3 });
    // BOARD_COLORS[4][3] = Brown → White forced to move Brown. White has no Brown piece in this minimal board.
    // That causes a degenerate state (activeColor = Brown, no White Brown piece) — which will fail getAvailablePieces.
    // Use activeColor: null instead so White can move freely.
    const state1free = { ...state1, activeColor: null };

    // White moves (4,4) → (3,4)
    const state2 = makeMove(state1free, { row: 4, col: 4 }, { row: 3, col: 4 });
    const state2free = { ...state2, activeColor: null };

    // Black moves (4,3) → (3,3) — back to original square
    const state3 = makeMove(state2free, { row: 4, col: 3 }, { row: 3, col: 3 });
    const state3free = { ...state3, activeColor: null };

    // White moves (3,4) → (4,4) — back to original square
    const state4 = makeMove(state3free, { row: 3, col: 4 }, { row: 4, col: 4 });
    const state4free = { ...state4, activeColor: null };

    // We now have a move history that includes the original position hash.
    // Repeat Black's move (3,3) → (4,3) to trigger M8.
    const state5 = makeMove(state4free, { row: 3, col: 3 }, { row: 4, col: 3 });

    // The mover (Black) caused the loop → Black loses → WonPlayer1 (White wins)
    expect(state5.status).toBe(GameStatus.WonPlayer1);
  });

  test('makeMove does NOT trigger M8 on first visit to a position', () => {
    const board = emptyBoard() as any;
    board[0][0] = { color: KamisadoColor.Orange, player: Player.Black };
    board[7][7] = { color: KamisadoColor.Orange, player: Player.White };

    const state = makeState({
      board:       board as BoardState,
      turn:        Player.Black,
      activeColor: null,
    });

    const result = makeMove(state, { row: 0, col: 0 }, { row: 2, col: 0 });
    // No prior history → should not trigger M8
    expect(result.status).toBe(GameStatus.Active);
  });
});

// ---------------------------------------------------------------------------
// 4. WIN CONDITION — makeMove recognises a winning move
// ---------------------------------------------------------------------------

describe('4 — Win Condition', () => {
  test('Black wins by reaching row 7', () => {
    const board = emptyBoard() as any;
    board[6][3] = { color: KamisadoColor.Orange, player: Player.Black };
    // White piece not on row 7 col 3 (destination is clear)

    const state = makeState({
      board:       board as BoardState,
      turn:        Player.Black,
      activeColor: null,
    });

    const result = makeMove(state, { row: 6, col: 3 }, { row: 7, col: 3 });
    expect(result.status).toBe(GameStatus.WonPlayer2); // Black = Player2
  });

  test('White wins by reaching row 0', () => {
    const board = emptyBoard() as any;
    board[1][5] = { color: KamisadoColor.Red, player: Player.White };

    const state = makeState({
      board:       board as BoardState,
      turn:        Player.White,
      activeColor: null,
    });

    const result = makeMove(state, { row: 1, col: 5 }, { row: 0, col: 5 });
    expect(result.status).toBe(GameStatus.WonPlayer1); // White = Player1
  });

  test('evaluateBoard returns +Infinity when AI has won', () => {
    const board = emptyBoard() as any;
    board[7][3] = { color: KamisadoColor.Orange, player: Player.Black }; // Black reached row 7
    const state = makeState({
      board:  board as BoardState,
      status: GameStatus.WonPlayer2, // Black wins
    });
    expect(evaluateBoard(state, Player.Black)).toBe(Infinity);
    expect(evaluateBoard(state, Player.White)).toBe(-Infinity);
  });

  test('evaluateBoard returns -Infinity when AI has lost', () => {
    const board = emptyBoard() as any;
    board[0][3] = { color: KamisadoColor.Orange, player: Player.White }; // White reached row 0
    const state = makeState({
      board:  board as BoardState,
      status: GameStatus.WonPlayer1, // White wins
    });
    expect(evaluateBoard(state, Player.Black)).toBe(-Infinity);
    expect(evaluateBoard(state, Player.White)).toBe(Infinity);
  });

  test('evaluateBoard returns 0 for a draw', () => {
    const board = emptyBoard() as any;
    const state = makeState({ board: board as BoardState, status: GameStatus.Draw });
    expect(evaluateBoard(state, Player.Black)).toBe(0);
    expect(evaluateBoard(state, Player.White)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// 5. DOUBLE-FORFEIT (MUTUAL DEADLOCK) — both players trapped → Draw
// ---------------------------------------------------------------------------

describe('5 — Double-Forfeit (Mutual Deadlock)', () => {
  /**
   * If after M6 the opponent (who would get the bonus move) is ALSO deadlocked,
   * handleDeadlock returns status = Draw.
   *
   * Build a state where:
   *   - Black's Brown piece at (2,5) has 0 moves (blocked by White pieces).
   *   - White's Brown piece at (5,2) also has 0 moves (blocked by Black pieces).
   *     BOARD_COLORS[2][5] = Brown → forced for Black.
   *     After M6 turn reverts to White with activeColor = BOARD_COLORS[2][5] = Brown.
   *     White must move its Brown piece at (5,2) — which is also surrounded.
   */
  test('mutual deadlock is classified as Draw', () => {
    // Verify BOARD_COLORS[5][2] = Brown (White's forced piece position)
    expect(BOARD_COLORS[5][2]).toBe(KamisadoColor.Brown);

    const board = emptyBoard() as any;
    // Black's Brown piece — surrounded by White blockers
    board[2][5] = { color: KamisadoColor.Brown, player: Player.Black };
    board[3][5] = { color: KamisadoColor.Red,   player: Player.White };
    board[3][4] = { color: KamisadoColor.Blue,  player: Player.White };
    board[3][6] = { color: KamisadoColor.Green, player: Player.White };

    // White's Brown piece — surrounded by Black blockers
    // White moves toward row 0 (−row), so forward squares from (5,2):
    //   straight  (4,2)
    //   left-diag (4,1)
    //   right-diag(4,3)
    board[5][2] = { color: KamisadoColor.Brown,  player: Player.White };
    board[4][2] = { color: KamisadoColor.Orange, player: Player.Black };
    board[4][1] = { color: KamisadoColor.Yellow, player: Player.Black };
    board[4][3] = { color: KamisadoColor.Pink,   player: Player.Black };

    const state = makeState({
      board:       board as BoardState,
      turn:        Player.Black,
      activeColor: KamisadoColor.Brown,
    });

    const result = handleDeadlock(state);
    expect(result.status).toBe(GameStatus.Draw);
    expect(result.isDeadlocked).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 6. getLegalMoves — boundary & movement rules
// ---------------------------------------------------------------------------

describe('6 — getLegalMoves fundamentals', () => {
  test('returns empty array for an empty cell', () => {
    const board = emptyBoard() as any;
    expect(getLegalMoves(board as BoardState, 3, 3)).toHaveLength(0);
  });

  test('Black piece at row 0 col 0 cannot move off-board left', () => {
    const board = emptyBoard() as any;
    board[0][0] = { color: KamisadoColor.Orange, player: Player.Black };
    const legal = getLegalMoves(board as BoardState, 0, 0);
    expect(legal.every(m => m.col >= 0 && m.row >= 0)).toBe(true);
  });

  test('Black piece at row 0 col 7 cannot move off-board right', () => {
    const board = emptyBoard() as any;
    board[0][7] = { color: KamisadoColor.Brown, player: Player.Black };
    const legal = getLegalMoves(board as BoardState, 0, 7);
    expect(legal.every(m => m.col <= 7)).toBe(true);
  });

  test('piece is blocked by own-colour piece (no captures in Kamisado)', () => {
    const board = emptyBoard() as any;
    board[3][3] = { color: KamisadoColor.Orange, player: Player.Black };
    board[4][3] = { color: KamisadoColor.Blue,   player: Player.Black }; // own piece ahead
    const legal = getLegalMoves(board as BoardState, 3, 3);
    expect(legal.every(m => !(m.row === 4 && m.col === 3))).toBe(true);
    // Cannot jump over or land on it
    expect(legal.every(m => !(m.row >= 4 && m.col === 3))).toBe(true);
  });

  test('White piece advances toward row 0 only', () => {
    const board = emptyBoard() as any;
    board[5][4] = { color: KamisadoColor.Yellow, player: Player.White };
    const legal = getLegalMoves(board as BoardState, 5, 4);
    // All moves must have row < 5 (moving toward row 0)
    expect(legal.every(m => m.row < 5)).toBe(true);
  });

  test('a piece can slide multiple squares in one move (Kamisado tower rule)', () => {
    const board = emptyBoard() as any;
    board[0][4] = { color: KamisadoColor.Yellow, player: Player.Black };
    // Nothing blocking — should reach rows 1..7 straight
    const legal = getLegalMoves(board as BoardState, 0, 4);
    const straightMoves = legal.filter(m => m.col === 4);
    expect(straightMoves.length).toBe(7); // rows 1–7
  });
});

// ---------------------------------------------------------------------------
// 7. evaluateBoard — heuristic sanity checks
// ---------------------------------------------------------------------------

describe('7 — evaluateBoard heuristic', () => {
  test('an advanced AI piece scores more than a piece at the home rank', () => {
    const boardNear = emptyBoard() as any;
    boardNear[6][3] = { color: KamisadoColor.Orange, player: Player.Black }; // row 6

    const boardFar = emptyBoard() as any;
    boardFar[1][3] = { color: KamisadoColor.Orange, player: Player.Black };  // row 1

    const stateNear = makeState({ board: boardNear as BoardState });
    const stateFar  = makeState({ board: boardFar  as BoardState });

    expect(evaluateBoard(stateNear, Player.Black))
      .toBeGreaterThan(evaluateBoard(stateFar, Player.Black));
  });

  test('score is positive for the player with a more advanced piece', () => {
    // Black at row 6 (5 steps from home) vs White at row 6 (1 step from home).
    // Black is far more advanced → score should heavily favour Black.
    const board = emptyBoard() as any;
    board[6][2] = { color: KamisadoColor.Orange, player: Player.Black };
    board[6][5] = { color: KamisadoColor.Blue,   player: Player.White };

    const state = makeState({ board: board as BoardState });
    const scoreBlack = evaluateBoard(state, Player.Black);
    const scoreWhite = evaluateBoard(state, Player.White);

    expect(scoreBlack).toBeGreaterThan(0); // Black is winning from its perspective
    expect(scoreWhite).toBeLessThan(0);    // Same position looks bad for White
    // They should be exact negatives (same heuristic, inverted perspective)
    expect(scoreBlack).toBe(-scoreWhite);
  });

  test('forfeit bonus is applied when isDeadlocked — extra bonus for the player who moves again', () => {
    const board = emptyBoard() as any;
    board[3][3] = { color: KamisadoColor.Orange, player: Player.Black };
    board[4][4] = { color: KamisadoColor.Blue,   player: Player.White };

    const stateNormal   = makeState({ board: board as BoardState, turn: Player.Black });
    const stateDeadlock = makeState({ board: board as BoardState, turn: Player.Black, isDeadlocked: true });

    // With deadlock bonus, score for Black (who gets to move again) should be higher
    expect(evaluateBoard(stateDeadlock, Player.Black))
      .toBeGreaterThan(evaluateBoard(stateNormal, Player.Black));
  });
});

// ---------------------------------------------------------------------------
// 8. getAvailablePieces — forced-colour selection
// ---------------------------------------------------------------------------

describe('8 — getAvailablePieces', () => {
  test('when activeColor is null (opening), all pieces of current player are available', () => {
    const board = emptyBoard() as any;
    board[0][0] = { color: KamisadoColor.Orange, player: Player.Black };
    board[0][1] = { color: KamisadoColor.Blue,   player: Player.Black };
    board[7][0] = { color: KamisadoColor.Brown,  player: Player.White };

    const state = makeState({
      board:       board as BoardState,
      turn:        Player.Black,
      activeColor: null,
    });

    const available = getAvailablePieces(state);
    expect(available).toHaveLength(2); // both Black pieces
    expect(available.some(p => p.row === 0 && p.col === 0)).toBe(true);
    expect(available.some(p => p.row === 0 && p.col === 1)).toBe(true);
  });

  test('when activeColor is set, only the matching piece is available', () => {
    const board = emptyBoard() as any;
    board[0][0] = { color: KamisadoColor.Orange, player: Player.Black };
    board[0][1] = { color: KamisadoColor.Blue,   player: Player.Black };

    const state = makeState({
      board:       board as BoardState,
      turn:        Player.Black,
      activeColor: KamisadoColor.Blue,
    });

    const available = getAvailablePieces(state);
    expect(available).toHaveLength(1);
    expect(available[0]).toEqual({ row: 0, col: 1 });
  });
});

// ---------------------------------------------------------------------------
// 9. Match Scoring — Best of 3 (MatchStrategy + makeMove integration)
// ---------------------------------------------------------------------------

describe('9 — Match Scoring (Best of 3)', () => {
  const strategy = new MatchStrategy(); // default target = 3

  test('round win for Black increments p2 score and resets the board', () => {
    const state  = makeState({ board: emptyBoard() as BoardState, gameMode: GameMode.Match });
    const result = strategy.handleRoundEnd(state, Player.Black);

    expect(result.matchScore.p2).toBe(1);
    expect(result.matchScore.p1).toBe(0);
    expect(result.roundNumber).toBe(2);
    expect(result.status).toBe(GameStatus.Active);
    // Fresh board should have all 16 pieces
    expect(result.board.flat().filter(p => p !== null).length).toBe(16);
  });

  test('round win for White increments p1 score', () => {
    const state  = makeState({ board: emptyBoard() as BoardState, gameMode: GameMode.Match });
    const result = strategy.handleRoundEnd(state, Player.White);

    expect(result.matchScore.p1).toBe(1);
    expect(result.matchScore.p2).toBe(0);
    expect(result.status).toBe(GameStatus.Active);
  });

  test('score accumulates: Black at 2 wins, match still Active', () => {
    const state = makeState({
      board:       emptyBoard() as BoardState,
      gameMode:    GameMode.Match,
      matchScore:  { p1: 0, p2: 1 },
      roundNumber: 2,
    });
    const result = strategy.handleRoundEnd(state, Player.Black);

    expect(result.matchScore.p2).toBe(2);
    expect(result.status).toBe(GameStatus.Active);
    expect(result.roundNumber).toBe(3);
  });

  test('3rd win for Black ends the match as WonPlayer2', () => {
    const state = makeState({
      board:       emptyBoard() as BoardState,
      gameMode:    GameMode.Match,
      matchScore:  { p1: 0, p2: 2 },
      roundNumber: 3,
    });
    const result = strategy.handleRoundEnd(state, Player.Black);

    expect(result.matchScore.p2).toBe(3);
    expect(result.status).toBe(GameStatus.WonPlayer2);
  });

  test('3rd win for White ends the match as WonPlayer1', () => {
    const state = makeState({
      board:       emptyBoard() as BoardState,
      gameMode:    GameMode.Match,
      matchScore:  { p1: 2, p2: 0 },
      roundNumber: 3,
    });
    const result = strategy.handleRoundEnd(state, Player.White);

    expect(result.matchScore.p1).toBe(3);
    expect(result.status).toBe(GameStatus.WonPlayer1);
  });

  test('loser moves first in the next round', () => {
    // Black wins → White (loser) moves first
    const r1 = strategy.handleRoundEnd(
      makeState({ board: emptyBoard() as BoardState, gameMode: GameMode.Match }),
      Player.Black,
    );
    expect(r1.turn).toBe(Player.White);

    // White wins → Black (loser) moves first
    const r2 = strategy.handleRoundEnd(
      makeState({ board: emptyBoard() as BoardState, gameMode: GameMode.Match }),
      Player.White,
    );
    expect(r2.turn).toBe(Player.Black);
  });

  test('makeMove back-rank win in Match mode resets the board (integration)', () => {
    // Black Orange piece at row 6 col 0, one step from White's home rank.
    const board = emptyBoard() as any;
    board[6][0] = { color: KamisadoColor.Orange, player: Player.Black };
    board[7][7] = { color: KamisadoColor.Brown,  player: Player.White };

    const state = makeState({
      board:       board as BoardState,
      turn:        Player.Black,
      activeColor: null,        // free choice — no forced-colour check
      gameMode:    GameMode.Match,
    });

    const result = makeMove(state, { row: 6, col: 0 }, { row: 7, col: 0 });

    expect(result.matchScore.p2).toBe(1);
    expect(result.roundNumber).toBe(2);
    expect(result.status).toBe(GameStatus.Active);
    expect(result.board.flat().filter(p => p !== null).length).toBe(16);
  });

  test('M6 forfeit still fires inside Match mode and gameMode is preserved', () => {
    // Same fixture as buildM6State() in Suite 2, with gameMode: Match.
    // White Brown piece at (7,0) is required so double-forfeit check doesn't trigger.
    const board = emptyBoard() as any;
    board[2][5] = { color: KamisadoColor.Brown,  player: Player.Black };
    board[3][5] = { color: KamisadoColor.Red,    player: Player.White }; // straight
    board[3][4] = { color: KamisadoColor.Blue,   player: Player.White }; // diagonal-left
    board[3][6] = { color: KamisadoColor.Green,  player: Player.White }; // diagonal-right
    board[7][0] = { color: KamisadoColor.Brown,  player: Player.White }; // escapes double-forfeit

    const state = makeState({
      board:       board as BoardState,
      turn:        Player.Black,
      activeColor: KamisadoColor.Brown,
      gameMode:    GameMode.Match,
    });

    const result = handleDeadlock(state);

    expect(result.isDeadlocked).toBe(true);
    expect(result.turn).toBe(Player.White);        // M6: revert to opponent
    expect(result.gameMode).toBe(GameMode.Match);  // scoring mode preserved
  });
});
