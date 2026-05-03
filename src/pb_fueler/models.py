from dataclasses import dataclass
from typing import List, Optional


@dataclass
class SimulationConfig:
    weight_kg: float
    vdot: float
    target_pace_seconds_per_km: float
    loading_percent: float
    gel_km_list: List[int]
    ambient_temp_c: float = 12.0
    total_climb_m: float = 0.0
    climb_start_m: Optional[float] = None
    climb_mid_m: Optional[float] = None
    climb_end_m: Optional[float] = None
    gel_carb_g: float = 25.0
    absorption_delay_km: int = 2
    max_absorption_g_per_hour: float = 60.0
    race_distance_km: int = 42


@dataclass
class KmResult:
    km: int
    remaining_g: float
    burned_g: float
    absorbed_g: float
    capped_g: float
    intensity: float
    absorption_active: bool
    is_bonk: bool


@dataclass
class SimulationResult:
    initial_g: float
    bonk_km: Optional[int]
    km_results: List[KmResult]
    total_time_minutes: float


@dataclass
class PaceSolverAdvice:
    bonk_km: int
    locked_until_km: int
    optimized_start_km: int
    end_km: int
    optimized_pace_seconds_per_km: float
    finish_remaining_g: float
    target_finish_g: float
    predicted_finish_time_seconds: float


@dataclass
class PaceSolverFailure:
    bonk_km: int
    locked_until_km: int
    optimized_start_km: int
    attempted_pace_seconds_per_km: float
    finish_remaining_g: float
    target_finish_g: float
    suggested_total_gels: int
    suggested_loading_percent: float


@dataclass
class PaceSolverResult:
    advice: Optional[PaceSolverAdvice]
    failure: Optional[PaceSolverFailure]
