from __future__ import annotations


MIN_GEL_GAP_KM = 5


def is_willpower_zone(bonk_km: int | None) -> bool:
    if bonk_km is None:
        return False
    return bonk_km > 40.5


def is_valid_spacing(candidate_km: int, existing_km: list[int], min_gap: int = MIN_GEL_GAP_KM) -> bool:
    return all(abs(candidate_km - km) >= min_gap for km in existing_km)


def pick_safe_gap(existing_plan: list[int], bonk_km: int | None, min_gap: int = MIN_GEL_GAP_KM) -> int | None:
    if not existing_plan:
        return None

    target = 31 if bonk_km is None else max(5, min(40, bonk_km - 4))
    scan_order: list[int] = [target]
    for offset in range(1, 16):
        left = target - offset
        right = target + offset
        if left >= 5:
            scan_order.append(left)
        if right <= 40:
            scan_order.append(right)

    for km in scan_order:
        if km in existing_plan:
            continue
        if is_valid_spacing(km, existing_plan, min_gap=min_gap):
            return km
    return None
