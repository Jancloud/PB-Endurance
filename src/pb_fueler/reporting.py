from __future__ import annotations

from .formatters import format_duration, format_pace
from .models import SimulationConfig, SimulationResult
from .optimizer import find_pace_solver_result


def print_report(config: SimulationConfig, result: SimulationResult, enable_optimize: bool) -> None:
    print("=" * 72)
    print("PB Fueler 仿真结果")
    print(f"初始糖原: {result.initial_g:.2f} g")
    print(f"补给点: {config.gel_km_list if config.gel_km_list else '无'}")
    print(f"预计完赛时间(原计划): {format_duration(result.total_time_minutes * 60.0)}")
    print("=" * 72)
    print("KM | Remaining_G(g) | Delta(g) | Absorbed(g) | Capped(g) | Note")

    prev_remaining = result.initial_g
    for row in result.km_results:
        delta = row.remaining_g - prev_remaining
        note = "<<< BONK POINT" if row.is_bonk else ""
        print(
            f"{row.km:>2} | {row.remaining_g:>14.2f} | {delta:>8.2f} |"
            f" {row.absorbed_g:>11.2f} | {row.capped_g:>9.2f} | {note}"
        )
        prev_remaining = row.remaining_g

    print("=" * 72)
    if result.bonk_km is None:
        print("结论: 全程未预测到撞墙，当前策略可行。")
        if enable_optimize:
            print("Pace_Solver: 未检测到 Bonk，跳过优化。")
        return

    print(f"结论: 在 {result.bonk_km}km 预测撞墙，请提高补给频率或降低目标配速。")
    if not enable_optimize:
        return

    solver_result = find_pace_solver_result(config, result)
    if solver_result is None:
        print("Pace_Solver: 未检测到 Bonk，跳过优化。")
    elif solver_result.advice is not None:
        advice = solver_result.advice
        print(
            f"Pace_Solver 锁定区间: 1-{advice.locked_until_km}km 保持原计划，"
            f"优化区间: {advice.optimized_start_km}-{advice.end_km}km。"
        )
        print(
            "分段配速建议: 前段保持原配速，后段调整为 "
            f"{format_pace(advice.optimized_pace_seconds_per_km)}/km，"
            f"目标终点糖原 {advice.target_finish_g:.1f} g，"
            f"预计实际 {advice.finish_remaining_g:.2f} g。"
        )
        print(f"调整后预计完赛时间: {format_duration(advice.predicted_finish_time_seconds)}")
    elif solver_result.failure is not None:
        failure = solver_result.failure
        print(
            f"Pace_Solver 锁定区间: 1-{failure.locked_until_km}km 保持原计划，"
            f"优化区间: {failure.optimized_start_km}-42km。"
        )
        print(
            "Pace_Solver 无解: 即便后段降到 "
            f"{format_pace(failure.attempted_pace_seconds_per_km)}/km，"
            f"终点仍为 {failure.finish_remaining_g:.2f} g，低于目标 {failure.target_finish_g:.1f} g。"
        )
        print(
            "补救建议: 请把补给总数提高到约 "
            f"{failure.suggested_total_gels} 根，或把 Loading 提高到约 "
            f"{failure.suggested_loading_percent:.1f}%。"
        )
