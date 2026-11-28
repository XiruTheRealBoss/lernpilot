/**
 * Cover and spine textures of the floating books. The front is the photo of the real textbook cover
 * (public/img/books, already cut to the 5:7 shape of a book face); the spine is drawn here.
 */
import type { Book } from '@/lib/book-layout'

const DISPLAY = '"Space Grotesk", "Inter", sans-serif'

/** Font the spines need; load it before drawing or the canvas falls back to a system font. */
export const COVER_FONTS = [`700 76px ${DISPLAY}`]

/** Loads a book's cover photo. Null when it cannot be loaded: the book then gets a plain cover with its title. */
export const loadCover = (b: Book) =>
  new Promise<HTMLImageElement | null>((res) => {
    const img = new Image()
    img.onload = () => res(img)
    img.onerror = () => res(null)
    img.src = `/img/books/${b.cover}.webp`
  })

/** Front cover on a power-of-two canvas (the renderer is WebGL 1); the 5:7 photo is stretched to it and the book face undoes the stretch. */
export function coverCanvas(b: Book, photo: HTMLImageElement | null): HTMLCanvasElement {
  const c = document.createElement('canvas')
  c.width = 512
  c.height = 1024
  const g = c.getContext('2d')!
  if (photo) g.drawImage(photo, 0, 0, 512, 1024)
  else {
    g.fillStyle = b.color
    g.fillRect(0, 0, 512, 1024)
    g.scale(1, 1024 / 717)
    g.fillStyle = b.ink ?? 'rgba(255,255,255,0.92)'
    let size = 60
    do g.font = `700 ${size--}px ${DISPLAY}`
    while (g.measureText(b.title).width > 396)
    g.fillText(b.title, 56, 184)
  }
  return c
}

/** Spine in the book's colour: the title reads top to bottom between two bands. Drawn in a 168 x 1024 space. */
export function spineCanvas(b: Book): HTMLCanvasElement {
  const c = document.createElement('canvas')
  c.width = 128
  c.height = 1024
  const g = c.getContext('2d')!
  g.scale(128 / 168, 1)
  g.fillStyle = b.color
  g.fillRect(0, 0, 168, 1024)
  const shade = g.createLinearGradient(0, 0, 168, 0)
  shade.addColorStop(0, 'rgba(0,0,0,0.2)')
  shade.addColorStop(0.5, 'rgba(255,255,255,0.08)')
  shade.addColorStop(1, 'rgba(0,0,0,0.2)')
  g.fillStyle = shade
  g.fillRect(0, 0, 168, 1024)
  g.fillStyle = b.ink ?? 'rgba(255,255,255,0.92)'
  g.globalAlpha = 0.7
  for (const y of [70, 92, 924, 946]) g.fillRect(0, y, 168, 7)
  g.globalAlpha = 1
  let size = 76
  do g.font = `700 ${size--}px ${DISPLAY}`
  while (g.measureText(b.title).width > 760)
  g.textAlign = 'center'
  g.textBaseline = 'middle'
  g.translate(84, 512)
  g.rotate(Math.PI / 2)
  g.fillText(b.title, 0, 4)
  return c
}
