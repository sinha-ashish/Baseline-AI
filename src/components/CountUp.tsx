import { useEffect, useRef, useState } from "react";

function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Counts up from 0 once the element scrolls into view. With reduced motion
 * the final value renders immediately.
 */
export function CountUp({
  value,
  format,
  durationMs = 1400,
  delayMs = 0,
  className,
}: {
  value: number;
  format: (n: number) => string;
  durationMs?: number;
  delayMs?: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const [display, setDisplay] = useState(() => (prefersReducedMotion() ? value : 0));
  const startedRef = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || prefersReducedMotion()) {
      setDisplay(value);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0].isIntersecting || startedRef.current) return;
        startedRef.current = true;
        observer.disconnect();
        let raf = 0;
        const start = performance.now() + delayMs;
        const tick = (now: number) => {
          const t = Math.min(1, Math.max(0, (now - start) / durationMs));
          const eased = 1 - Math.pow(1 - t, 3);
          setDisplay(value * eased);
          if (t < 1) raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(raf);
      },
      { threshold: 0.4 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [value, durationMs, delayMs]);

  return (
    <span ref={ref} className={className}>
      {format(display)}
    </span>
  );
}
