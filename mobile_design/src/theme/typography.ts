/**
 * Nivesh Design System — Typography Tokens
 * Font: Inter (primary) + Noto Sans Devanagari (Hindi fallback)
 */

export const fontFamily = {
  regular: 'Inter-Regular',
  medium: 'Inter-Medium',
  semiBold: 'Inter-SemiBold',
  bold: 'Inter-Bold',
  extraBold: 'Inter-ExtraBold',
  hindi: 'NotoSansDevanagari-Regular',
  hindiBold: 'NotoSansDevanagari-Bold',
} as const;

export const typeScale = {
  displayLarge: {
    fontFamily: fontFamily.extraBold,
    fontSize: 40,
    lineHeight: 48,
  },
  displayMedium: {
    fontFamily: fontFamily.bold,
    fontSize: 32,
    lineHeight: 40,
  },
  displaySmall: {
    fontFamily: fontFamily.bold,
    fontSize: 28,
    lineHeight: 36,
  },
  headingLarge: {
    fontFamily: fontFamily.semiBold,
    fontSize: 24,
    lineHeight: 32,
  },
  headingMedium: {
    fontFamily: fontFamily.semiBold,
    fontSize: 20,
    lineHeight: 28,
  },
  headingSmall: {
    fontFamily: fontFamily.semiBold,
    fontSize: 18,
    lineHeight: 24,
  },
  bodyLarge: {
    fontFamily: fontFamily.regular,
    fontSize: 16,
    lineHeight: 24,
  },
  bodyMedium: {
    fontFamily: fontFamily.regular,
    fontSize: 14,
    lineHeight: 20,
  },
  bodySmall: {
    fontFamily: fontFamily.regular,
    fontSize: 12,
    lineHeight: 16,
  },
  labelLarge: {
    fontFamily: fontFamily.medium,
    fontSize: 14,
    lineHeight: 20,
  },
  labelMedium: {
    fontFamily: fontFamily.medium,
    fontSize: 12,
    lineHeight: 16,
  },
  labelSmall: {
    fontFamily: fontFamily.medium,
    fontSize: 10,
    lineHeight: 14,
  },
} as const;

export type TypeVariant = keyof typeof typeScale;
