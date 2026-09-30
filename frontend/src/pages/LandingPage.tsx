import { useEffect } from 'react'

import { Hero } from '@/components/landing/Hero'
import { Navbar } from '@/components/landing/Navbar'
import {
  BudgetSection,
  CapabilitiesSection,
  FaqSection,
  FinalCta,
  Footer,
  HowItWorksSection,
  ProblemSection,
  ReportSection,
  ScoringSection,
  StylesSection,
  TechnologySection,
  VisualizationSection,
} from '@/components/landing/Sections'

export default function LandingPage() {
  useEffect(() => {
    document.title = 'RoomStyle AI · Understand your space. Transform your room.'
  }, [])

  return (
    <div className="min-h-dvh bg-canvas">
      <Navbar />
      <main id="main">
        <Hero />
        <ProblemSection />
        <HowItWorksSection />
        <CapabilitiesSection />
        <StylesSection />
        <ScoringSection />
        <BudgetSection />
        <VisualizationSection />
        <ReportSection />
        <TechnologySection />
        <FaqSection />
        <FinalCta />
      </main>
      <Footer />
    </div>
  )
}
