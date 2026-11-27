import { useEffect, useRef, useState } from 'react';

const reduceMotion = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Número que sobe de 0 até `value` (padrão React Bits, mas em rAF puro, sem dependência). */
export function CountUp({ value, duration = 700, className }: { value: number; duration?: number; className?: string }) {
  const [n, setN] = useState(reduceMotion() ? value : 0);
  const ref = useRef(0);
  useEffect(() => {
    if (reduceMotion()) { setN(value); return; }
    const from = ref.current;
    const start = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3); // easeOutCubic
      setN(Math.round(from + (value - from) * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
      else ref.current = value;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);
  return <span className={className}>{n}</span>;
}

/** Anel de progresso em SVG; o arco cresce ao montar (CSS transition no stroke-dashoffset). */
export function ProgressRing({ value, size = 56, stroke = 5, children }: { value: number; size?: number; stroke?: number; children?: React.ReactNode }) {
  const [shown, setShown] = useState(0);
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  useEffect(() => {
    if (reduceMotion()) { setShown(value); return; }
    const id = requestAnimationFrame(() => setShown(value)); // um frame depois para a transição rodar
    return () => cancelAnimationFrame(id);
  }, [value]);
  return (
    <span className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeWidth={stroke} className="text-borda" />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round"
          className="text-primaria" style={{ strokeDasharray: circ, strokeDashoffset: circ * (1 - shown), transition: 'stroke-dashoffset .7s cubic-bezier(.22,1,.36,1)' }}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center">{children}</span>
    </span>
  );
}
