"""Budget validation must never allow an over-budget package."""
from app.ai.schemas import BudgetItem, BudgetPlan
from app.services.budget import BUDGET_TIERS, fallback_budget_plans, validate_budget_plans


def _plan(budget, costs):
    return BudgetPlan(
        budget=budget,
        items=[
            BudgetItem(
                name=f"Item {index}",
                estimated_cost=cost,
                reason="Addresses the lowest score.",
                priority="high",
            )
            for index, cost in enumerate(costs)
        ],
    )


def test_validator_always_returns_three_tiers():
    plans = validate_budget_plans([], BUDGET_TIERS)
    assert [p.budget for p in plans] == list(BUDGET_TIERS)


def test_over_budget_items_are_trimmed():
    plans = validate_budget_plans([_plan(5000, [3000, 3000, 900])], BUDGET_TIERS)
    first = plans[0]
    assert first.total_estimated_cost <= 5000
    assert first.total_estimated_cost == sum(i.estimated_cost for i in first.items)
    assert first.remaining == 5000 - first.total_estimated_cost


def test_single_item_larger_than_budget_is_dropped():
    plans = validate_budget_plans([_plan(5000, [99000])], BUDGET_TIERS)
    assert plans[0].total_estimated_cost <= 5000


def test_totals_and_remaining_are_recomputed_not_trusted():
    plan = _plan(20000, [5000, 5000])
    plan.total_estimated_cost = 999999  # a lying model
    plan.remaining = -5
    validated = validate_budget_plans([plan], BUDGET_TIERS)[1]
    assert validated.total_estimated_cost == 10000
    assert validated.remaining == 10000


def test_mislabelled_budget_is_snapped_to_nearest_tier():
    plans = validate_budget_plans([_plan(21000, [4000])], BUDGET_TIERS)
    assert plans[1].budget == 20000


def test_fallback_plans_are_within_budget():
    for plan in fallback_budget_plans():
        assert plan.total_estimated_cost <= plan.budget
        assert plan.items
