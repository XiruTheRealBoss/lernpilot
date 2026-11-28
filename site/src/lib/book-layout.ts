/**
 * The floating books of the landing page: which books exist and where each one sits.
 * Pure data and maths (no three.js, no DOM), so the "books never cross" rule is checked in npm test.
 */
/** `cover` names the photo in public/img/books; `color` is the spine, back and edges; `ink` the spine lettering. */
export type Book = { title: string; cover: string; color: string; ink?: string; scale: number; open?: boolean }

// The textbooks the school actually uses (covers sent by the user as screenshots, cut to 5:7).
export const BOOKS: Book[] = [
  { title: 'P.A.U.L. D. 6', cover: 'paul-d', color: '#0c2d70', scale: 1.05 },
  { title: 'Green Line 4', cover: 'green-line', color: '#e7eaee', ink: '#3f9a3c', scale: 1 },
  { title: 'Das Zahlenbuch 1', cover: 'zahlenbuch', color: '#f3c300', ink: '#cf1560', scale: 0.95 },
  { title: 'Lambacher Schweizer 6', cover: 'lambacher', color: '#f2c800', ink: '#2c5c9c', scale: 0.95, open: true },
  { title: 'Geografia 8', cover: 'geografia', color: '#75308c', scale: 0.8 },
  { title: 'História 9', cover: 'historia', color: '#1b3a86', scale: 0.75 },
  { title: 'Impulse Physik 9|10', cover: 'impulse-physik', color: '#00a3e0', scale: 0.8 },
]

/** How far a book may wander from its slot, on each axis. The scene must use exactly this amplitude. */
export const DRIFT = 0.06
/** Each book also slides sideways along its own straight track: this far each way from its slot. */
export const SLIDE = 0.7
// farthest corner from a book's pivot at scale 1: closed (spine sticks out to x = -0.53), open (covers at 34 degrees)
const HALF_DIAGONAL = { closed: 0.89, open: 0.98 }

/** Sphere a book never leaves, whatever way it is turned and wherever it has drifted to. */
export const reach = (b: Book) => b.scale * (b.open ? HALF_DIAGONAL.open : HALF_DIAGONAL.closed) + DRIFT * Math.sqrt(3)

export type Slot = { x: number; y: number; z: number }

/** Where a book is on its track: u = -1 is one end, 0 the slot, +1 the other end. The track is level and runs around the cluster, not through it. */
export function slid(p: Slot, u: number): Slot {
  const r = Math.hypot(p.x, p.z)
  const tx = r < 1e-3 ? 1 : -p.z / r
  const tz = r < 1e-3 ? 0 : p.x / r
  return { x: p.x + u * SLIDE * tx, y: p.y, z: p.z + u * SLIDE * tz }
}

/** Smallest distance between two books while each is anywhere on its own track, and the two positions where it happens. */
export function closest(a: Slot, b: Slot, steps: number): { d: number; p: Slot; q: Slot } {
  let best = { d: Infinity, p: a, q: b }
  for (let i = 0; i <= steps; i++)
    for (let j = 0; j <= steps; j++) {
      const p = slid(a, (2 * i) / steps - 1)
      const q = slid(b, (2 * j) / steps - 1)
      const d = Math.hypot(p.x - q.x, p.y - q.y, p.z - q.z)
      if (d < best.d) best = { d, p, q }
    }
  return best
}

/**
 * One slot per book. Wherever two books are on their tracks, their centres stay at least the sum of
 * the two reaches apart, so every book can spin and slide freely without touching another.
 */
export function bookSlots(books: Book[] = BOOKS, seed = 11): Slot[] {
  let s = seed
  const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647 // fixed seed: same layout on every visit
  const n = books.length
  const pts = books.map((_, i) => {
    const u = 1 - (2 * (i + 0.5)) / n
    const th = i * 2.399963 + rnd() * 0.5
    const k = Math.sqrt(1 - u * u)
    return { x: 2 * k * Math.cos(th), y: 2 * u, z: 2 * k * Math.sin(th) }
  })
  const pushApart = () => {
    for (let pass = 0; pass < 400; pass++) {
      let moved = false
      for (let i = 0; i < n; i++)
        for (let j = i + 1; j < n; j++) {
          const { d, p, q } = closest(pts[i], pts[j], 8)
          const lack = reach(books[i]) + reach(books[j]) + 0.06 - d // spare for what falls between the sampled track positions
          if (lack <= 0.005) continue
          const f = lack / (d || 1e-6) / 2
          for (const axis of ['x', 'y', 'z'] as const) {
            const step = (q[axis] - p[axis]) * f
            pts[i][axis] -= step
            pts[j][axis] += step
          }
          moved = true
        }
      if (!moved) return
    }
  }
  // Squeeze towards the centre a little less each round and push apart whatever got too close: ends
  // compact. Height is squeezed twice as hard, so the cluster comes out wide and low like a screen.
  for (let round = 0; round < 250; round++) {
    const k = 0.03 * (1 - round / 250)
    for (const p of pts) {
      p.x *= 1 - k
      p.z *= 1 - k
      p.y *= 1 - 2 * k
    }
    pushApart()
  }
  return pts
}
