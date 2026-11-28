/**
 * Photos of exams the student already took, kept as a history, one folder per subject.
 * They live in this browser only (IndexedDB: localStorage is far too small for photos) and are tied
 * to the signed-in student, so they survive signing out but are not shown to another account.
 * Nothing else has a copy: the browser is asked to keep this storage even when disk space runs low.
 */
import type { Profile, StudentData } from './types.ts'

export type ExamPhoto = {
  id: string
  /** every account id this student is known by (see ownerKeys) */
  owners: string[]
  folder: string
  title: string
  /** day of the exam, YYYY-MM-DD */
  date: string
  added: number
  image: Blob
  thumb: Blob
}

/**
 * Whose photos these are: the ids that do not change for a student, the Lyceum login and the Google
 * e-mail. The profile's name or e-mail would not do: they change when the second account is connected,
 * and the history would look empty. The demonstration has its own shelf, apart from any real account.
 */
export function ownerKeys(profile: Profile | null, connections: Partial<{ [K in keyof StudentData['connections']]: Partial<NonNullable<StudentData['connections'][K]>> | null }>, demo = false): string[] {
  if (demo) return ['demo']
  const keys = [connections.lyceum?.login && `lyceum:${connections.lyceum.login}`, connections.google?.email && `google:${connections.google.email}`]
  const known = keys.filter((k): k is string => !!k).map((k) => k.replace(/\s+/g, '').toLowerCase())
  return known.length ? known : [`name:${(profile?.name ?? 'anon').trim().toLowerCase()}`]
}

/** Size that fits inside max x max keeping the proportions; never enlarges. */
export function fit(w: number, h: number, max: number): { w: number; h: number } {
  const k = Math.min(1, max / Math.max(w, h))
  return { w: Math.max(1, Math.round(w * k)), h: Math.max(1, Math.round(h * k)) }
}

/** "IMG_2041.jpg" is no title; "prova-2_fisica.png" becomes "prova 2 fisica". */
export function titleFromFile(name: string): string {
  const base = name.replace(/\.[a-z0-9]+$/i, '').replace(/[_-]+/g, ' ').trim()
  return !base || /^(img|image|dsc|pxl|photo|foto|whatsapp image|screenshot)?[\s\d.()at]*$/i.test(base) ? 'Prova' : base
}

export type Folder = { name: string; photos: ExamPhoto[] }

/**
 * The folders to show: every subject of the student, every folder that already has a photo and the
 * ones just created. Folders with photos come first (most recent exam first), then the empty ones A-Z.
 */
export function folders(subjects: string[], photos: ExamPhoto[], created: string[] = []): Folder[] {
  const by = new Map<string, ExamPhoto[]>()
  for (const name of [...subjects, ...created]) if (name.trim()) by.set(name.trim(), [])
  for (const p of photos) by.set(p.folder, [...(by.get(p.folder) ?? []), p])
  const list = [...by].map(([name, ps]) => ({ name, photos: ps.sort((a, b) => b.date.localeCompare(a.date) || b.added - a.added) }))
  return list.sort((a, b) => Number(b.photos.length > 0) - Number(a.photos.length > 0) || (b.photos[0]?.date ?? '').localeCompare(a.photos[0]?.date ?? '') || a.name.localeCompare(b.name, 'pt-BR'))
}

// ---- browser only from here on ----

/** A phone photo is 4-12 MB; the history keeps a 2000 px copy plus a small one for the folder. */
export async function prepare(source: Blob): Promise<{ image: Blob; thumb: Blob }> {
  const bmp = await createImageBitmap(source)
  const draw = (max: number, quality: number) => {
    const { w, h } = fit(bmp.width, bmp.height, max)
    const c = document.createElement('canvas')
    c.width = w
    c.height = h
    c.getContext('2d')!.drawImage(bmp, 0, 0, w, h)
    return new Promise<Blob>((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('image could not be encoded'))), 'image/jpeg', quality))
  }
  try {
    return { image: await draw(2000, 0.86), thumb: await draw(480, 0.8) }
  } finally {
    bmp.close()
  }
}

const open = () =>
  new Promise<IDBDatabase>((res, rej) => {
    const rq = indexedDB.open('sb-exam-photos', 2)
    rq.onupgradeneeded = () => {
      // version 1 (a few minutes of development) had a single-owner index; nothing of it needs keeping
      const store = rq.result.objectStoreNames.contains('photos') ? rq.transaction!.objectStore('photos') : rq.result.createObjectStore('photos', { keyPath: 'id' })
      if (!store.indexNames.contains('owners')) store.createIndex('owners', 'owners', { multiEntry: true })
    }
    rq.onsuccess = () => res(rq.result)
    rq.onerror = () => rej(rq.error)
  })

async function run<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open()
  try {
    return await new Promise<T>((res, rej) => {
      const tx = db.transaction('photos', mode)
      const rq = fn(tx.objectStore('photos'))
      tx.oncomplete = () => res(rq.result)
      tx.onerror = tx.onabort = () => rej(tx.error)
    })
  } finally {
    db.close()
  }
}

export const savePhoto = (p: ExamPhoto) => {
  void navigator.storage?.persist?.().catch(() => undefined) // ask the browser not to evict the only copy
  return run('readwrite', (s) => s.put(p))
}
export async function listPhotos(owners: string[]): Promise<ExamPhoto[]> {
  const found = new Map<string, ExamPhoto>()
  for (const o of owners) for (const p of await run<ExamPhoto[]>('readonly', (s) => s.index('owners').getAll(o))) found.set(p.id, p)
  // a photo saved before the second account was connected learns the new id, so either login finds it later
  for (const p of found.values())
    if (owners.some((o) => !p.owners.includes(o))) {
      p.owners = [...new Set([...p.owners, ...owners])]
      await run('readwrite', (s) => s.put(p))
    }
  return [...found.values()]
}
export const deletePhoto = (id: string) => run('readwrite', (s) => s.delete(id))
export const deleteAllPhotos = async (owners: string[]) => {
  for (const p of await listPhotos(owners)) await deletePhoto(p.id)
}
