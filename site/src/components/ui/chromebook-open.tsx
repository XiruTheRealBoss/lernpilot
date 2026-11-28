import { motion, useReducedMotion, useScroll, useTransform } from 'motion/react'
import { useRef, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

/**
 * The school's Chromebook (black Acer, thick bezels) drawn in CSS 3D. The section stays pinned while
 * the page scrolls: the closed Chromebook is seen from above, its lid opens on the hinge, the view
 * comes down to the front and the screen turns on showing the login page. The screen never leaves the lid.
 * The "chromebook" and "acer" marks are plain text standing in for the real logos.
 */

// keyboard rows, each number is a key's relative width
const ROWS = [
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1.7],
  [1.5, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1.2],
  [1.9, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2],
  [2.4, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2.5],
  [1.7, 1.3, 6.4, 1.3, 1.3, 1, 1, 1],
]
const FACE = 'absolute inset-0 rounded-[3.5%/5.5%] [backface-visibility:hidden]'
const OPEN = { lid: 8, pitch: -14 } // resting pose: lid leaning back a little, seen slightly from above

export function ChromebookOpen({ eyebrow, title, note, src, alt }: { eyebrow: string; title: ReactNode; note: string; src: string; alt: string }) {
  const track = useRef<HTMLDivElement>(null)
  const still = useReducedMotion()
  // 0 when the section reaches the top of the window and gets pinned, 1 when it is released
  const { scrollYProgress: p } = useScroll({ target: track, offset: ['start start', 'end end'] })
  const lid = useTransform(p, [0.06, 0.72], [-88, OPEN.lid]) // -90 would lie exactly on the base and flicker
  const pitch = useTransform(p, [0, 0.72], [-60, OPEN.pitch])
  const scale = useTransform(p, [0, 0.72], [0.86, 1])
  const lift = useTransform(p, [0, 0.72], ['-30%', '0%']) // closed, everything sits below the hinge: pull it up
  const dark = useTransform(p, [0.5, 0.86], [1, 0]) // the screen turns on

  return (
    <div ref={track} className={still ? undefined : 'h-[190vh]'}>
      <div className={cn('flex flex-col items-center justify-center overflow-hidden px-6', still ? 'py-24' : 'sticky top-0 h-dvh')}>
        {/* soft dark halo: the books float behind this copy */}
        <div className="halo px-[clamp(20px,6vw,90px)] py-5 text-center">
          <span className="mb-3 inline-block text-[12px] font-semibold tracking-[0.18em] text-flame-400 uppercase">{eyebrow}</span>
          <h2 className="font-display text-[clamp(26px,min(4.2vw,5.4vh),48px)] leading-[1.06] font-bold tracking-tight">{title}</h2>
          <p className="mx-auto mt-3 max-w-[460px] text-[clamp(13.5px,1.9vh,16px)] text-blue-100/75">{note}</p>
        </div>

        <div className="mt-[clamp(8px,2.5vh,30px)] shrink-0 [--w:clamp(240px,min(80vw,62vh),720px)]" style={{ width: 'var(--w)', height: 'calc(var(--w) * 0.98)', perspective: '1700px', perspectiveOrigin: '50% 30%' }}>
          <motion.div
            className="relative will-change-transform"
            style={{ height: 'calc(var(--w) * 0.63)', transformStyle: 'preserve-3d', transformOrigin: '50% 100%', rotateX: still ? OPEN.pitch : pitch, scale: still ? 1 : scale, y: still ? 0 : lift }}
          >
            {/* LID, hinged on its bottom edge */}
            <motion.div className="absolute inset-0 will-change-transform" style={{ transformStyle: 'preserve-3d', transformOrigin: '50% 100%', rotateX: still ? OPEN.lid : lid }}>
              {/* inside: thick bezel, camera, screen, brand under the screen */}
              <div className={cn(FACE, 'border border-white/10 bg-[#0c0d0f] shadow-[inset_0_0_0_2px_rgba(255,255,255,.04)]')}>
                <span className="absolute top-[2.6%] left-1/2 h-[1.6%] w-[1%] -translate-x-1/2 rounded-full bg-[#2b2f38] ring-1 ring-white/10" />
                <div className="absolute inset-x-[5.5%] top-[7%] bottom-[13%] overflow-hidden rounded-[2px] bg-black">
                  <img src={src} alt={alt} width={1600} height={1000} className="block h-full w-full object-cover object-top" />
                  {!still && <motion.div aria-hidden="true" style={{ opacity: dark }} className="absolute inset-0 bg-black" />}
                </div>
                <span className="absolute bottom-[3.2%] left-1/2 -translate-x-1/2 font-sans text-[calc(var(--w)*0.03)] leading-none font-bold tracking-wide text-white/55 italic">acer</span>
              </div>
              {/* outside of the lid: what shows while the Chromebook is closed */}
              <div
                className={cn(FACE, 'border border-white/10 bg-[#141518]')}
                style={{ transform: 'rotateX(180deg)', backgroundImage: 'linear-gradient(120deg, rgba(255,255,255,.07), transparent 42%), repeating-linear-gradient(90deg, rgba(255,255,255,.035) 0 1px, transparent 1px 3px)' }}
              >
                <span className="absolute top-[8%] left-[7%] flex items-center gap-[0.5em] font-sans text-[calc(var(--w)*0.026)] leading-none font-medium text-white/60">
                  <span className="h-[1em] w-[1em] rounded-full border-[0.22em] border-white/55" />
                  chromebook
                </span>
                <span className="absolute top-[38%] left-[9%] font-sans text-[calc(var(--w)*0.062)] leading-none font-bold text-white/70 italic">acer</span>
              </div>
            </motion.div>

            {/* BASE: keyboard deck lying flat from the hinge towards the reader */}
            <div className="absolute top-full right-[-1.3%] left-[-1.3%] rounded-b-[3.5%/5%] border border-white/10 bg-[#1b1c1f]" style={{ height: 'calc(var(--w) * 0.67)', transform: 'rotateX(90deg)', transformOrigin: '50% 0%', transformStyle: 'preserve-3d' }}>
              <span className="absolute inset-x-[30%] top-0 h-[3.5%] rounded-b-md bg-black/50" />
              <div className="absolute inset-x-[5%] top-[8%] flex h-[53%] flex-col gap-[2.6%] rounded-[6px] bg-[#0b0c0e] p-[1.2%]">
                {ROWS.map((row, r) => (
                  <div key={r} className={cn('flex gap-[0.9%]', r === 0 ? 'flex-[0.7]' : 'flex-1')}>
                    {row.map((grow, k) => (
                      <span key={k} style={{ flexGrow: grow }} className="basis-0 rounded-[18%/26%] bg-[#1c1d21] shadow-[inset_0_-1px_0_rgba(0,0,0,.6),inset_0_1px_0_rgba(255,255,255,.06)]" />
                    ))}
                  </div>
                ))}
              </div>
              <span className="absolute top-[66%] left-1/2 h-[27%] w-[36%] -translate-x-1/2 rounded-[5px] border border-white/[0.07] bg-[#17181b]" />
              {/* front edge: gives the deck its thickness */}
              <span className="absolute inset-x-0 top-full h-[calc(var(--w)*0.028)] rounded-b-[10px] bg-gradient-to-b from-[#2a2b30] to-[#0d0e10]" style={{ transform: 'rotateX(-90deg)', transformOrigin: '50% 0%' }} />
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
