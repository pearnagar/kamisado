/**
 * ChessClock — self-contained countdown timer.
 *
 * Performance contract:
 *   - All time-keeping is local state. No parent re-renders are caused by the
 *     interval tick. The parent only responds to the `onTimeOut` callback.
 *   - Reset behaviour: this component is designed to be remounted via React's
 *     `key` prop whenever the clock should reset (new round, new game).
 *     That avoids any "reset effect" and keeps the implementation minimal.
 *
 * Two effects:
 *   1. Interval effect  — starts/stops the 1 s tick based on `isActive`.
 *   2. Timeout effect   — fires `onTimeOut` exactly when `seconds` hits 0.
 */

import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';

const LOW_TIME_THRESHOLD = 30; // seconds — display turns red below this

interface ChessClockProps {
  /** Player label shown above the time ("White" | "Black"). */
  label:          string;
  /** Whether this player's clock is currently running. */
  isActive:       boolean;
  /** Starting time in seconds. Treated as the initial value on mount. */
  initialSeconds: number;
  /** Called once when the clock reaches 0. */
  onTimeOut:      () => void;
}

function formatTime(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function ChessClock({
  label,
  isActive,
  initialSeconds,
  onTimeOut,
}: ChessClockProps): React.JSX.Element {
  const [seconds, setSeconds] = useState(initialSeconds);

  // Always-current ref so the timeout effect never captures a stale callback.
  const onTimeOutRef = useRef(onTimeOut);
  onTimeOutRef.current = onTimeOut;

  // --- Effect 1: interval tick ---
  // Only runs while isActive. Uses the functional setState form so it never
  // needs `seconds` as a dependency — no interval restart every second.
  useEffect(() => {
    if (!isActive || seconds <= 0) return;

    const id = setInterval(() => {
      setSeconds(prev => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive]); // intentionally excludes `seconds`

  // --- Effect 2: timeout trigger ---
  // Fires once when seconds reaches 0. The ref prevents stale-closure issues.
  useEffect(() => {
    if (seconds === 0) {
      onTimeOutRef.current();
    }
  }, [seconds]);

  const isLow     = seconds > 0 && seconds <= LOW_TIME_THRESHOLD;
  const timeStyle = [
    styles.time,
    isLow     && styles.timeLow,
    !isActive && styles.timeDim,
  ];

  return (
    <View style={[styles.container, isActive && styles.containerActive]}>
      <Text style={styles.label}>{label}</Text>
      <Text style={timeStyle}>{formatTime(seconds)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical:   7,
    paddingHorizontal: 16,
    borderRadius:      10,
    borderWidth:       1,
    borderColor:       'rgba(255,255,255,0.12)',
    backgroundColor:   'rgba(255,255,255,0.05)',
    alignItems:        'center',
    minWidth:          88,
  },
  containerActive: {
    borderColor:     'rgba(255,255,255,0.30)',
    backgroundColor: 'rgba(255,255,255,0.10)',
  },
  label: {
    color:         'rgba(255,255,255,0.40)',
    fontSize:      10,
    fontWeight:    '600',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom:  2,
  },
  time: {
    color:         'rgba(255,255,255,0.88)',
    fontSize:      20,
    fontWeight:    '700',
    letterSpacing: 1,
    fontVariant:   ['tabular-nums'],
  },
  timeLow: {
    color: '#FF4444',
  },
  timeDim: {
    color: 'rgba(255,255,255,0.30)',
  },
});
