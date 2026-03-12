/**
 * Nivesh Design System — Color Tokens
 * Based on Beige Tetradic Palette + Functional Colors
 */

export const palette = {
  // === PRIMARY BEIGE PALETTE ===
  beige: {
    50: '#FAF8F0',
    100: '#F5F0E1',
    200: '#EDE8D0',
    300: '#E0D9BF',
    400: '#C9C1A4',
    500: '#A89E7E',
    600: '#8A8064',
    700: '#6B624D',
    800: '#4D4537',
    900: '#2F2A22',
  },

  // === MINT (Success / Income / Positive) ===
  mint: {
    50: '#F0FAF3',
    100: '#E8F5EC',
    200: '#D0EDDA',
    300: '#A8D9B8',
    400: '#7CC498',
    500: '#4DAF75',
    600: '#2E9E5A',
    700: '#1F7A43',
    800: '#155A31',
    900: '#0D3B20',
  },

  // === LAVENDER (AI / Analytics / Info) ===
  lavender: {
    50: '#F0F1FA',
    100: '#E8E9F5',
    200: '#D0D5ED',
    300: '#B0B8D9',
    400: '#8E99C7',
    500: '#6E7BB5',
    600: '#5563A0',
    700: '#424E82',
    800: '#313A63',
    900: '#212745',
  },

  // === ROSE (Alerts / Expenses / Negative) ===
  rose: {
    50: '#FAF0F5',
    100: '#F5E8EE',
    200: '#EDD0E4',
    300: '#D9A8C4',
    400: '#C780A5',
    500: '#B55A88',
    600: '#9E3D6E',
    700: '#7D2F56',
    800: '#5C223F',
    900: '#3D162A',
  },

  // === ACCENT YELLOW (CTAs / Primary Actions) ===
  yellow: {
    50: '#FFFEF5',
    100: '#FFF9DB',
    200: '#FFF0A8',
    300: '#FFE676',
    400: '#FFD84D',
    500: '#F5C518',
    600: '#E0B200',
    700: '#B88E00',
    800: '#8A6B00',
    900: '#5C4700',
  },

  // === NEUTRALS ===
  neutral: {
    0: '#FFFFFF',
    50: '#FAFAFA',
    100: '#F5F5F5',
    200: '#E5E5E5',
    300: '#D4D4D4',
    400: '#A3A3A3',
    500: '#737373',
    600: '#525252',
    700: '#404040',
    800: '#262626',
    900: '#171717',
    1000: '#000000',
  },

  // === SEMANTIC ===
  income: '#2E9E5A',
  expense: '#D64545',
  warning: '#E0A800',
  info: '#4F7BD6',
  error: '#D64545',
  success: '#2E9E5A',
} as const;

export const lightTheme = {
  // === BACKGROUNDS ===
  background: palette.beige[50],
  backgroundSecondary: palette.beige[100],
  surface: palette.neutral[0],
  surfaceElevated: palette.neutral[0],

  // === TEXT ===
  textPrimary: '#1A1A2E',
  textSecondary: '#6B6B80',
  textTertiary: '#9E9EB0',
  textInverse: '#FFFFFF',
  textLink: palette.lavender[600],

  // === ACCENT ===
  accent: palette.yellow[500],
  accentPressed: palette.yellow[600],
  accentLight: palette.yellow[100],

  // === STATUS ===
  income: palette.mint[600],
  incomeBackground: palette.mint[100],
  expense: '#D64545',
  expenseBackground: palette.rose[100],
  warning: palette.yellow[600],
  warningBackground: palette.yellow[100],
  info: palette.lavender[600],
  infoBackground: palette.lavender[100],
  success: palette.mint[600],
  successBackground: palette.mint[100],
  error: '#D64545',
  errorBackground: '#FFF0F0',

  // === BORDERS & DIVIDERS ===
  border: palette.neutral[200],
  borderLight: palette.neutral[100],
  divider: palette.neutral[200],

  // === INTERACTIVE ===
  buttonPrimary: palette.yellow[500],
  buttonPrimaryText: '#1A1A2E',
  buttonSecondary: palette.beige[200],
  buttonSecondaryText: '#1A1A2E',
  buttonGhost: 'transparent',
  buttonGhostText: '#1A1A2E',
  buttonDanger: '#D64545',
  buttonDangerText: '#FFFFFF',
  buttonDisabled: palette.neutral[200],
  buttonDisabledText: palette.neutral[400],

  // === NAVIGATION ===
  tabBarBackground: palette.neutral[0],
  tabBarActive: palette.yellow[500],
  tabBarInactive: palette.neutral[400],
  tabBarBorder: palette.neutral[200],

  // === AI / CHAT ===
  aiBackground: palette.lavender[100],
  aiBubble: palette.lavender[100],
  userBubble: palette.beige[200],
  chatBackground: palette.beige[50],

  // === CARDS ===
  cardBackground: palette.neutral[0],
  cardBorder: palette.neutral[200],

  // === OVERLAY ===
  overlay: 'rgba(0,0,0,0.5)',
  overlayLight: 'rgba(0,0,0,0.1)',

  // === SKELETON ===
  skeletonBase: palette.neutral[200],
  skeletonHighlight: palette.neutral[100],
} as const;

