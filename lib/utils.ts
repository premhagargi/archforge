import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merge Tailwind class names with correct precedence.
 * `clsx` resolves conditionals/arrays; `twMerge` dedupes conflicting
 * Tailwind utilities (e.g. `px-2 px-4` -> `px-4`).
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/** Format a byte count into a human-readable string (1024-based). */
export function formatBytes(bytes: number, fractionDigits = 1): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB", "PB"];
  const exponent = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1,
  );
  const value = bytes / Math.pow(1024, exponent);
  return `${value.toFixed(exponent === 0 ? 0 : fractionDigits)} ${units[exponent]}`;
}

/** Format a large count with compact suffixes (1.2K, 3.4M, 1.1B). */
export function formatCompact(value: number, fractionDigits = 1): string {
  if (!Number.isFinite(value)) return "0";
  const abs = Math.abs(value);
  if (abs < 1000) return `${Math.round(value)}`;
  const units = [
    { v: 1e9, s: "B" },
    { v: 1e6, s: "M" },
    { v: 1e3, s: "K" },
  ];
  for (const { v, s } of units) {
    if (abs >= v) return `${(value / v).toFixed(fractionDigits)}${s}`;
  }
  return `${Math.round(value)}`;
}

/** Round a number to a fixed number of decimals, returning a number. */
export function round(value: number, decimals = 2): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

/** Create a URL-safe slug from arbitrary text. */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

/**
 * Generate a short, collision-resistant id without external deps.
 * Uses crypto.randomUUID when available, otherwise a timestamp+random fallback.
 */
export function createId(prefix = "id"): string {
  const cryptoObj =
    typeof globalThis !== "undefined"
      ? (globalThis.crypto as Crypto | undefined)
      : undefined;
  if (cryptoObj?.randomUUID) {
    return `${prefix}_${cryptoObj.randomUUID().slice(0, 8)}`;
  }
  const rand = Math.random().toString(36).slice(2, 10);
  return `${prefix}_${Date.now().toString(36)}${rand}`;
}
