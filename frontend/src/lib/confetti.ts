import confetti from "canvas-confetti";

const COLORS = ["#7C6BF2", "#EF6F91", "#FF7A45", "#E0A458", "#3FBF7F", "#5B8DEF"];

/** Tasteful celebratory burst — used when an idea is marked Finished. */
export function celebrate() {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const defaults = { spread: 70, ticks: 90, gravity: 0.9, decay: 0.92, startVelocity: 32, colors: COLORS };
  confetti({ ...defaults, particleCount: 60, origin: { x: 0.5, y: 0.55 }, scalar: 0.9 });
  setTimeout(() => confetti({ ...defaults, particleCount: 30, angle: 60, origin: { x: 0, y: 0.7 } }), 120);
  setTimeout(() => confetti({ ...defaults, particleCount: 30, angle: 120, origin: { x: 1, y: 0.7 } }), 120);
}
