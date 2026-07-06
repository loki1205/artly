import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function timeAgo(iso: string | null | undefined): string {
  if (!iso) return "";
  const then = new Date(iso).getTime();
  const secs = Math.max(1, Math.floor((Date.now() - then) / 1000));
  const table: [number, string][] = [
    [60, "s"],
    [3600, "m"],
    [86400, "h"],
    [604800, "d"],
    [2629800, "w"],
  ];
  if (secs < 60) return "just now";
  let unit = "s";
  let value = secs;
  for (let i = 0; i < table.length; i++) {
    const [limit, label] = table[i];
    if (secs < limit) break;
    const [nextLimit] = table[i + 1] ?? [Infinity];
    value = Math.floor(secs / limit);
    unit = label;
    if (secs < nextLimit) break;
  }
  return `${value}${unit} ago`;
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
