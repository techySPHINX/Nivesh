/**
 * Nivesh — Indian Amount Formatting Utility
 * Formats numbers in the Indian numbering system (lakhs, crores)
 */

/**
 * Format a number in the Indian numbering system with ₹ symbol.
 * Examples:
 *   formatAmount(40500.80)    → "₹40,500.80"
 *   formatAmount(100000)      → "₹1,00,000"
 *   formatAmount(25000000)    → "₹2,50,00,000"
 */
export function formatAmount(
  value: number,
  options?: {
    showSign?: boolean;
    decimals?: number;
    symbol?: string;
  },
): string {
  const { showSign = false, decimals = 2, symbol = '₹' } = options ?? {};

  const isNegative = value < 0;
  const absValue = Math.abs(value);

  const [intPart, decPart] = absValue.toFixed(decimals).split('.');

  // Indian grouping: first group of 3 from right, then groups of 2
  const formatted = formatIndianGrouping(intPart);
  const decimal = decimals > 0 ? `.${decPart}` : '';

  const sign = showSign ? (isNegative ? '-' : '+') : isNegative ? '-' : '';

  return `${sign}${symbol}${formatted}${decimal}`;
}

/**
 * Format a number with Indian grouping (e.g., 1,00,000).
 */
function formatIndianGrouping(numStr: string): string {
  if (numStr.length <= 3) return numStr;

  const lastThree = numStr.slice(-3);
  const remaining = numStr.slice(0, -3);

  // Group remaining digits in pairs from the right
  const pairs = remaining.replace(/\B(?=(\d{2})+(?!\d))/g, ',');

  return `${pairs},${lastThree}`;
}

/**
 * Abbreviate large amounts (Indian style: L for Lakhs, Cr for Crores).
 * Examples:
 *   abbreviateAmount(150000)    → "₹1.5L"
 *   abbreviateAmount(25000000)  → "₹2.5Cr"
 *   abbreviateAmount(5000)      → "₹5,000"
 */
export function abbreviateAmount(value: number, symbol = '₹'): string {
  const absValue = Math.abs(value);
  const sign = value < 0 ? '-' : '';

  if (absValue >= 10000000) {
    const crores = absValue / 10000000;
    return `${sign}${symbol}${formatDecimal(crores)}Cr`;
  }
  if (absValue >= 100000) {
    const lakhs = absValue / 100000;
    return `${sign}${symbol}${formatDecimal(lakhs)}L`;
  }
  if (absValue >= 1000) {
    const thousands = absValue / 1000;
    return `${sign}${symbol}${formatDecimal(thousands)}K`;
  }

  return `${sign}${symbol}${absValue}`;
}

function formatDecimal(num: number): string {
  if (Number.isInteger(num)) return num.toString();
  return num.toFixed(1).replace(/\.0$/, '');
}

/**
 * Speak amount for accessibility (screen readers).
 * Returns: "Rupees forty thousand five hundred and eighty paise"
 */
export function spokenAmount(value: number): string {
  const rupees = Math.floor(Math.abs(value));
  const paise = Math.round((Math.abs(value) - rupees) * 100);

  const parts: string[] = [];

  if (value < 0) parts.push('minus');
  parts.push('Rupees');
  parts.push(rupees.toLocaleString('en-IN'));

  if (paise > 0) {
    parts.push(`and ${paise} paise`);
  }

  return parts.join(' ');
}
