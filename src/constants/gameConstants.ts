// -*- coding: utf-8 -*-
/**
 * Kamisado Game Constants
 *
 * Board symmetry: The 8x8 color grid is rotationally symmetric (180°).
 * Rotating the board maps Black's layout onto White's — every cell at [r][c]
 * has the same color as the cell at [7-r][7-c]. This is the property that
 * makes the game fair for both players.
 *
 * The 10x10 Megasado grid obeys the same 180° symmetry: [r][c] = [9-r][9-c].
 *
 * Row 0 = Black's home rank (back rank / starting rank)
 * Row N-1 = White's home rank
 * Columns 0–(N-1) = left to right from each player's perspective (Black's POV used here)
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
  // Megasado (10x10) additions
  Silver = 'Silver',
  Gold   = 'Gold',
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
  [KamisadoColor.Silver]: '銀', // Silver (Gin)
  [KamisadoColor.Gold]:   '金', // Gold (Kin)
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
  [KamisadoColor.Silver]: '#C0C0C0',
  [KamisadoColor.Gold]:   '#D4AF37',
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
  Single = 'Single',
  /** Match — first player to win a target number of rounds wins the match. */
  Match  = 'Match',
}

// ---------------------------------------------------------------------------
// Board Variant
// ---------------------------------------------------------------------------

export enum BoardVariant {
  /** Classic 8×8 Kamisado board. */
  Standard = 'Standard',
  /** 10×10 Megasado board with Silver and Gold pieces. */
  Mega     = 'Mega',
}

// ---------------------------------------------------------------------------
// Players
// ---------------------------------------------------------------------------

export enum Player {
  /** Starts at row 0, moves downward (increasing row index). */
  Black = 'Black',
  /** Starts at row (size-1), moves upward (decreasing row index). */
  White = 'White',
}

// ---------------------------------------------------------------------------
// 8×8 Board
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
// 10×10 Megasado Board
// ---------------------------------------------------------------------------

export const MEGA_BOARD_SIZE = 10;

const Sv = KamisadoColor.Silver;
const Gd = KamisadoColor.Gold;

/**
 * Megasado 10×10 board layout.
 * Uses all 10 colors: the standard 8 plus Silver and Gold.
 *
 * Row 0 sequence: Brown Green Red Silver Gold Yellow Pink Blue Purple Orange
 *
 * Symmetry: MEGA_BOARD_COLORS[r][c] === MEGA_BOARD_COLORS[9-r][9-c] for all r, c.
 * Latin square: each color appears exactly once per row and column.
 */
export const MEGA_BOARD_COLORS: Readonly<KamisadoColor[][]> = [
  // col:   0   1   2   3   4   5   6   7   8   9
  [         O, R,  G,  Gd, Y, Pk,  Sv, B,  P,  Br  ], // row 0  (Black's home rank)
  [         B,  O, Pk,  P,  Gd,  Sv, R,  Y,  Br,  G ], // row 1
  [         P,  Gd,  O, Pk,  G, B,  Y,  Br, Sv,  R ], // row 2
  [         Pk, G,  Gd,  O,  R, P,  Br,  Sv, B, Y  ], // row 3
  [         Sv,  Pk,  P,  B, O,  Br,  G, R,  Y, Gd ], // row 4
  [         Gd, Y, R,  G, Br,  O,  B,  P,  Pk,  Sv  ], // row 5
  [         Y,  B, Sv, Br,  P,  R, O,  Gd,  G,  Pk ], // row 6
  [         R,  Sv,  Br, Y,  B,  G, Pk,  O, Gd,  P  ], // row 7
  [         G,  Br, Y,  R,  Sv, Gd,  P,  Pk,  O, B  ], // row 8
  [         Br,  P,  B,  Sv, Pk,  Y,  Gd, G,  R,  O  ], // row 9  (White's home rank)
] as const;

// ---------------------------------------------------------------------------
// Board Config
// ---------------------------------------------------------------------------

export interface BoardConfig {
  readonly variant:     BoardVariant;
  readonly size:        number;
  /** Color grid — boardColors[row][col]. */
  readonly colors:      Readonly<KamisadoColor[][]>;
  /**
   * Maximum squares a piece may travel in one move (straight or diagonal).
   * null = unlimited (standard Kamisado rule).
   * 7 = Megasado rule — pieces may move at most 7 squares per turn.
   */
  readonly maxMoveDist: number | null;
}

export const BOARD_CONFIGS: Readonly<Record<BoardVariant, BoardConfig>> = {
  [BoardVariant.Standard]: {
    variant:      BoardVariant.Standard,
    size:         BOARD_SIZE,
    colors:       BOARD_COLORS,
    maxMoveDist:  null,
  },
  [BoardVariant.Mega]: {
    variant:      BoardVariant.Mega,
    size:         MEGA_BOARD_SIZE,
    colors:       MEGA_BOARD_COLORS,
    maxMoveDist:  7,
  },
};

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
// Initial Positions (8×8 only — legacy helper used by createInitialGameState)
// ---------------------------------------------------------------------------

export interface PositionedPiece {
  readonly piece: Piece;
  readonly row:   number;
  readonly col:   number;
}

/**
 * Starting positions for all 16 pieces on the standard 8×8 board.
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
