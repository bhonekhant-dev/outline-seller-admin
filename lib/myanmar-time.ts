/**
 * Myanmar timezone utilities
 * Myanmar Standard Time (MMT) is UTC+6:30
 */

export const MYANMAR_OFFSET_MS = 6.5 * 60 * 60 * 1000; // 6 hours 30 minutes in milliseconds

/**
 * Convert a UTC date to Myanmar timezone
 */
export function toMyanmarTime(utcDate: Date): Date {
  return new Date(utcDate.getTime() + MYANMAR_OFFSET_MS);
}

/**
 * Convert a Myanmar timezone date to UTC
 */
export function fromMyanmarTime(myanmarDate: Date): Date {
  return new Date(myanmarDate.getTime() - MYANMAR_OFFSET_MS);
}

/**
 * Get current time in Myanmar timezone
 */
export function nowInMyanmar(): Date {
  return toMyanmarTime(new Date());
}

/**
 * Calculate expiry date based on Myanmar timezone
 * This ensures consistent day-based calculations regardless of server timezone
 */
export function calculateExpiry(planDays: number, fromDate = new Date()): Date {
  const myanmarTime = toMyanmarTime(fromDate);
  
  // Set to start of day in Myanmar timezone for consistent expiry times
  const startOfDay = new Date(myanmarTime.getFullYear(), myanmarTime.getMonth(), myanmarTime.getDate());
  
  // Add plan days and convert back to UTC for storage
  const expiryInMyanmar = new Date(startOfDay.getTime() + planDays * 24 * 60 * 60 * 1000);
  return fromMyanmarTime(expiryInMyanmar);
}

/**
 * Extend expiry date based on Myanmar timezone
 */
export function extendExpiry(currentExpiry: Date, planDays: number): Date {
  const now = nowInMyanmar();
  const currentInMyanmar = toMyanmarTime(currentExpiry);
  
  // Use current expiry if it's in the future, otherwise use current Myanmar time
  const base = currentInMyanmar.getTime() > now.getTime() ? currentInMyanmar : now;
  
  // Set to start of day in Myanmar timezone for consistent expiry times
  const startOfDay = new Date(base.getFullYear(), base.getMonth(), base.getDate());
  
  // Add plan days and convert back to UTC for storage
  const expiryInMyanmar = new Date(startOfDay.getTime() + planDays * 24 * 60 * 60 * 1000);
  return fromMyanmarTime(expiryInMyanmar);
}

/**
 * Format date for display in Myanmar locale and timezone
 */
export function formatMyanmarDate(utcDate: Date | string): string {
  const date = typeof utcDate === 'string' ? new Date(utcDate) : utcDate;
  const myanmarDate = toMyanmarTime(date);
  
  return new Intl.DateTimeFormat("en-MM", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    timeZone: "UTC", // We manually converted to Myanmar time, so display as UTC
  }).format(myanmarDate);
}

/**
 * Check if a customer is expired based on Myanmar timezone
 */
export function isExpiredInMyanmar(expiryDate: Date): boolean {
  const now = nowInMyanmar();
  const expiryInMyanmar = toMyanmarTime(expiryDate);
  return expiryInMyanmar.getTime() <= now.getTime();
}