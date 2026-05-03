from __future__ import annotations

from typing import List

from .models import SimulationConfig
from .simulator import run_simulation


def build_split_pace_plan(
    race_distance_km: int,
    default_pace_seconds_per_km: float,
    start_km: int,
    rescue_pace_seconds_per_km: float,
) -> List[float]:
    pace_plan = [default_pace_seconds_per_km] * race_distance_km
    for km in range(start_km, race_distance_km + 1):
        pace_plan[km - 1] = rescue_pace_seconds_per_km
    return pace_plan


def simulate_finish_remaining(
    config: SimulationConfig,
    start_km: int,
    rescue_pace_seconds_per_km: float,
) -> float:
    pace_plan = build_split_pace_plan(
        race_distance_km=config.race_distance_km,
        default_pace_seconds_per_km=config.target_pace_seconds_per_km,
        start_km=start_km,
        rescue_pace_seconds_per_km=rescue_pace_seconds_per_km,
    )
    result = run_simulation(config, pace_plan_seconds_per_km=pace_plan)
    return result.km_results[-1].remaining_g


def estimate_finish_time_seconds(
    race_distance_km: int,
    optimized_start_km: int,
    base_pace_seconds_per_km: float,
    rescue_pace_seconds_per_km: float,
) -> float:
    front_km = max(0, optimized_start_km - 1)
    back_km = max(0, race_distance_km - front_km)
    return front_km * base_pace_seconds_per_km + back_km * rescue_pace_seconds_per_km
