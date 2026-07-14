import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Returns the current date in YYYY-MM-DD format based on Brasília Time (UTC-3).
 * This ensures correct overdue calculations regardless of the user's local timezone.
 */
export function getBRTToday(): string {
  const d = new Date();
  const utc = d.getTime() + (d.getTimezoneOffset() * 60000);
  const brt = new Date(utc - (3600000 * 3));
  return brt.toISOString().split("T")[0];
}
