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
  readonly kanji:  string;
}

const makePiece = (color: KamisadoColor, player: Player): Piece => ({
  color,
  player,
  kanji: COLOR_KANJI[color],
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

  for (let col = 0; col < 8; col++) {
    // Black: home row 0, piece color matches cell color
    pieces.push({ piece: makePiece(BOARD_COLORS[0][col], Player.Black), row: 0, col });
    // White: home row 7, piece color matches cell color
    pieces.push({ piece: makePiece(BOARD_COLORS[7][col], Player.White), row: 7, col });
  }

  return pieces;
})();
