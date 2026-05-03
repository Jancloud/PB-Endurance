from __future__ import annotations

from typing import List, Optional, Tuple

from .calculations import (
    calculate_carb_ratio,
    calculate_environment_burn_multiplier,
    calculate_g_burned,
    calculate_initial_glycogen_g,
    calculate_intensity,
)
from .models import KmResult, SimulationConfig, SimulationResult


def _rolling_hour_intake(intake_events: List[Tuple[float, float]], current_time_min: float) -> float:
    window_start = current_time_min - 60.0
    return sum(g for t, g in intake_events if t > window_start)


def _resolve_pace_for_km(
    km: int,
    default_pace_seconds_per_km: float,
    pace_plan_seconds_per_km: Optional[List[float]],
) -> float:
    if pace_plan_seconds_per_km is None:
        return default_pace_seconds_per_km
    if len(pace_plan_seconds_per_km) == 0:
        return default_pace_seconds_per_km
    if km > len(pace_plan_seconds_per_km):
        return pace_plan_seconds_per_km[-1]
    return pace_plan_seconds_per_km[km - 1]


def run_simulation(
    config: SimulationConfig,
    pace_plan_seconds_per_km: Optional[List[float]] = None,
) -> SimulationResult:
    current_g = calculate_initial_glycogen_g(config.weight_kg, config.loading_percent)
    initial_g = current_g
    env_multiplier = calculate_environment_burn_multiplier(config.ambient_temp_c)
    absorption_queue: List[Tuple[int, float]] = []
    malabsorption_queue: List[Tuple[int, float]] = []
    intake_events: List[Tuple[float, float]] = []

    current_time_min = 0.0
    bonk_km = None
    km_results: List[KmResult] = []

    for km in range(1, config.race_distance_km + 1):
        pace_for_km = _resolve_pace_for_km(
            km=km,
            default_pace_seconds_per_km=config.target_pace_seconds_per_km,
            pace_plan_seconds_per_km=pace_plan_seconds_per_km,
        )
        km_time_min = pace_for_km / 60.0
        current_time_min += km_time_min
        carb_ratio = calculate_carb_ratio(pace_for_km, config.vdot)
        intensity = calculate_intensity(pace_for_km, config.vdot)

        if km in config.gel_km_list:
            absorption_queue.append((km + config.absorption_delay_km, config.gel_carb_g))

        ready_intake = 0.0
        absorption_queue_next: List[Tuple[int, float]] = []
        for ready_km, amount in absorption_queue:
            if ready_km <= km:
                ready_intake += amount
            else:
                absorption_queue_next.append((ready_km, amount))
        absorption_queue = absorption_queue_next

        malabsorption_next: List[Tuple[int, float]] = []
        for ready_km, amount in malabsorption_queue:
            if ready_km <= km:
                ready_intake += amount
            else:
                malabsorption_next.append((ready_km, amount))
        malabsorption_queue = malabsorption_next

        rolling_intake = _rolling_hour_intake(intake_events, current_time_min)
        allowed_intake = max(0.0, config.max_absorption_g_per_hour - rolling_intake)
        absorbed_g = min(ready_intake, allowed_intake)
        capped_g = max(0.0, ready_intake - absorbed_g)

        if absorbed_g > 0:
            current_g += absorbed_g
            intake_events.append((current_time_min, absorbed_g))
        if capped_g > 0:
            # 未吸收部分顺延到下一公里，模拟肠道延迟与不适
            malabsorption_queue.append((km + 1, capped_g))

        burned_g = calculate_g_burned(
            weight_kg=config.weight_kg,
            carb_ratio=carb_ratio,
            km=km,
            race_distance_km=config.race_distance_km,
            total_climb_m=config.total_climb_m,
            climb_start_m=config.climb_start_m,
            climb_mid_m=config.climb_mid_m,
            climb_end_m=config.climb_end_m,
            env_multiplier=env_multiplier,
        )
        current_g -= burned_g

        if bonk_km is None and current_g <= 0:
            bonk_km = km

        km_results.append(
            KmResult(
                km=km,
                remaining_g=current_g,
                burned_g=burned_g,
                absorbed_g=absorbed_g,
                capped_g=capped_g,
                intensity=intensity,
                absorption_active=absorbed_g > 0,
                is_bonk=bonk_km == km,
            )
        )

    return SimulationResult(
        initial_g=initial_g,
        bonk_km=bonk_km,
        km_results=km_results,
        total_time_minutes=current_time_min,
    )
