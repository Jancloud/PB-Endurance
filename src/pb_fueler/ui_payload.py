from __future__ import annotations

from typing import Any, Optional

from .calculations import calculate_climb_extra_kcal_per_km
from .formatters import format_duration, format_pace
from .models import PaceSolverResult, SimulationConfig, SimulationResult


def _build_optimization_strategy(solver_result: Optional[PaceSolverResult]) -> dict[str, Any]:
    if solver_result is None:
        return {"mode": "disabled", "message": "Pace_Solver not requested"}

    if solver_result.advice is not None:
        advice = solver_result.advice
        return {
            "mode": "applied",
            "locked_until_km": advice.locked_until_km,
            "optimized_start_km": advice.optimized_start_km,
            "optimized_pace": format_pace(advice.optimized_pace_seconds_per_km),
            "target_finish_g": round(advice.target_finish_g, 2),
            "predicted_finish_g": round(advice.finish_remaining_g, 2),
            "predicted_finish_time": format_duration(advice.predicted_finish_time_seconds),
        }

    if solver_result.failure is not None:
        failure = solver_result.failure
        return {
            "mode": "failed",
            "locked_until_km": failure.locked_until_km,
            "optimized_start_km": failure.optimized_start_km,
            "attempted_pace": format_pace(failure.attempted_pace_seconds_per_km),
            "target_finish_g": round(failure.target_finish_g, 2),
            "predicted_finish_g": round(failure.finish_remaining_g, 2),
            "suggested_total_gels": failure.suggested_total_gels,
            "suggested_loading_percent": round(failure.suggested_loading_percent, 1),
        }

    return {"mode": "unknown"}


def build_simulator_ui_payload(
    config: SimulationConfig,
    result: SimulationResult,
    solver_result: Optional[PaceSolverResult] = None,
) -> dict[str, Any]:
    points: list[dict[str, Any]] = []
    total_absorbed_g = 0.0
    for row in result.km_results:
        climb_kcal = calculate_climb_extra_kcal_per_km(
            km=row.km,
            weight_kg=config.weight_kg,
            race_distance_km=config.race_distance_km,
            total_climb_m=config.total_climb_m,
            climb_start_m=config.climb_start_m,
            climb_mid_m=config.climb_mid_m,
            climb_end_m=config.climb_end_m,
        )
        points.append(
            {
                "km": row.km,
                "glycogen_level": round(row.remaining_g, 2),
                "is_bonk": bool(row.is_bonk),
                "has_climb": climb_kcal > 0,
                "ate_gel": row.km in config.gel_km_list,
                "absorbed_g": round(row.absorbed_g, 2),
                "capped_g": round(row.capped_g, 2),
                "absorption_active": bool(row.absorption_active),
            }
        )
        total_absorbed_g += row.absorbed_g

    return {
        "series": points,
        "summary": {
            "finish_time": format_duration(result.total_time_minutes * 60.0),
            "gel_points": list(config.gel_km_list),
            "gel_carb_g": round(config.gel_carb_g, 2),
            "planned_race_gel_carb_total_g": round(len(config.gel_km_list) * config.gel_carb_g, 2),
            "absorbed_total_g": round(total_absorbed_g, 2),
            "optimization_strategy": _build_optimization_strategy(solver_result),
        },
    }
