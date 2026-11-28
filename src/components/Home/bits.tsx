import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useReducedMotion } from 'motion/react';

/** Upstream number animation with live reduced-motion support and stable frame cleanup. */
export function CountUp({ value, duration = 700, className }: { value: number; duration?: number; className?: string }) {
  const reduced = useReducedMotion();
  const [number, setNumber] = useState(value);
  const current = useRef(value);
  useEffect(() => {
    if (reduced || duration <= 0) { current.current = value; return; }
    const from = current.current;
    const start = performance.now();
    let frame = 0;
    const tick = (time: number) => {
      const progress = Math.min(1, Math.max(0, (time - start) / duration));
      const next = Math.round(from + (value - from) * (1 - Math.pow(1 - progress, 3)));
      current.current = next;
      setNumber(next);
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, duration, reduced]);
  return <span className={className} aria-label={String(value)}>{reduced || duration <= 0 ? value : number}</span>;
}

/** SVG progress design from upstream; text always exposes the final accessible value. */
export function ProgressRing({ value, children }: { value: number; children: ReactNode }) {
  const percent = Math.round(Math.min(1, Math.max(0, value)) * 100);
  const radius = 29.5;
  const circumference = 2 * Math.PI * radius;
  return (
    <span className="relative inline-flex h-16 w-16 shrink-0 items-center justify-center" role="progressbar"
      aria-label="Progresso de hoje" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent}>
      <svg width="64" height="64" viewBox="0 0 64 64" aria-hidden="true" className="-rotate-90">
        <circle cx="32" cy="32" r={radius} fill="none" stroke="currentColor" strokeWidth="5" className="text-borda" />
        <circle cx="32" cy="32" r={radius} fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round"
          className="text-primaria motion-safe:transition-[stroke-dashoffset] motion-safe:duration-700"
          style={{ strokeDasharray: circumference, strokeDashoffset: circumference * (1 - percent / 100) }} />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center">{children}</span>
    </span>
  );
}
