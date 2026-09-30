import { ArrowLeft, Quote, Scan } from 'lucide-react'
import { motion } from 'motion/react'
import { Link, Outlet } from 'react-router-dom'

import { RoomIllustration } from '@/components/branding/RoomIllustration'

const HIGHLIGHTS = [
  'Style detection across seven design languages',
  'Lighting, ventilation and space scored separately',
  'Costed makeover plans at ₹5,000, ₹20,000 and ₹50,000',
]

export function AuthLayout() {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1.05fr_1fr]">
      {/* Editorial brand panel */}
      <aside className="relative hidden overflow-hidden bg-charcoal px-12 py-14 text-canvas lg:flex lg:flex-col">
        <Link to="/" className="relative flex items-center gap-2.5 text-canvas">
          <span className="flex size-9 items-center justify-center rounded-md bg-canvas/10">
            <Scan className="size-4" aria-hidden="true" />
          </span>
          <span className="font-display text-[15px] font-medium">RoomStyle AI</span>
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
          className="relative mt-auto"
        >
          <div className="mb-10 overflow-hidden rounded-xl border border-canvas/10">
            <RoomIllustration variant="dark" className="h-60 w-full" />
          </div>

          <Quote className="mb-5 size-7 text-accent" aria-hidden="true" />
          <p className="max-w-md font-display text-[28px] leading-[1.25] tracking-tight text-canvas">
            Every room is already telling you something. We just make it legible.
          </p>

          <ul className="mt-10 space-y-3 border-t border-canvas/10 pt-8">
            {HIGHLIGHTS.map((item) => (
              <li key={item} className="flex items-start gap-3 text-sm text-canvas/70">
                <span className="mt-1.5 size-1 shrink-0 rounded-full bg-accent" aria-hidden="true" />
                {item}
              </li>
            ))}
          </ul>
        </motion.div>
      </aside>

      <main className="flex flex-col justify-center px-6 py-10 sm:px-10 lg:px-16">
        <Link
          to="/"
          className="mb-10 inline-flex w-fit items-center gap-2 text-sm text-muted transition-colors hover:text-ink"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Back to home
        </Link>
        <div className="mx-auto w-full max-w-md">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
