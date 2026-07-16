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

export function toDatetimeLocal(isoStr: string | null | undefined): string {
  if (!isoStr) return "";
  
  // If it's a date-only string like YYYY-MM-DD
  if (isoStr.length === 10 && !isoStr.includes("T")) {
    return `${isoStr}T00:00`;
  }
  
  const d = new Date(isoStr);
  if (isNaN(d.getTime())) return "";
  
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function fromDatetimeLocal(localStr: string | null | undefined): string | null {
  if (!localStr) return null;
  const d = new Date(localStr);
  if (isNaN(d.getTime())) return null;
  return d.toISOString();
}

export function formatTaskDueDate(isoStr: string | null | undefined): string {
  if (!isoStr) return "";
  if (isoStr.length === 10 && !isoStr.includes("T")) {
    const [y, m, d] = isoStr.split("-");
    const date = new Date(Number(y), Number(m) - 1, Number(d));
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  }
  const d = new Date(isoStr);
  if (isNaN(d.getTime())) return "";
  
  const dateStr = d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  const timeStr = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  
  if (timeStr === "00:00") {
    return dateStr;
  }
  return `${dateStr}, ${timeStr}`;
}

export function isTaskOverdue(dueDateStr: string | null | undefined): boolean {
  if (!dueDateStr) return false;
  
  if (dueDateStr.length === 10 && !dueDateStr.includes("T")) {
    const [y, m, d] = dueDateStr.split("-");
    const endOfDay = new Date(Number(y), Number(m) - 1, Number(d), 23, 59, 59);
    return new Date() > endOfDay;
  }
  
  const due = new Date(dueDateStr);
  if (isNaN(due.getTime())) return false;
  
  return new Date() > due;
}



