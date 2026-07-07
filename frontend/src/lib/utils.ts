import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function timeAgo(iso: string | null | undefined): string {
  if (!iso) return "";
  const then = new Date(iso).getTime();
  const secs = Math.max(1, Math.floor((Date.now() - then) / 1000));
  if (secs < 60) return "just now";
  // [size in seconds, label], largest first. Show the biggest unit that fits.
  const units: [number, string][] = [
    [604800, "w"],
    [86400, "d"],
    [3600, "h"],
    [60, "m"],
  ];
  for (const [size, label] of units) {
    if (secs >= size) return `${Math.floor(secs / size)}${label} ago`;
  }
  return "just now";
}

/**
 * Deterministic placeholder for ideas without a cover image. Muted and warm on
 * purpose — clay / sand / ochre in a narrow hue band and low saturation, so
 * covers read as a quiet part of the palette rather than rainbow chips.
 */
export function coverGradient(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  const hue = 18 + (h % 42); // 18–60°: clay → sand → ochre
  const sat = 15 + (h % 9); // 15–23%: muted
  return `linear-gradient(150deg, hsl(${hue} ${sat}% 60%), hsl(${hue + 12} ${sat + 5}% 47%))`;
}
