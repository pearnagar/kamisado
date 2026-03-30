# Kamisado Mobile — Roadmap

## Phase 1: Scaffold & Core Engine ✅
**Goal:** Playable local 2-player game, no polish.

- [x] Expo + TypeScript project init (`expo-router`, strict tsconfig)
- [x] NativeWind + Reanimated + Gesture Handler setup
- [x] EAS configuration (`eas.json` with dev/preview/production profiles)
- [x] Board renderer: dynamic cell sizing, correct color grid
- [x] Game state model: `GameState`, `Piece`, `Cell`, `Player` types
- [x] `SingleRoundStrategy` implementing `IRoundStrategy`
- [x] Move validation engine (forward-only, no jumps, no captures)
- [x] Lock mechanic: post-move color → opponent's forced piece
- [x] Win detection: back-rank landing + stalemate
- [x] Local 2-player turn loop (pass device)

**Exit criteria:** Two people can play a complete game. ✓ Verified (foundation for all subsequent phases).

---

## Phase 2: Feel & Polish ✅
**Goal:** The game feels great to play on a phone.

- [x] Drag-and-drop with Reanimated (lift, ghost, snap-back)
- [x] Valid move highlights animate in on piece select
- [x] Piece placement transition (slide to cell, not teleport)
- [x] Win screen animation
- [x] `expo-haptics` on all interactions (select / place / invalid / win)
- [ ] Sound FX via `expo-av` (piece click, slide, win fanfare)
- [x] Active dragon pulsing indicator (colorblind-safe)

**Exit criteria:** Playtesting feels polished and responsive.

---

## Phase 3: Gameplay Logic ✅
**Goal:** Full turn loop, move execution, and win/deadlock handling wired to the UI.

- [x] Minimax with alpha-beta pruning (`src/engine/aiEngine.ts`)
- [x] Evaluation heuristic: advancement score + mobility (`evaluateBoard`)
- [x] Difficulty levels:
  - [x] Easy: depth 2, random tie-breaking among equal-scored moves
  - [x] Medium: depth 4
  - [x] Hard: depth 6
- [x] AI sequenced via `setTimeout` + `requestAnimationFrame` — no UI jank
- [x] "Bot is thinking…" spinner while AI computes
- [x] Game mode toggle: vs Human / vs Bot + Easy / Medium / Hard segmented control
- [x] AI diagonal move blindness fixed: candidate pool + shuffle tie-breaking
- [x] Rule M6 (forfeit): `handleDeadlock` + orange `StatusBanner` notification
- [x] Rule M8 (loop): position-hash history → immediate loss for looping player
- [x] Dragon animation overhaul: deferred `makeMove`, absolute overlay, z-index 1000
- [x] **30/30 Jest unit tests** — run with `npm test`

**Exit criteria:** Hard AI is genuinely challenging. ✓ Verified 2026-03-12.

---

## Phase 4: Scoring Modes & Timers ✅
**Goal:** Match mode with chess clocks, fully integrated and tested.

- [x] `IRoundStrategy` + `MatchStrategy` (best-of-3, 1 pt/round) — `src/engine/scoringLogic.ts`
- [x] `ModeSelector` UI: `1 Game | Match (3)` segmented control
- [x] `ScoreHeader`: live `Round N · White X — Y Black` bar (Match mode only)
- [x] `ChessClock`: self-contained per-player countdown, `key`-remount reset pattern
- [x] Timeout win conditions: `WonPlayer1_Timeout` / `WonPlayer2_Timeout`
- [x] `WinOverlay` shows "by Timeout" and match score line
- [x] AI clock ticks during minimax — no special-casing needed
- [x] `app.json` created: `com.peer.kamisado`, `version: 1.0.0`
- [x] **38/38 Jest unit tests** — run with `npm test`

**Exit criteria:** Match mode is playable with chess clocks. ✓ Verified 2026-03-12.

---

## Phase 5: Undo & UI Polish ✅
**Goal:** Premium undo system, clean press feedback, verified with a Jest suite.

- [x] Suppress Android ripple / pressed-state square highlight on Cell and Dragon (`android_ripple={null}` + function-style `style` prop)
- [x] Remove "Bot is thinking…" overlay — `isAiThinking` kept as input-blocking flag only
- [x] History stack in `Board.tsx`: `HistoryEntry[]` storing pre-move `{gameState, lastMove, move}` snapshots
- [x] `handleUndo` — PvP: pop 1 entry; PvE: pop 2 entries (bot reply + human move)
- [x] Animated undo via existing overlay-Dragon slide system (`PendingMove.isUndo` + `pendingUndoChainRef`)
- [x] Key-based overlay Dragon remount (`overlay-dragon-{row}-{col}`) to fix PvE teleport bug
- [x] Undo button disabled states (`canUndo` guard: no pending animation, no AI thinking, sufficient history)
- [x] **26/26 Jest unit tests** (`src/engine/__tests__/boardHistory.test.ts`) — run with `npm test`

**Exit criteria:** Undo works in PvP and PvE with slide animation. 26 tests green. ✓ Verified 2026-03-13.