export const darkTheme: typeof lightTheme = {
  // === BACKGROUNDS ===
  background: '#0D0D1A',
  backgroundSecondary: '#15152A',
  surface: '#1A1A2E',
  surfaceElevated: '#222240',

  // === TEXT ===
  textPrimary: '#F5F0E1',
  textSecondary: '#A0A0B0',
  textTertiary: '#6B6B80',
  textInverse: '#1A1A2E',
  textLink: palette.lavender[300],

  // === ACCENT ===
  accent: palette.yellow[500],
  accentPressed: palette.yellow[600],
  accentLight: 'rgba(245,197,24,0.15)',

  // === STATUS ===
  income: '#4ADE80',
  incomeBackground: 'rgba(74,222,128,0.15)',
  expense: '#F87171',
  expenseBackground: 'rgba(248,113,113,0.15)',
  warning: palette.yellow[400],
  warningBackground: 'rgba(245,197,24,0.15)',
  info: palette.lavender[300],
  infoBackground: 'rgba(176,184,217,0.15)',
  success: '#4ADE80',
  successBackground: 'rgba(74,222,128,0.15)',
  error: '#F87171',
  errorBackground: 'rgba(248,113,113,0.15)',

  // === BORDERS & DIVIDERS ===
  border: '#2A2A3E',
  borderLight: '#222240',
  divider: '#2A2A3E',

  // === INTERACTIVE ===
  buttonPrimary: palette.yellow[500],
  buttonPrimaryText: '#1A1A2E',
  buttonSecondary: '#2A2A3E',
  buttonSecondaryText: '#F5F0E1',
  buttonGhost: 'transparent',
  buttonGhostText: '#F5F0E1',
  buttonDanger: '#F87171',
  buttonDangerText: '#1A1A2E',
  buttonDisabled: '#2A2A3E',
  buttonDisabledText: '#6B6B80',

  // === NAVIGATION ===
  tabBarBackground: '#1A1A2E',
  tabBarActive: palette.yellow[500],
  tabBarInactive: '#6B6B80',
  tabBarBorder: '#2A2A3E',

  // === AI / CHAT ===
  aiBackground: 'rgba(176,184,217,0.1)',
  aiBubble: '#222240',
  userBubble: '#2A2A3E',
  chatBackground: '#0D0D1A',

  // === CARDS ===
  cardBackground: '#1A1A2E',
  cardBorder: '#2A2A3E',

  // === OVERLAY ===
  overlay: 'rgba(0,0,0,0.7)',
  overlayLight: 'rgba(0,0,0,0.3)',

  // === SKELETON ===
  skeletonBase: '#2A2A3E',
  skeletonHighlight: '#222240',
} as const;

export const gradients = {
  card: ['#F5F0E1', '#FAF8F0'],
  hero: ['#EDE8D0', '#D0EDDA'],
  ai: ['#D0D5ED', '#E8E9F5'],
  alert: ['#EDD0E4', '#F5E8EE'],
  accent: ['#F5C518', '#FFD84D'],
  cardDark: ['#1A1A2E', '#222240'],
  heroDark: ['#0D0D1A', '#15152A'],
} as const;

export type ThemeColors = typeof lightTheme;
