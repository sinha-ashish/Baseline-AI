import { useEffect, useRef, useState } from "react";

function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Tweens between values when they change — the Measured-toggle drain.
 * With reduced motion the new value renders immediately.
 */
export function AnimatedNumber({
  value,
  format,
  durationMs = 800,
  className,
}: {
  value: number;
  format: (n: number) => string;
  durationMs?: number;
  className?: string;
}) {
  const [display, setDisplay] = useState(value);
  const fromRef = useRef(value);
  const rafRef = useRef(0);

  useEffect(() => {
    const from = fromRef.current;
    if (from === value || prefersReducedMotion() || window.innerHeight === 0) {
      fromRef.current = value;
      setDisplay(value);
      return;
    }
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - t, 3);
      const current = from + (value - from) * eased;
      setDisplay(current);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        fromRef.current = value;
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    // rAF pauses in hidden or zero-size viewports — guarantee the number
    // settles on the true value even if no frame ever fires.
    const settle = setTimeout(() => {
      fromRef.current = value;
      setDisplay(value);
    }, durationMs + 150);
    return () => {
      cancelAnimationFrame(rafRef.current);
      clearTimeout(settle);
    };
  }, [value, durationMs]);

  return <span className={className}>{format(display)}</span>;
}
