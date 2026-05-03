from __future__ import annotations

from .calculations import calculate_climb_extra_kcal_total
from .coach_payload_schema import CoachPayload, validate_coach_payload
from .coach_rules import is_willpower_zone
from .formatters import format_duration, format_pace
from .models import PaceSolverResult, SimulationConfig, SimulationResult


def _resolve_optimization_strategy(solver_result: PaceSolverResult | None) -> dict:
    if solver_result is None:
        return {'mode': 'disabled'}
    if solver_result.advice is not None:
        advice = solver_result.advice
        return {
            'mode': 'applied',
            'optimized_start_km': advice.optimized_start_km,
            'optimized_pace': format_pace(advice.optimized_pace_seconds_per_km),
            'predicted_finish_g': round(advice.finish_remaining_g, 2),
            'target_finish_g': round(advice.target_finish_g, 2),
        }
    if solver_result.failure is not None:
        failure = solver_result.failure
        return {
            'mode': 'failed',
            'optimized_start_km': failure.optimized_start_km,
            'attempted_pace': format_pace(failure.attempted_pace_seconds_per_km),
            'predicted_finish_g': round(failure.finish_remaining_g, 2),
            'target_finish_g': round(failure.target_finish_g, 2),
            'suggested_loading_percent': round(failure.suggested_loading_percent, 1),
        }
    return {'mode': 'unknown'}


def _resolve_total_climb_m(config: SimulationConfig) -> float:
    if (
        config.climb_start_m is not None
        and config.climb_mid_m is not None
        and config.climb_end_m is not None
    ):
        return float(config.climb_start_m + config.climb_mid_m + config.climb_end_m)
    return float(config.total_climb_m)


def build_coach_payload(
    config: SimulationConfig,
    result: SimulationResult,
    solver_result: PaceSolverResult | None = None,
) -> CoachPayload:
    finish_remaining_g = round(result.km_results[-1].remaining_g, 2) if result.km_results else 0.0
    lowest_remaining_g = round(min((row.remaining_g for row in result.km_results), default=0.0), 2)
    total_climb_m = _resolve_total_climb_m(config)
    climb_extra_kcal = round(calculate_climb_extra_kcal_total(config.weight_kg, total_climb_m), 2)
    gel_points = list(config.gel_km_list)

    payload: CoachPayload = {
        'schema_version': '1.0.0',
        'runner_profile': {
            'weight_kg': round(config.weight_kg, 2),
            'vdot': round(config.vdot, 2),
            'loading_percent': round(config.loading_percent, 1),
            'initial_glycogen_g': round(result.initial_g, 2),
        },
        'race_plan': {
            'pace_sec_per_km': round(config.target_pace_seconds_per_km, 2),
            'pace_text': format_pace(config.target_pace_seconds_per_km),
            'gel_points': gel_points,
            'ambient_temp_c': round(config.ambient_temp_c, 1),
        },
        'current_inventory': {
            'total_in_race_gels': len(gel_points),
            'in_race_gel_points_km': gel_points,
            'strategy_details': '已经在 ' + ', '.join(str(km) for km in gel_points) + 'km 安排了补给',
            'pre_race_loading': '已包含 1 根起跑前能量胶（不计入比赛中胶数量）',
            'source_of_truth': '必须以 total_in_race_gels 和 in_race_gel_points_km 为唯一事实',
        },
        'context_flags': {
            'willpower_zone': is_willpower_zone(result.bonk_km),
            'willpower_rule': 'bonk_km > 40.5 时触发心理战术优先',
        },
        'key_metrics': {
            'bonk_km': result.bonk_km,
            'finish_time': format_duration(result.total_time_minutes * 60.0),
            'finish_remaining_g': finish_remaining_g,
            'lowest_remaining_g': lowest_remaining_g,
        },
        'remaining_g_curve': [
            {'km': row.km, 'remaining_g': round(row.remaining_g, 2), 'intensity': round(row.intensity, 3)}
            for row in result.km_results
        ],
        'climb_impact': {
            'total_climb_m': round(total_climb_m, 2),
            'extra_kcal_total': climb_extra_kcal,
            'segmented': (
                config.climb_start_m is not None
                and config.climb_mid_m is not None
                and config.climb_end_m is not None
            ),
            'segments_m': {
                'start': round(config.climb_start_m or 0.0, 2),
                'mid': round(config.climb_mid_m or 0.0, 2),
                'end': round(config.climb_end_m or 0.0, 2),
            },
        },
        'optimization_strategy': _resolve_optimization_strategy(solver_result),
    }
    validate_coach_payload(payload)
    return payload