---

## Phase 6: Mega-Board (10×10) ✅
**Goal:** Playable 10×10 variant on the same codebase.

- [x] `Silver` (#C0C0C0 / 銀) and `Gold` (#D4AF37 / 金) added to `KamisadoColor` enum
- [x] `MEGA_BOARD_COLORS` — valid 10×10 Latin square with 180° rotational symmetry (`gameConstants.ts`)
- [x] `BoardVariant` enum (`Standard` | `Mega`) + `BoardConfig` interface (`size`, `colors`, `maxMoveDist`)
- [x] `BOARD_CONFIGS` record — centralised config for both variants
- [x] `boardConfig: BoardConfig` field added to `GameState` — threads variant through entire engine
- [x] `createInitialGameState(variant?)` — places 10 pieces per player on rows 0 and 9 for Mega
- [x] `getLegalMoves` enforces `maxMoveDist = 7` in Mega mode (Megasado-specific rule)
- [x] `getAvailablePieces` / move loops use `boardConfig.size` — no hardcoded 8
- [x] Win condition checks `row (size-1)` dynamically — correct for both 8×8 and 10×10
- [x] `aiEngine.ts` passes `boardConfig` to all `getLegalMoves` calls; `evaluateBoard` uses `boardConfig.size`
- [x] `scoringLogic.ts` — `startNextRound` passes `state.boardConfig.variant` so a Mega match stays Mega
- [x] `Board.tsx` — `boardVariant` prop; `CELL_SIZE = floor((screenWidth - 32) / boardSize)` via `useWindowDimensions`; AI depth capped at 4 for Mega (`MEGA_MAX_DEPTH`)
- [x] `App.tsx` — `ToggleButton` component; "Standard (8×8)" / "Mega (10×10)" selector in `HomeScreen`; `boardVariant` threaded through navigation params
- [x] Greedy win check in `findBestMove` — returns winning move immediately, before minimax (`aiEngine.ts`)
- [x] Undo history cleared on round boundary — `handleAnimationComplete` wipes stack when `roundNumber` advances (`Board.tsx`)
- [x] **67/67 Jest unit tests** — run with `npm test`

**Exit criteria:** A full 10×10 game is playable with AI on device. ✓ Verified 2026-03-15.

---

## Phase 7: Premium UI/UX Overhaul ✅
**Goal:** A premium, polished landing experience and game screen.

- [x] Dragon watermark background — translucent `dragon_bg.png` absolutely positioned over Slate-50 (`#F8FAFC`) base, visible on both Home and Game screens
- [x] Home Screen redesign — `KAMISADO` title (`fontWeight: '600'`, `letterSpacing: 12`), `STRATEGIC DRAGON CHESS` subtitle (`fontSize: 13`, Slate 600)
- [x] Mode cards — glassmorphism `BlurView` cards with gold border accent, animated scale on press
- [x] Sliding segment controls — animated highlight pill for Game Type and Board selectors
- [x] Premium PLAY button — gold `#D4AF37` pill, play icon, dark slate text, warm bronze shadow (`#92400E`)
- [x] Ghost/outline "How to play" button — `borderColor: #334155`, `borderWidth: 2`
- [x] Rules Screen rebuilt as horizontal swipeable carousel — `FlatList` with `snapToInterval`, `decelerationRate="fast"`, centered via `SIDE_PADDING` math
- [x] Rules cards — frost glass (`rgba(255,255,255,0.85)`), gold border, icon badge, gold divider
- [x] Pagination dots — pill-shaped active dot in gold `#D4AF37`, slate inactive dots
- [x] Game Screen layout — Board wrapper `flex: 1`, `paddingTop: 50` for safe-area clearance
- [x] ScoreHeader player badges — pill containers with `rgba(255,255,255,0.6)` glass, gold border, `fontSize: 18` bold scores
- [x] Board tile 3D bevel — per-side border overlay: light top/left, dark bottom/right, simulates raised acrylic tile
- [x] Dragon piece drop shadow — `shadowOffset: {0,4}`, `elevation: 8` on `Animated.View` (outside `overflow:hidden`)
- [x] UNDO/QUIT button redesign — UNDO slate `#334155`, QUIT crimson `#991B1B`, pill shape, white bold text
- [x] Zero layout shift fix — turn indicator always rendered; visibility via `opacity` only; fixed `height: 32`

**Exit criteria:** Home screen and game board feel premium; no layout shifts during gameplay. ✓ Verified 2026-03-17.

---

## Phase 8 (Deferred): App Startup & Asset Preloading ⏸
**Status:** Paused — superseded by Phase 8 App Icon work. Revisit before production build.
**Goal:** Implement Splash Screen retention, preload heavy assets (`dragon_bg.png`), and ensure a zero-flicker, smooth reveal of the Home Screen.

- [ ] `fadeDuration={0}` on `DragonWatermark` image to suppress Android cross-fade
- [ ] `NavigationContainer onReady` + 300 ms paint delay to gate loading overlay removal
- [ ] Full JS loading screen (dark slate + gold spinner) covering hidden pre-rendered nav tree
- [ ] `expo-font` preloads `Ionicons.font` before any Ionicons render
- [ ] `Image.resolveAssetSource` + `Image.prefetch` warms native image cache

**Exit criteria:** Cold launch shows splash until Home Screen is fully painted, with no flash of unstyled content.

---

## Phase 8: App Icon & Branding ✅
**Goal:** Design a premium app icon that aligns with the Kamisado/Dragon theme (Gold/Slate), generate necessary assets for iOS and Android, and configure `app.json` for proper icon display.

**Brand Identity:** Gold `#D4AF37` dragon motif on deep slate `#0F172A` background. Minimalist, high-contrast. Consistent across all surfaces (launcher, Play Store listing, iOS App Store).

- [x] Design `icon.png` — gold dragon motif on slate `#0F172A` background, no transparency (iOS + legacy Android)
- [x] Design `adaptive-icon.png` (foreground layer) — dragon on transparent background, centred inside safe zone (Android adaptive)
- [x] Assets placed at `assets/icon.png` and `assets/adaptive-icon.png`
- [x] Update `app.json`: `icon`, `android.adaptiveIcon.foregroundImage`, `android.adaptiveIcon.backgroundColor: "#0F172A"`
- [x] Verify icon renders correctly on a physical Android device (EAS Preview APK build)
- [x] Removed all intermediate generated asset folders — single source of truth in `assets/`

**Exit criteria:** App icon is visible on the Android home screen with correct branding. ✓ Verified on physical device 2026-03-30.

---

## Phase 9: Responsive UI & Viewport Optimization ✅
**Goal:** Home Screen fits perfectly within the viewport on all device sizes — no scrolling required.

Home Screen layout optimized for all aspect ratios; eliminated scrolling using dynamic Flexbox distribution.

- [x] Replace `ScrollView` in `HomeScreen` with a no-scroll `View` using `flex: 1` + `justifyContent: 'space-between'`
- [x] Add `SafeAreaProvider` at App root; use `useSafeAreaInsets()` in `HomeScreen` for notch/home-indicator clearance
- [x] `rs()` responsive scale helper — scales sizes proportionally for screens shorter than 680dp reference height
- [x] Apply `rs()` to card row padding, diff row, segment height, footer gaps, and button padding
- [x] Apply `rs()` to `homeTitle` and `homeTitleSub` font sizes via inline style
- [x] Fix `DragonWatermark` `resizeMode` from `"stretch"` → `"cover"`
- [x] Verify layout on small (360×640) and large (412×915) device profiles

**Exit criteria:** Home Screen content fits without scrolling on all common Android screen sizes, with no clipping or overflow. ✓ Verified 2026-03-30.

---

## Phase 10: Security Hardening & Supply Chain Audit ✅
**Goal:** Secure the app's internal logic, data storage, and dependency chain before full production release.

- [x] `npm audit fix` — resolved 6 transitive vulnerabilities (1 critical Handlebars, 3 high: flatted/node-forge/picomatch, 2 moderate: brace-expansion/yaml)
- [x] Static analysis scan — no hardcoded API keys, secrets, or internal server paths found in source files
- [x] R8 (code shrinking + obfuscation) — enabled by default in EAS production AAB builds; verified no config disables it
- [x] `eas.json` production profile — `"jsEngine": "hermes"` explicitly declared
- [x] `babel.config.js` — `transform-remove-console` plugin strips all `console.log` (preserves `error`/`warn`) in `NODE_ENV=production` builds
- [x] `expo-secure-store` installed; plugin registered in `app.json`
- [x] `src/utils/security.ts` — `isSecureStoreAvailable` / `saveSecure` / `loadSecure` / `deleteSecure`; availability guard fixed (was checking function reference, not calling it)

**Exit criteria:** Zero `npm audit` vulnerabilities, no secrets in source, R8 on, console.log stripped in production, secure storage utility correctly typed and ready for integration. ✓ Verified 2026-03-30.

---

## Phase 11: Persistence & User Statistics
**Goal:** Persist game settings and track per-player statistics across sessions using the secure storage foundation from Phase 10.

- [ ] Define `UserStats` type: `gamesPlayed`, `wins`, `losses`, `winStreak`, `bestStreak` — keyed by `PlayerMode` + `Difficulty`
- [ ] `src/engine/statsEngine.ts` — pure functions: `recordResult`, `getStats`, `resetStats`
- [ ] Wire `recordResult` into `Board.tsx` win/timeout handlers
- [ ] Persist stats via `saveSecure` / `loadSecure` (key: `kamisado_stats_v1`)
- [ ] Persist last-used settings (board variant, game mode, difficulty) via `saveSecure` (key: `kamisado_settings_v1`)
- [ ] Hydrate settings on `HomeScreen` mount — restore user's last selections
- [ ] `StatsScreen` — new route showing lifetime stats per difficulty with gold accent highlights
- [ ] "Stats" button on `HomeScreen` (ghost/outline style, matching "How to play")

**Exit criteria:** Stats persist across app restarts; settings restored on relaunch; StatsScreen accessible from Home.
