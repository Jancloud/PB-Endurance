from __future__ import annotations

import math
from typing import Optional

from .decision_point import choose_pace_solver_split
from .models import PaceSolverAdvice, PaceSolverFailure, PaceSolverResult, SimulationConfig, SimulationResult
from .rescue_helpers import estimate_finish_time_seconds, simulate_finish_remaining


def _build_advice(
    config: SimulationConfig,
    baseline: SimulationResult,
    locked_until_km: int,
    optimized_start_km: int,
    pace_seconds_per_km: float,
    finish_remaining_g: float,
    target_finish_g: float,
) -> PaceSolverResult:
    finish_time_s = estimate_finish_time_seconds(
        race_distance_km=config.race_distance_km,
        optimized_start_km=optimized_start_km,
        base_pace_seconds_per_km=config.target_pace_seconds_per_km,
        rescue_pace_seconds_per_km=pace_seconds_per_km,
    )
    advice = PaceSolverAdvice(
        bonk_km=baseline.bonk_km or config.race_distance_km,
        locked_until_km=locked_until_km,
        optimized_start_km=optimized_start_km,
        end_km=config.race_distance_km,
        optimized_pace_seconds_per_km=pace_seconds_per_km,
        finish_remaining_g=finish_remaining_g,
        target_finish_g=target_finish_g,
        predicted_finish_time_seconds=finish_time_s,
    )
    return PaceSolverResult(advice=advice, failure=None)


def _build_failure(
    config: SimulationConfig,
    baseline: SimulationResult,
    locked_until_km: int,
    optimized_start_km: int,
    attempted_pace_seconds_per_km: float,
    finish_remaining_g: float,
    target_finish_g: float,
) -> PaceSolverResult:
    deficit_g = max(0.0, target_finish_g - finish_remaining_g)
    suggested_extra_gels = max(1, math.ceil(deficit_g / config.gel_carb_g))
    total_capacity = config.weight_kg * 7.5
    suggested_loading_percent = min(100.0, config.loading_percent + deficit_g / total_capacity * 100.0)

    failure = PaceSolverFailure(
        bonk_km=baseline.bonk_km or config.race_distance_km,
        locked_until_km=locked_until_km,
        optimized_start_km=optimized_start_km,
        attempted_pace_seconds_per_km=attempted_pace_seconds_per_km,
        finish_remaining_g=finish_remaining_g,
        target_finish_g=target_finish_g,
        suggested_total_gels=len(config.gel_km_list) + suggested_extra_gels,
        suggested_loading_percent=suggested_loading_percent,
    )
    return PaceSolverResult(advice=None, failure=failure)


def find_pace_solver_result(
    config: SimulationConfig,
    baseline: SimulationResult,
    target_finish_g: float = 15.0,
    tolerance_g: float = 0.5,
    practical_max_pace_seconds_per_km: float = 360.0,
    lock_km_before_bonk: int = 5,
) -> Optional[PaceSolverResult]:
    if baseline.bonk_km is None:
        return None

    locked_until_km, optimized_start_km = choose_pace_solver_split(
        config=config,
        baseline=baseline,
        lock_km_before_bonk=lock_km_before_bonk,
    )

    low = config.target_pace_seconds_per_km
    high = max(low, practical_max_pace_seconds_per_km)

    low_remaining = simulate_finish_remaining(config, optimized_start_km, low)
    high_remaining = simulate_finish_remaining(config, optimized_start_km, high)

    if high_remaining < target_finish_g:
        return _build_failure(
            config,
            baseline,
            locked_until_km,
            optimized_start_km,
            high,
            high_remaining,
            target_finish_g,
        )

    if low_remaining >= target_finish_g:
        return _build_advice(
            config,
            baseline,
            locked_until_km,
            optimized_start_km,
            low,
            low_remaining,
            target_finish_g,
        )

    best_pace = high
    best_remaining = high_remaining
    for _ in range(40):
        mid = (low + high) / 2.0
        mid_remaining = simulate_finish_remaining(config, optimized_start_km, mid)
        if mid_remaining >= target_finish_g:
            high = mid
            best_pace = mid
            best_remaining = mid_remaining
        else:
            low = mid

        if abs(best_remaining - target_finish_g) <= tolerance_g:
            break

    final_pace = best_pace
    final_remaining = best_remaining
    return _build_advice(
        config,
        baseline,
        locked_until_km,
        optimized_start_km,
        final_pace,
        final_remaining,
        target_finish_g,
    )
