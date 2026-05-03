from __future__ import annotations

from typing import List


def _linspace_int(start: float, end: float, count: int) -> List[int]:
    if count <= 0:
        return []
    if count == 1:
        return [round(start)]
    step = (end - start) / (count - 1)
    return [round(start + i * step) for i in range(count)]


def auto_distribute_gels(total_gels: int) -> List[int]:
    if total_gels < 0:
        raise ValueError("--auto-gels 不能为负数")
    if total_gels == 0:
        return []
    if total_gels > 30:
        raise ValueError("--auto-gels 过大，建议不超过 30")

    first_point = 6
    if total_gels == 1:
        return [first_point]
    if total_gels == 2:
        return [first_point, 35]

    # 第一个点提前在 5-7km 开启，最后一个点卡在 35km。
    # 中间点在 7-35km 区间做等分插值（不重复占用端点）。
    middle_count = total_gels - 2
    middle_with_edges = _linspace_int(7.0, 35.0, middle_count + 2)
    middle_points = middle_with_edges[1:-1]
    points = [first_point] + middle_points + [35]

    normalized = []
    for km in points:
        km = max(1, min(42, km))
        if not normalized or normalized[-1] != km:
            normalized.append(km)

    while len(normalized) < total_gels:
        candidate = normalized[-1] + 1
        if candidate > 35:
            break
        normalized.append(candidate)

    return normalized[:total_gels]
