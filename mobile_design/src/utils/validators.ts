/**
 * Nivesh — Indian Financial Validators
 * PAN, Aadhaar, IFSC, UPI ID, Mobile Number validation
 */

/** Validate Indian PAN number (e.g., ABCDE1234F) */
export function isValidPAN(pan: string): boolean {
  return /^[A-Z]{5}[0-9]{4}[A-Z]$/.test(pan.toUpperCase());
}

/** Validate Aadhaar number (12 digits, basic Verhoeff check omitted for speed) */
export function isValidAadhaar(aadhaar: string): boolean {
  const cleaned = aadhaar.replace(/\s/g, '');
  return /^[2-9]\d{11}$/.test(cleaned);
}

/** Validate IFSC code (e.g., SBIN0001234) */
export function isValidIFSC(ifsc: string): boolean {
  return /^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc.toUpperCase());
}

/** Validate UPI ID (e.g., user@upi, number@paytm) */
export function isValidUPI(upi: string): boolean {
  return /^[\w.\-]+@[\w]+$/.test(upi);
}

/** Validate Indian mobile number (10 digits starting with 6-9) */
export function isValidMobile(mobile: string): boolean {
  const cleaned = mobile.replace(/[\s\-+]/g, '');
  // With country code
  if (cleaned.startsWith('91') && cleaned.length === 12) {
    return /^91[6-9]\d{9}$/.test(cleaned);
  }
  // Without country code
  return /^[6-9]\d{9}$/.test(cleaned);
}

/** Validate Indian bank account number (9-18 digits) */
export function isValidAccountNumber(account: string): boolean {
  const cleaned = account.replace(/\s/g, '');
  return /^\d{9,18}$/.test(cleaned);
}

/** Format PAN for display (ABCDE1234F → ABCDE****F for masking) */
export function maskPAN(pan: string): string {
  if (pan.length !== 10) return pan;
  return `${pan.slice(0, 5)}****${pan.slice(9)}`;
}

/** Format Aadhaar for display (1234 5678 9012 → XXXX XXXX 9012) */
export function maskAadhaar(aadhaar: string): string {
  const cleaned = aadhaar.replace(/\s/g, '');
  if (cleaned.length !== 12) return aadhaar;
  return `XXXX XXXX ${cleaned.slice(8)}`;
}

/** Format mobile for display (9876543210 → ****3210) */
export function maskMobile(mobile: string): string {
  if (mobile.length < 4) return mobile;
  return `****${mobile.slice(-4)}`;
}
