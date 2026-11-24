import { useId } from 'react';

// Hélice de frente: duas pás em lente, giradas 60°, centradas no cubo (16, 17.6).
const BLADES = 'M16 10C17.6 13.8 17.6 16.4 16 17.6C14.4 16.4 14.4 13.8 16 10zM16 25.2C17.6 21.4 17.6 18.8 16 17.6C14.4 18.8 14.4 21.4 16 25.2z';

/** Marca do lernpilot: avião a hélice visto de frente, com capelo de formatura. */
export function LogoMark({ className = '' }: { className?: string }) {
  const id = useId(); // máscaras precisam de id único por instância
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <mask id={`${id}a`} maskUnits="userSpaceOnUse" x="0" y="0" width="32" height="32">
        <rect width="32" height="32" fill="#fff" />
        <path d={BLADES} transform="rotate(60 16 17.6)" fill="#000" stroke="#000" strokeWidth="2.2" />
        <circle cx="16" cy="17.6" r="2.6" fill="#000" />
      </mask>
      <mask id={`${id}b`} maskUnits="userSpaceOnUse" x="0" y="0" width="32" height="32">
        <rect width="32" height="32" fill="#fff" />
        <circle cx="16" cy="17.6" r="2.4" fill="#000" />
      </mask>
      <g mask={`url(#${id}a)`} fill="currentColor">
        <path d="M16 3.4l6.6 2.9L16 9.2 9.4 6.3z" />
        <path d="M12.9 7.8v3.6c1-.4 2-.6 3.1-.6s2.1.2 3.1.6V7.8L16 9.2z" />
        <rect x="1.5" y="16.45" width="9.3" height="2.3" rx="1.15" />
        <rect x="21.2" y="16.45" width="9.3" height="2.3" rx="1.15" />
        <circle cx="16" cy="17.6" r="4.8" fill="none" stroke="currentColor" strokeWidth="2" />
        <path d="M13.3 22l-1.5 3.6M18.7 22l1.5 3.6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="11.5" cy="28" r="1.6" />
        <circle cx="20.5" cy="28" r="1.6" />
      </g>
      <path d={BLADES} transform="rotate(60 16 17.6)" fill="currentColor" mask={`url(#${id}b)`} />
      <circle cx="16" cy="17.6" r="1.5" fill="currentColor" />
      <path d="M22.6 6.3v3.3" stroke="currentColor" strokeWidth=".9" strokeLinecap="round" />
    </svg>
  );
}

export function Logo({ className = '' }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 font-bold tracking-tight text-texto ${className}`}>
      <LogoMark className="h-[1.8em] w-[1.8em] text-primaria" />
      lernpilot
    </span>
  );
}
