import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { BudgetCard } from '@/components/analysis/BudgetCard'
import { RecommendationCard } from '@/components/analysis/RecommendationCard'
import { ScoreBar } from '@/components/ui/score-bar'
import { ScoreRing } from '@/components/ui/score-ring'
import { renderWithProviders } from '@/test/utils'
import type { BudgetPlan, Improvement } from '@/types/api'

describe('score components', () => {
  it('exposes the ring score to assistive technology', () => {
    renderWithProviders(<ScoreRing score={87} label="Overall" />)
    expect(screen.getByRole('img', { name: /overall: 87 out of 100/i })).toBeInTheDocument()
    expect(screen.getByText('87')).toBeInTheDocument()
  })

  it('renders the bar as an accessible meter', () => {
    renderWithProviders(<ScoreBar label="Lighting" score={72} description="Good daylight." />)
    const meter = screen.getByRole('meter', { name: /lighting score/i })
    expect(meter).toHaveAttribute('aria-valuenow', '72')
    expect(screen.getByText('Good daylight.')).toBeInTheDocument()
  })

  it('clamps out-of-range scores', () => {
    renderWithProviders(<ScoreBar label="Space" score={140} />)
    expect(screen.getByRole('meter', { name: /space score/i })).toHaveAttribute(
      'aria-valuenow',
      '100',
    )
  })
})

describe('result cards', () => {
  const improvement: Improvement = {
    title: 'Add a warm floor lamp',
    category: 'lighting',
    reason: 'No artificial light source is visible.',
    expected_impact: 'Usable evening ambience.',
    priority: 'high',
    estimated_cost_inr: 1800,
  }

  it('renders a recommendation with its reason, impact and cost', () => {
    renderWithProviders(<RecommendationCard item={improvement} />)
    expect(screen.getByText('Add a warm floor lamp')).toBeInTheDocument()
    expect(screen.getByText(/no artificial light source/i)).toBeInTheDocument()
    expect(screen.getByText(/usable evening ambience/i)).toBeInTheDocument()
    expect(screen.getByText(/high priority/i)).toBeInTheDocument()
  })

  it('shows budget totals and the remaining amount', () => {
    const plan: BudgetPlan = {
      budget: 5000,
      items: [
        {
          name: 'Floor lamp',
          estimated_cost: 1800,
          reason: 'Adds an evening light layer.',
          expected_impact: 'Warmer evenings.',
          priority: 'high',
        },
      ],
      total_estimated_cost: 1800,
      remaining: 3200,
      notes: '',
    }

    renderWithProviders(<BudgetCard plan={plan} />)
    expect(screen.getByText('Floor lamp')).toBeInTheDocument()
    expect(screen.getByText(/36% of the budget allocated/i)).toBeInTheDocument()
    expect(
      screen.getByRole('meter', { name: /36% of the .* budget allocated/i }),
    ).toBeInTheDocument()
  })
})
