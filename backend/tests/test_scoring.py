"""Deterministic scoring engine."""
from app.ai.schemas import LightingObservations, SpaceObservations, VentilationObservations
from app.services.scoring import (
    ScoreWeights,
    compute_scores,
    score_lighting,
    score_space,
    score_ventilation,
)
from tests.conftest import sample_analysis


def test_scores_are_bounded_for_extreme_inputs():
    best_light = LightingObservations(
        natural_light_visible=True,
        window_count_visible=4,
        window_openness="large",
        overall_brightness="bright",
        artificial_light_sources_visible=9,
        light_distribution="even",
    )
    worst_light = LightingObservations(
        natural_light_visible=False,
        window_openness="none",
        overall_brightness="dark",
        artificial_light_sources_visible=0,
        light_distribution="uneven",
    )
    assert 0 <= score_lighting(worst_light)["score"] <= score_lighting(best_light)["score"] <= 100
    assert score_lighting(worst_light)["score"] < 30


def test_ventilation_rewards_cross_ventilation():
    closed = VentilationObservations(
        openable_windows_visible=1, doors_or_openings_visible=0,
        cross_ventilation_possible=False, room_openness="enclosed",
    )
    open_room = VentilationObservations(
        openable_windows_visible=2, doors_or_openings_visible=2,
        cross_ventilation_possible=True, room_openness="open",
    )
    assert score_ventilation(open_room)["score"] > score_ventilation(closed)["score"]
    assert "not measured air quality" in score_ventilation(closed)["summary"]


def test_space_penalises_overcrowding():
    good = SpaceObservations(
        furniture_density="balanced", walking_clearance="generous",
        clutter_level="none", layout_balance="excellent", vertical_storage_used=True,
    )
    bad = SpaceObservations(
        furniture_density="overcrowded", walking_clearance="blocked",
        clutter_level="high", layout_balance="poor",
    )
    assert score_space(good)["score"] >= 90
    assert score_space(bad)["score"] <= 20


def test_overall_uses_configured_weights():
    analysis = sample_analysis()
    scores = compute_scores(analysis, ScoreWeights(lighting=0.35, ventilation=0.25, space=0.40))
    expected = round(
        scores["lighting"]["score"] * 0.35
        + scores["ventilation"]["score"] * 0.25
        + scores["space_utilization"]["score"] * 0.40
    )
    assert scores["overall"]["score"] == expected
    assert sum(scores["overall"]["weights"].values()) == 1.0


def test_weights_are_normalised_when_they_do_not_sum_to_one():
    analysis = sample_analysis()
    scores = compute_scores(analysis, ScoreWeights(lighting=7, ventilation=5, space=8))
    assert abs(sum(scores["overall"]["weights"].values()) - 1.0) < 1e-6


def test_every_score_carries_the_visual_assessment_label():
    scores = compute_scores(sample_analysis())
    for block in scores.values():
        assert block["disclaimer"] == "Visual AI-assisted assessment"
        assert block["summary"]


def test_weakest_dimension_is_identified():
    scores = compute_scores(sample_analysis())
    assert scores["overall"]["weakest_dimension"] in {
        "lighting", "ventilation", "space utilisation"
    }
