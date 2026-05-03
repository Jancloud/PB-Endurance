from __future__ import annotations

from typing import Optional


def linear_interpolate(x: float, x0: float, y0: float, x1: float, y1: float) -> float:
    if x1 == x0:
        return y0
    ratio = (x - x0) / (x1 - x0)
    return y0 + ratio * (y1 - y0)


def vdot_to_vo2max_velocity_m_per_min(vdot: float) -> float:
    # Daniels 近似公式反解：VO2 = -4.6 + 0.182258v + 0.000104v^2
    a = 0.000104
    b = 0.182258
    c = -4.6 - vdot
    discriminant = b * b - 4 * a * c
    if discriminant <= 0:
        raise ValueError("VDOT 参数不合法，无法计算配速速度")
    return (-b + discriminant ** 0.5) / (2 * a)


def pace_seconds_to_velocity_m_per_min(pace_seconds_per_km: float) -> float:
    if pace_seconds_per_km <= 0:
        raise ValueError("目标配速必须大于 0 秒/公里")
    return 60000.0 / pace_seconds_per_km


def calculate_intensity(target_pace_seconds_per_km: float, vdot: float) -> float:
    current_velocity = pace_seconds_to_velocity_m_per_min(target_pace_seconds_per_km)
    vdot_velocity = vdot_to_vo2max_velocity_m_per_min(vdot)
    return current_velocity / vdot_velocity


def calculate_carb_ratio(target_pace_seconds_per_km: float, vdot: float) -> float:
    intensity = calculate_intensity(target_pace_seconds_per_km, vdot)

    if intensity < 0.60:
        return 0.50
    if intensity <= 0.80:
        return linear_interpolate(intensity, 0.60, 0.50, 0.80, 0.82)
    if intensity <= 0.88:
        return linear_interpolate(intensity, 0.80, 0.82, 0.88, 0.92)
    if intensity <= 0.95:
        return linear_interpolate(intensity, 0.88, 0.92, 0.95, 1.00)
    return 1.00


def calculate_initial_glycogen_g(weight_kg: float, loading_percent: float) -> float:
    if weight_kg <= 0:
        raise ValueError("体重必须大于 0")
    if loading_percent < 0 or loading_percent > 100:
        raise ValueError("装载百分比必须在 0-100 之间")
    total_capacity = weight_kg * 7.5
    return total_capacity * (loading_percent / 100.0)


def calculate_environment_burn_multiplier(ambient_temp: float = 12.0) -> float:
    if ambient_temp <= 15.0:
        return 1.0
    temp_delta = ambient_temp - 15.0
    return 1.0 + temp_delta * 0.01


def calculate_base_kcal_per_km(weight_kg: float) -> float:
    return weight_kg * 1.03


def calculate_climb_extra_kcal_total(weight_kg: float, climb_m: float) -> float:
    if climb_m <= 0:
        return 0.0
    return weight_kg * climb_m * 0.01


def _km_bounds_for_three_sections(race_distance_km: int) -> tuple[range, range, range]:
    start_end = min(14, race_distance_km)
    mid_start = start_end + 1
    mid_end = min(28, race_distance_km)
    end_start = mid_end + 1

    start_rng = range(1, start_end + 1)
    mid_rng = range(mid_start, mid_end + 1) if mid_start <= mid_end else range(0)
    end_rng = range(end_start, race_distance_km + 1) if end_start <= race_distance_km else range(0)
    return start_rng, mid_rng, end_rng


def calculate_climb_extra_kcal_per_km(
    km: int,
    weight_kg: float,
    race_distance_km: int,
    total_climb_m: float = 0.0,
    climb_start_m: Optional[float] = None,
    climb_mid_m: Optional[float] = None,
    climb_end_m: Optional[float] = None,
) -> float:
    if race_distance_km <= 0:
        raise ValueError("race_distance_km 必须大于 0")
    if km < 1 or km > race_distance_km:
        raise ValueError(f"km 必须在 1..{race_distance_km} 之间")

    has_three_part = (
        climb_start_m is not None
        and climb_mid_m is not None
        and climb_end_m is not None
    )
    if has_three_part:
        start_rng, mid_rng, end_rng = _km_bounds_for_three_sections(race_distance_km)
        if km in start_rng:
            seg_climb_m = max(0.0, float(climb_start_m))
            seg_len = len(start_rng)
        elif km in mid_rng:
            seg_climb_m = max(0.0, float(climb_mid_m))
            seg_len = len(mid_rng)
        else:
            seg_climb_m = max(0.0, float(climb_end_m))
            seg_len = len(end_rng) if len(end_rng) > 0 else 1

        seg_total_kcal = calculate_climb_extra_kcal_total(weight_kg, seg_climb_m)
        return seg_total_kcal / seg_len

    total_kcal = calculate_climb_extra_kcal_total(weight_kg, max(0.0, total_climb_m))
    return total_kcal / race_distance_km


def calculate_g_burned(
    weight_kg: float,
    carb_ratio: float,
    km: int,
    race_distance_km: int,
    total_climb_m: float = 0.0,
    climb_start_m: Optional[float] = None,
    climb_mid_m: Optional[float] = None,
    climb_end_m: Optional[float] = None,
    env_multiplier: float = 1.0,
) -> float:
    base_kcal = calculate_base_kcal_per_km(weight_kg)
    climb_kcal = calculate_climb_extra_kcal_per_km(
        km=km,
        weight_kg=weight_kg,
        race_distance_km=race_distance_km,
        total_climb_m=total_climb_m,
        climb_start_m=climb_start_m,
        climb_mid_m=climb_mid_m,
        climb_end_m=climb_end_m,
    )
    total_kcal = base_kcal + climb_kcal
    return ((total_kcal * carb_ratio) / 4.0) * env_multiplier
