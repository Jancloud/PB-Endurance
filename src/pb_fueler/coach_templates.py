from __future__ import annotations

from typing import Any, TypedDict

from .coach_rules import pick_safe_gap


class FallbackAdvice(TypedDict):
    source: str
    status: str
    headline: str
    plan_a: str
    plan_b: str
    plan_c: str
    key_warning: str
    fallback_reason: str | None


def build_fallback_advice(report: dict[str, Any], reason: str) -> FallbackAdvice:
    metrics = report.get("key_metrics", {})
    race_plan = report.get("race_plan", {})
    flags = report.get("context_flags", {})
    inventory = report.get("current_inventory", {})

    bonk_km = metrics.get("bonk_km")
    pace_text = race_plan.get("pace_text", "04:20")
    willpower_zone = bool(flags.get("willpower_zone", False))
    existing_km = sorted(int(v) for v in inventory.get("in_race_gel_points_km", []) if isinstance(v, int))
    total = int(inventory.get("total_in_race_gels", len(existing_km) if existing_km else 0))
    safe_gap_km = pick_safe_gap(existing_km, int(bonk_km) if isinstance(bonk_km, int) else None)

    headline = (
        f"存在风险！预计在 {bonk_km}km 处糖原耗尽（撞墙点）。"
        if bonk_km is not None
        else f"当前策略稳健，可按 {pace_text} 推进。"
    )
    status = "撞墙" if bonk_km is not None else "安全"

    if willpower_zone:
        return {
            "source": "fallback",
            "status": status,
            "headline": headline,
            "plan_a": "方案 A：最后 1.5-2km 进入意志区，维持动作频率，避免突然提速导致抽筋。",
            "plan_b": "方案 B：将注意力放在呼吸与摆臂节奏，按 500m 小分段完成最后冲线。",
            "plan_c": f"方案 C：保持当前 {total} 根比赛中能量胶，不新增点位，优先执行心理与配速策略。",
            "key_warning": "能量储备接近临界值，属于破3常态，请以节奏稳定优先。",
            "fallback_reason": reason,
        }

    if safe_gap_km is not None:
        plan_c = (
            f"方案 C：保持当前 {total} 根比赛中能量胶，"
            f"在 {safe_gap_km}km 增加一次补给（避开重复点位且间隔>=5km）。"
        )
    else:
        plan_c = (
            f"方案 C：保持当前 {total} 根比赛中能量胶；"
            "找不到安全补给空档，改为30km后每5km补一次含糖饮料。"
        )

    return {
        "source": "fallback",
        "status": status,
        "headline": headline,
        "plan_a": "方案 A：30km 前维持目标配速，30km 后预留 5-10 秒/公里降速空间。",
        "plan_b": "方案 B：赛前 3 天强化高碳水补给，并把早餐主食量提高一档。",
        "plan_c": plan_c,
        "key_warning": "LLM 暂不可用，当前为本地回退建议。",
        "fallback_reason": reason,
    }
