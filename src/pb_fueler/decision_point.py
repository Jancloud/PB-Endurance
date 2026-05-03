from __future__ import annotations

from .models import SimulationConfig, SimulationResult


def choose_pace_solver_split(
    config: SimulationConfig,
    baseline: SimulationResult,
    lock_km_before_bonk: int = 5,
) -> tuple[int, int]:
    if baseline.bonk_km is None:
        raise ValueError("无 Bonk Point 时不应调用决策点计算")

    bonk_km = baseline.bonk_km
    locked_until_km = max(1, bonk_km - lock_km_before_bonk)
    optimized_start_km = min(config.race_distance_km, locked_until_km + 1)

    return locked_until_km, optimized_start_km
