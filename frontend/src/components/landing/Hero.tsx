import { ArrowRight, Play, Sparkles } from 'lucide-react'
import { motion, useReducedMotion, useScroll, useTransform } from 'motion/react'
import { useRef } from 'react'
import { Link } from 'react-router-dom'

import { RoomIllustration } from '@/components/branding/RoomIllustration'
import { Button } from '@/components/ui/button'
import { fadeUp, stagger } from '@/lib/motion'

function FloatingAnalysisCard() {
  const reduced = useReducedMotion()

  return (
    <motion.figure
      initial={{ opacity: 0, y: 24, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1], delay: 0.5 }}
      className="absolute -bottom-6 left-4 w-64 sm:left-auto sm:right-6 sm:w-72"
    >
      <motion.div
        animate={reduced ? undefined : { y: [0, -8, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
        className="rounded-xl border border-line bg-surface/95 p-5 shadow-lift backdrop-blur"
      >
        <figcaption className="mb-4 flex items-center gap-2">
          <Sparkles className="size-3.5 text-accent" aria-hidden="true" />
          <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
            Live analysis
          </span>
        </figcaption>

        <div className="flex items-end justify-between">
          <div>
            <p className="font-display text-2xl font-medium leading-none text-ink">Modern</p>
            <p className="mt-1.5 text-[11px] text-subtle">AI confidence estimate</p>
          </div>
          <p className="font-display text-3xl font-medium leading-none text-accent">92%</p>
        </div>

        <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-elevated">
          <motion.div
            className="h-full rounded-full bg-accent"
            initial={{ width: 0 }}
            animate={{ width: '92%' }}
            transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1], delay: 0.9 }}
          />
        </div>

        <dl className="mt-5 grid grid-cols-2 gap-4 border-t border-line pt-4">
          <div>
            <dt className="text-[10px] uppercase tracking-[0.12em] text-subtle">Room</dt>
            <dd className="mt-1 text-sm font-medium text-ink">Living Room</dd>
          </div>
          <div>
            <dt className="text-[10px] uppercase tracking-[0.12em] text-subtle">Health</dt>
            <dd className="mt-1 text-sm font-medium text-ink">
              87<span className="text-muted">/100</span>
            </dd>
          </div>
        </dl>
      </motion.div>
    </motion.figure>
  )
}

export function Hero() {
  const reduced = useReducedMotion()
  const ref = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] })
  const parallax = useTransform(scrollYProgress, [0, 1], ['0%', reduced ? '0%' : '9%'])

  return (
    <section ref={ref} className="relative overflow-hidden pt-32 sm:pt-36 lg:pt-40">
      <div className="mx-auto grid max-w-7xl items-center gap-14 px-5 pb-section sm:px-8 lg:grid-cols-[1.05fr_1fr] lg:gap-16">
        <motion.div variants={stagger(0.15, 0.1)} initial="hidden" animate="visible">
          <motion.p variants={fadeUp} className="kicker">
            AI interior design analysis
          </motion.p>

          <motion.h1 variants={fadeUp} className="mt-5 text-display text-balance">
            Understand your space.
            <br />
            <span className="text-accent">Transform your room.</span>
          </motion.h1>

          <motion.p
            variants={fadeUp}
            className="mt-6 max-w-xl text-[17px] leading-relaxed text-muted"
          >
            Photograph any room and RoomStyle AI reads it the way a designer would — the style
            language, the materials, the palette, the light, the way the floor plan actually works.
            You get an explained assessment, a room-health score and a costed plan you can act on
            this weekend.
          </motion.p>

          <motion.div variants={fadeUp} className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg">
              <Link to="/register">
                Analyze My Room
                <ArrowRight aria-hidden="true" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <a href="#how-it-works">
                <Play aria-hidden="true" />
                See How It Works
              </a>
            </Button>
          </motion.div>

          <motion.dl
            variants={fadeUp}
            className="mt-12 grid max-w-lg grid-cols-3 gap-6 border-t border-line pt-8"
          >
            {[
              { value: '7', label: 'Design styles' },
              { value: '3', label: 'Scored dimensions' },
              { value: '₹5k–50k', label: 'Makeover plans' },
            ].map((stat) => (
              <div key={stat.label}>
                <dt className="sr-only">{stat.label}</dt>
                <dd>
                  <span className="block font-display text-2xl font-medium text-ink">
                    {stat.value}
                  </span>
                  <span className="mt-1 block text-[13px] text-muted">{stat.label}</span>
                </dd>
              </div>
            ))}
          </motion.dl>
        </motion.div>

        <div className="relative">
          <motion.div
            style={{ y: parallax }}
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
            className="overflow-hidden rounded-2xl border border-line shadow-lift"
          >
            <RoomIllustration className="aspect-[4/3] w-full" />
          </motion.div>
          <FloatingAnalysisCard />
        </div>
      </div>
    </section>
  )
}
