// Palette and stable subject hashing retained from upstream 39e690f.
const PALETTE = ['#3E6E50', '#2A4BA0', '#9A5B2E', '#8A3B6B', '#4A6B8A', '#A6533A', '#596A3C', '#6B4FA3'];

export function subjectColor(name: string): string {
  let hash = 0;
  for (let index = 0; index < name.length; index++) hash = (Math.imul(hash, 31) + name.charCodeAt(index)) >>> 0;
  return PALETTE[hash % PALETTE.length];
}
