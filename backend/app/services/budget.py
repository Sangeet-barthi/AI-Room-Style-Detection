"""Deterministic budget validation.

The LLM proposes makeover packages; this module guarantees the contract the UI
depends on: three tiers, correct totals, and never over budget.
"""
from __future__ import annotations

from app.ai.schemas import BudgetItem, BudgetPlan

BUDGET_TIERS: tuple[int, ...] = (5000, 20000, 50000)

_FALLBACK_ITEMS: dict[int, list[dict]] = {
    5000: [
        {
            "name": "Layered curtain replacement",
            "estimated_cost": 1800,
            "reason": "Softens harsh window light and lifts the perceived lighting quality.",
            "expected_impact": "Warmer, more even daylight through the day.",
            "priority": "high",
        },
        {
            "name": "Warm LED floor lamp",
            "estimated_cost": 1600,
            "reason": "Adds a second lighting layer for evening use.",
            "expected_impact": "Usable ambient light after sunset.",
            "priority": "high",
        },
        {
            "name": "Woven storage baskets (set of three)",
            "estimated_cost": 900,
            "reason": "Removes visible clutter from open surfaces.",
            "expected_impact": "Calmer, less busy surfaces.",
            "priority": "medium",
        },
    ],
    20000: [
        {
            "name": "Area rug to anchor the seating zone",
            "estimated_cost": 6500,
            "reason": "Defines circulation and improves the layout balance.",
            "expected_impact": "Clearer zoning and a more intentional layout.",
            "priority": "high",
        },
        {
            "name": "Three-point lighting upgrade",
            "estimated_cost": 5500,
            "reason": "Introduces ambient, task and accent layers.",
            "expected_impact": "Even light with no dark corners.",
            "priority": "high",
        },
        {
            "name": "Wall-mounted shelving unit",
            "estimated_cost": 4200,
            "reason": "Moves storage onto unused vertical wall area.",
            "expected_impact": "More free floor space.",
            "priority": "medium",
        },
        {
            "name": "Coordinated cushion and throw set",
            "estimated_cost": 2600,
            "reason": "Brings the palette into line with the target style.",
            "expected_impact": "A more coherent colour story.",
            "priority": "low",
        },
    ],
    50000: [
        {
            "name": "Replacement primary seating",
            "estimated_cost": 22000,
            "reason": "The existing piece sets the style of the whole room.",
            "expected_impact": "A decisive shift toward the target style.",
            "priority": "high",
        },
        {
            "name": "Full lighting scheme with dimming",
            "estimated_cost": 11000,
            "reason": "Addresses the lowest-scoring dimension directly.",
            "expected_impact": "Controllable light for every time of day.",
            "priority": "high",
        },
        {
            "name": "Feature wall finish",
            "estimated_cost": 7500,
            "reason": "Creates a focal point and corrects a flat wall colour.",
            "expected_impact": "Visual depth and a clear focal point.",
            "priority": "medium",
        },
        {
            "name": "Custom storage cabinet",
            "estimated_cost": 6500,
            "reason": "Closed storage removes the remaining visible clutter.",
            "expected_impact": "A permanently tidier room.",
            "priority": "medium",
        },
    ],
}


def _trim_to_budget(items: list[BudgetItem], budget: int) -> list[BudgetItem]:
    """Keep items in priority order until the budget would be exceeded."""
    order = {"high": 0, "medium": 1, "low": 2}
    ordered = sorted(items, key=lambda item: order.get(item.priority, 3))

    kept: list[BudgetItem] = []
    running = 0
    for item in ordered:
        cost = max(int(item.estimated_cost), 0)
        if cost > budget:
            continue
        if running + cost > budget:
            continue
        item.estimated_cost = cost
        kept.append(item)
        running += cost
    return kept


def _fallback_plan(budget: int) -> BudgetPlan:
    items = [BudgetItem(**data) for data in _FALLBACK_ITEMS[budget]]
    items = _trim_to_budget(items, budget)
    total = sum(item.estimated_cost for item in items)
    return BudgetPlan(
        budget=budget,
        items=items,
        total_estimated_cost=total,
        remaining=budget - total,
        notes="Baseline package. All costs are estimates at typical Indian retail prices.",
    )


def validate_budget_plans(
    plans: list[BudgetPlan], tiers: tuple[int, ...] = BUDGET_TIERS
) -> list[BudgetPlan]:
    """Return exactly one valid, within-budget plan per tier."""
    by_budget: dict[int, BudgetPlan] = {}
    for plan in plans:
        nearest = min(tiers, key=lambda tier: abs(tier - plan.budget))
        by_budget.setdefault(nearest, plan)

    validated: list[BudgetPlan] = []
    for tier in tiers:
        plan = by_budget.get(tier)
        if plan is None or not plan.items:
            validated.append(_fallback_plan(tier))
            continue

        plan.budget = tier
        plan.items = _trim_to_budget(list(plan.items), tier)
        if not plan.items:
            validated.append(_fallback_plan(tier))
            continue

        plan.total_estimated_cost = sum(item.estimated_cost for item in plan.items)
        plan.remaining = tier - plan.total_estimated_cost
        if not plan.notes:
            plan.notes = "All costs are estimates at typical Indian retail prices."
        validated.append(plan)

    return validated


def fallback_budget_plans() -> list[BudgetPlan]:
    return [_fallback_plan(tier) for tier in BUDGET_TIERS]
