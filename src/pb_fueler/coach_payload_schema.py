from __future__ import annotations

from typing import Any, TypedDict


class CoachSeriesPoint(TypedDict):
    km: int
    remaining_g: float
    intensity: float


class CoachPayload(TypedDict):
    schema_version: str
    runner_profile: dict[str, Any]
    race_plan: dict[str, Any]
    current_inventory: dict[str, Any]
    context_flags: dict[str, Any]
    key_metrics: dict[str, Any]
    remaining_g_curve: list[CoachSeriesPoint]
    climb_impact: dict[str, Any]
    optimization_strategy: dict[str, Any]


def validate_coach_payload(payload: dict[str, Any]) -> None:
    required_top_level = {
        "schema_version",
        "runner_profile",
        "race_plan",
        "current_inventory",
        "context_flags",
        "key_metrics",
        "remaining_g_curve",
        "climb_impact",
        "optimization_strategy",
    }
    missing = required_top_level - set(payload.keys())
    if missing:
        raise ValueError(f"coach payload missing keys: {sorted(missing)}")

    curve = payload["remaining_g_curve"]
    if not isinstance(curve, list) or len(curve) == 0:
        raise ValueError("remaining_g_curve must be a non-empty list")

    for point in curve:
        if not isinstance(point, dict):
            raise ValueError("remaining_g_curve point must be an object")
        for k in ("km", "remaining_g", "intensity"):
            if k not in point:
                raise ValueError(f"remaining_g_curve point missing key: {k}")

    inventory = payload["current_inventory"]
    inventory_keys = {
        "total_in_race_gels",
        "in_race_gel_points_km",
        "strategy_details",
        "pre_race_loading",
        "source_of_truth",
    }
    missing_inventory = inventory_keys - set(inventory.keys())
    if missing_inventory:
        raise ValueError(f"current_inventory missing keys: {sorted(missing_inventory)}")

    flags = payload["context_flags"]
    flag_keys = {"willpower_zone", "willpower_rule"}
    missing_flags = flag_keys - set(flags.keys())
    if missing_flags:
        raise ValueError(f"context_flags missing keys: {sorted(missing_flags)}")
