/**
 * Nivesh Design System — Animation Presets
 * Used with react-native-reanimated
 */

import { Easing } from 'react-native-reanimated';

export const animationDuration = {
  instant: 100,
  fast: 150,
  normal: 200,
  slow: 300,
  slower: 600,
  slowest: 1000,
} as const;

export const springConfigs = {
  /** Gentle spring for card press/release */
  gentle: {
    damping: 15,
    stiffness: 150,
    mass: 1,
  },
  /** Responsive spring for most interactions */
  responsive: {
    damping: 20,
    stiffness: 300,
    mass: 1,
  },
  /** Bouncy spring for success/celebration  */
  bouncy: {
    damping: 12,
    stiffness: 200,
    mass: 1,
  },
  /** Snappy for bottom sheet drag */
  snappy: {
    damping: 20,
    stiffness: 400,
    mass: 0.8,
  },
} as const;

export const easingPresets = {
  standard: Easing.bezier(0.25, 0.1, 0.25, 1),
  decelerate: Easing.out(Easing.cubic),
  accelerate: Easing.in(Easing.cubic),
  sharp: Easing.bezier(0.4, 0, 0.2, 1),
} as const;

export const skeletonTiming = {
  duration: 1500,
  easing: Easing.linear,
} as const;
