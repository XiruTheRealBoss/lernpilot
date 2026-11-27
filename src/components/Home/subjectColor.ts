// Cor estável por matéria, calma e editorial — é o único sistema de cor além do acento de ação.
const PALETTE = ['#3E6E50', '#2A4BA0', '#9A5B2E', '#8A3B6B', '#4A6B8A', '#A6533A', '#596A3C', '#6B4FA3'];

export function subjectColor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (Math.imul(h, 31) + name.charCodeAt(i)) >>> 0;
  return PALETTE[h % PALETTE.length];
}
