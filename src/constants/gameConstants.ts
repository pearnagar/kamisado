// -*- coding: utf-8 -*-
/**
 * Kamisado Game Constants
 *
 * Board symmetry: The 8x8 color grid is rotationally symmetric (180°).
 * Rotating the board maps Black's layout onto White's — every cell at [r][c]
 * has the same color as the cell at [7-r][7-c]. This is the property that
 * makes the game fair for both players.
 *
 * Row 0 = Black's home rank (back rank / starting rank)
 * Row 7 = White's home rank
 * Columns 0–7 = left to right from each player's perspective (Black's POV used here)
 */

// ---------------------------------------------------------------------------
// Colors
// ---------------------------------------------------------------------------

export enum KamisadoColor {
  Orange = 'Orange',
  Blue   = 'Blue',
  Purple = 'Purple',
  Pink   = 'Pink',
  Yellow = 'Yellow',
  Red    = 'Red',
  Green  = 'Green',
  Brown  = 'Brown',
}

/** Traditional kanji symbol for each dragon piece color. */
export const COLOR_KANJI: Readonly<Record<KamisadoColor, string>> = {
  [KamisadoColor.Orange]: '龍', // Dragon
  [KamisadoColor.Blue]:   '虎', // Tiger
  [KamisadoColor.Purple]: '鳳', // Phoenix
  [KamisadoColor.Pink]:   '麒', // Qilin
  [KamisadoColor.Yellow]: '鶴', // Crane
  [KamisadoColor.Red]:    '獅', // Lion
  [KamisadoColor.Green]:  '蛇', // Snake
  [KamisadoColor.Brown]:  '龜', // Tortoise
} as const;

/** Hex color for rendering each dragon color in the UI. */
export const COLOR_HEX: Readonly<Record<KamisadoColor, string>> = {
  [KamisadoColor.Orange]: '#FF8C00',
  [KamisadoColor.Blue]:   '#1E90FF',
  [KamisadoColor.Purple]: '#9B30FF',
  [KamisadoColor.Pink]:   '#FF69B4',
  [KamisadoColor.Yellow]: '#FFD700',
  [KamisadoColor.Red]:    '#DC143C',
  [KamisadoColor.Green]:  '#228B22',
  [KamisadoColor.Brown]:  '#8B4513',
} as const;

// ---------------------------------------------------------------------------
// Game Status
// ---------------------------------------------------------------------------

export enum GameStatus {
  Active              = 'ACTIVE',
  WonPlayer1          = 'WON_PLAYER1',         // White wins by reaching back rank
  WonPlayer2          = 'WON_PLAYER2',         // Black wins by reaching back rank
  Draw                = 'DRAW',
  WonPlayer1_Timeout  = 'WON_PLAYER1_TIMEOUT', // White wins — Black's clock ran out
  WonPlayer2_Timeout  = 'WON_PLAYER2_TIMEOUT', // Black wins — White's clock ran out
}

/** Each player's starting clock time in seconds (5 minutes). */
export const DEFAULT_CLOCK_SECONDS = 300;

// ---------------------------------------------------------------------------
// Game Mode
// ---------------------------------------------------------------------------

export enum GameMode {
  /** Single game — first to reach the back rank wins outright. */
  Single   = 'Single',
  /** Match — first player to win a target number of rounds wins the match. */
  Match    = 'Match',
  /** Marathon — accumulate points over rounds; first to the point target wins. */
  Marathon = 'Marathon',
}

// ---------------------------------------------------------------------------
// Players
// ---------------------------------------------------------------------------

export enum Player {
  /** Starts at row 0, moves downward (increasing row index). */
  Black = 'Black',
  /** Starts at row 7, moves upward (decreasing row index). */
  White = 'White',
}

// ---------------------------------------------------------------------------
// Board
// ---------------------------------------------------------------------------

export const BOARD_SIZE = 8;

const O  = KamisadoColor.Orange;
const B  = KamisadoColor.Blue;
const P  = KamisadoColor.Purple;
const Pk = KamisadoColor.Pink;
const Y  = KamisadoColor.Yellow;
const R  = KamisadoColor.Red;
const G  = KamisadoColor.Green;
const Br = KamisadoColor.Brown;

/**
 * Official Kamisado board layout.
 * BOARD_COLORS[row][col] gives the fixed color of that cell.
 *
 * Symmetry check: BOARD_COLORS[r][c] === BOARD_COLORS[7-r][7-c] for all r, c.
 */
export const BOARD_COLORS: Readonly<KamisadoColor[][]> = [
  // col:  0   1   2   3    4   5    6   7
  [        O,  B,  P,  Pk,  Y,  R,  G,  Br], // row 0
  [        R,  O,  Pk, G,   B,  Y,  Br,  P ], // row 1
  [        G, Pk,  O,  R,   P, Br,   Y,  B ], // row 2
  [        Pk, P,  B,  O,  Br,  G,   R,  Y ], // row 3
  [        Y,  R,  G, Br,   O,  B,   P,  Pk], // row 4
  [        B,  Y, Br,  P,   R,  O,  Pk,  G ], // row 5
  [        P,  Br, Y,  B,  G,  Pk,   O,  R ], // row 6
  [        Br, G, R,  Y,   Pk,  P,   B,  O ], // row 7
] as const;

// ---------------------------------------------------------------------------
// Piece
// ---------------------------------------------------------------------------

export interface Piece {
  readonly color:  KamisadoColor;
  readonly player: Player;
}

const makePiece = (color: KamisadoColor, player: Player): Piece => ({
  color,
  player,
});

// ---------------------------------------------------------------------------
// Initial Positions
// ---------------------------------------------------------------------------

export interface PositionedPiece {
  readonly piece: Piece;
  readonly row:   number;
  readonly col:   number;
}

/**
 * Starting positions for all 16 pieces.
 * Each piece is placed on the cell whose color matches its own.
 *
 * Black occupies row 0 (cols 0–7 match the row-0 color sequence).
 * White occupies row 7 (cols 0–7 match the row-7 color sequence).
 */
export const INITIAL_PIECES_POSITION: readonly PositionedPiece[] = (() => {
  const pieces: PositionedPiece[] = [];

  for (let col = 0; col < BOARD_SIZE; col++) {
    // Black: home row 0, piece color matches cell color
    pieces.push({ piece: makePiece(BOARD_COLORS[0][col], Player.Black), row: 0, col });
    // White: home row BOARD_SIZE-1, piece color matches cell color
    pieces.push({ piece: makePiece(BOARD_COLORS[BOARD_SIZE - 1][col], Player.White), row: BOARD_SIZE - 1, col });
  }

  return pieces;
})();
