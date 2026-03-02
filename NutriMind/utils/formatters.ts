/**
 * Date formatting utilities for surgery dates.
 *
 * Handles inputs that may be:
 *  - A Firestore Timestamp object (has .toDate())
 *  - An ISO date string  ("2026-01-15")
 *  - A US-formatted string ("01/15/2026")
 *  - A plain JS Date
 *  - null / undefined
 */

/** Convert any date-like input into a JS Date (or null if invalid). */
function toDate(input: unknown): Date | null {
  if (!input) return null;

  // Firestore Timestamp object
  if (typeof input === "object" && input !== null && "toDate" in input && typeof (input as any).toDate === "function") {
    const d = (input as any).toDate();
    return isNaN(d.getTime()) ? null : d;
  }

  // Already a Date
  if (input instanceof Date) {
    return isNaN(input.getTime()) ? null : input;
  }

  // String
  if (typeof input === "string") {
    // US format MM/DD/YYYY
    if (input.includes("/")) {
      const parts = input.split("/");
      if (parts.length === 3) {
        const month = parseInt(parts[0], 10) - 1;
        const day = parseInt(parts[1], 10);
        const year = parseInt(parts[2], 10);
        const d = new Date(year, month, day);
        return isNaN(d.getTime()) ? null : d;
      }
    }
    // ISO or other parseable format
    const d = new Date(input);
    return isNaN(d.getTime()) ? null : d;
  }

  return null;
}

/**
 * Format a surgery date as "Month Year" (e.g. "January 2026").
 * Hides the exact day for PHI privacy.
 */
export function formatSurgeryMonthYear(dateInput: unknown): string {
  const d = toDate(dateInput);
  if (!d) return "Not provided";
  return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

/**
 * Calculate a human-friendly post-op time string.
 *
 * - Future date  →  "Pre-Op"
 * - < 4 weeks    →  "X Days Post-Op"
 * - 4–12 weeks   →  "X Weeks Post-Op"
 * - > 12 weeks   →  "X Months Post-Op"
 *
 * Returns null when the date is missing / invalid.
 */
export function calculatePostOpTime(dateInput: unknown): string | null {
  const surgeryDate = toDate(dateInput);
  if (!surgeryDate) return null;

  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const sd = new Date(surgeryDate);
  sd.setHours(0, 0, 0, 0);

  const diffMs = now.getTime() - sd.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  // Surgery is in the future
  if (diffDays < 0) return "Pre-Op";

  // Less than 4 weeks (28 days)
  if (diffDays < 28) {
    return `${diffDays} ${diffDays === 1 ? "Day" : "Days"} Post-Op`;
  }

  // 4–12 weeks
  if (diffDays <= 84) {
    const weeks = Math.floor(diffDays / 7);
    return `${weeks} ${weeks === 1 ? "Week" : "Weeks"} Post-Op`;
  }

  // More than 12 weeks – show months
  const months = Math.floor(diffDays / 30);
  return `${months} ${months === 1 ? "Month" : "Months"} Post-Op`;
}
