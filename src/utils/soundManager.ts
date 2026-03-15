/**
 * Sound Manager — expo-av pooled playback
 *
 * expo-av's top-level ExponentAV.js calls requireNativeModule('ExponentAV'),
 * which throws if the native module is absent. Even when caught, the throw
 * reaches React Native's async error infrastructure and surfaces in LogBox.
 *
 * Fix: call requireOptionalNativeModule('ExponentAV') first — it returns null
 * instead of throwing. We bail out before importing expo-av, so nothing ever
 * throws, and LogBox stays silent in Expo Go.
 *
 * Audio is fully functional in EAS production/preview builds where the native
 * module is compiled in. To activate sound FX:
 *   1. Drop .mp3 files into assets/sounds/
 *   2. Replace the null stubs in SOUND_SOURCES with require() calls
 */

import { requireOptionalNativeModule } from 'expo-modules-core';

export type SoundType = 'select' | 'slide' | 'win' | 'invalid' | 'warning';

// ---------------------------------------------------------------------------
// Asset map — swap nulls for require() calls once files are added
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const SOUND_SOURCES: Record<SoundType, any> = {
  select:  null, // require('../../assets/sounds/select.mp3')
  slide:   null, // require('../../assets/sounds/slide.mp3')
  win:     null, // require('../../assets/sounds/win.mp3')
  invalid: null, // require('../../assets/sounds/invalid.mp3')
  warning: null, // require('../../assets/sounds/warning.mp3')
};

// ---------------------------------------------------------------------------
// Pool — typed via a minimal interface so we don't import expo-av types here
// ---------------------------------------------------------------------------

interface PooledSound {
  replayAsync():  Promise<unknown>;
  unloadAsync():  Promise<unknown>;
}

const pool: Partial<Record<SoundType, PooledSound>> = {};

// ---------------------------------------------------------------------------
// Lifecycle
// ---------------------------------------------------------------------------

/**
 * Preloads all available sounds into memory.
 * Call once when the game board mounts.
 */
export async function initSounds(): Promise<void> {
  // requireOptionalNativeModule returns null (no throw) when the module is
  // absent, so this check is safe in both Expo Go and production builds.
  const exponentAV = requireOptionalNativeModule('ExponentAV');
  if (!exponentAV) return; // Expo Go — audio silently disabled

  // ExponentAV is present: now safe to import expo-av without triggering its
  // top-level requireNativeModule throw.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { Audio } = await import('expo-av') as { Audio: any };

  try {
    await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
  } catch {
    // Non-fatal — device may not support the call
  }

  const entries = Object.entries(SOUND_SOURCES) as [SoundType, unknown][];
  await Promise.all(
    entries.map(async ([type, source]) => {
      if (source === null || source === undefined) return;
      try {
        const { sound } = await Audio.Sound.createAsync(source, { shouldPlay: false });
        pool[type] = sound as PooledSound;
      } catch {
        // Asset missing or unplayable — playSound will be a no-op for this type
      }
    }),
  );
}

/**
 * Unloads all pooled sounds to free native memory.
 * Call when the game board unmounts.
 */
export async function unloadSounds(): Promise<void> {
  await Promise.all(
    Object.values(pool).map(s => s.unloadAsync().catch(() => undefined)),
  );
  (Object.keys(pool) as SoundType[]).forEach(k => { delete pool[k]; });
}

// ---------------------------------------------------------------------------
// Playback
// ---------------------------------------------------------------------------

/**
 * Plays a pooled sound. Fire-and-forget — resets position so rapid repeats
 * work correctly. No-op if audio is unavailable or the asset is not loaded.
 */
export function playSound(type: SoundType): void {
  const sound = pool[type];
  if (!sound) return;
  sound.replayAsync().catch(() => undefined);
}
