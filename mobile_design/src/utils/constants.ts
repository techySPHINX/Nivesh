/**
 * Nivesh — App Constants
 */

export const APP_NAME = 'Nivesh';
export const APP_TAGLINE = 'Your AI Financial Strategist';

/** Indian fiscal year: April 1 – March 31 */
export const FISCAL_YEAR_START_MONTH = 3; // April (0-indexed)
export const FISCAL_YEAR_END_MONTH = 2; // March (0-indexed)

/** Tax constants (FY 2025-26) */
export const TAX = {
  SECTION_80C_LIMIT: 150000,
  SECTION_80D_SELF: 25000,
  SECTION_80D_SENIOR: 50000,
  NPS_80CCD_1B: 50000,
  STANDARD_DEDUCTION: 50000,
} as const;

/** Animation durations (ms) */
export const SPLASH_DURATION = 1500;
export const TOAST_DURATION = 3000;
export const DEBOUNCE_SEARCH = 300;
export const OTP_RESEND_TIMER = 30;
export const PIN_LENGTH = 4;
export const OTP_LENGTH = 6;

/** API */
export const API_TIMEOUT = 15000;
export const REFRESH_INTERVAL = 60000; // 1 minute

/** Pagination */
export const PAGE_SIZE = 20;

/** Bottom Tab */
export const TAB_BAR_HEIGHT = 56;
export const TAB_CENTER_BUTTON_SIZE = 56;

/** Investment Instruments */
export const INSTRUMENTS = {
  MF: { label: 'Mutual Fund', abbr: 'MF', color: '#4F46E5' },
  SIP: { label: 'SIP', abbr: 'SIP', color: '#059669' },
  FD: { label: 'Fixed Deposit', abbr: 'FD', color: '#D97706' },
  PPF: { label: 'PPF', abbr: 'PPF', color: '#7C3AED' },
  NPS: { label: 'NPS', abbr: 'NPS', color: '#2563EB' },
  RD: { label: 'Recurring Deposit', abbr: 'RD', color: '#DC2626' },
  EPF: { label: 'EPF', abbr: 'EPF', color: '#0891B2' },
  EQ: { label: 'Equity', abbr: 'EQ', color: '#16A34A' },
  GOLD: { label: 'Gold/SGBs', abbr: 'GOLD', color: '#CA8A04' },
  RE: { label: 'Real Estate', abbr: 'RE', color: '#9333EA' },
} as const;
