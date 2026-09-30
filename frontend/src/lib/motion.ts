import type { Transition, Variants } from 'motion/react'

export const easePremium = [0.22, 1, 0.36, 1] as const

export const transition: Transition = { duration: 0.55, ease: easePremium }

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition },
}

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.4, ease: easePremium } },
}

export const stagger = (delayChildren = 0.05, staggerChildren = 0.08): Variants => ({
  hidden: {},
  visible: { transition: { delayChildren, staggerChildren } },
})

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.97 },
  visible: { opacity: 1, scale: 1, transition },
}

/** Consistent scroll-reveal config: fires once, slightly before entering view. */
export const revealViewport = { once: true, amount: 0.25, margin: '0px 0px -80px 0px' } as const
