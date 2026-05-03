from __future__ import annotations

import json
import logging
import re
from typing import Any

from .coach_rules import pick_safe_gap


_guard_logger = logging.getLogger('pb_fueler.coach_guard')


def _pace_to_sec(pace_text: str) -> int | None:
    match = re.match(r'^\s*(\d{1,2}):(\d{2})\s*$', pace_text)
    if not match:
        return None
    return int(match.group(1)) * 60 + int(match.group(2))


def _sec_to_pace(sec: int) -> str:
    safe_sec = max(1, int(sec))
    return f'{safe_sec // 60:02d}:{safe_sec % 60:02d}'


def _normalize_plan_b(raw_plan_b: str, split_km: int, rescue_sec: int) -> str:
    text = (raw_plan_b or '').strip()
    text = re.sub(r'^\s*方案\s*B\s*[（(][^）)]*[）)]\s*[：:]\s*', '', text)
    text = re.sub(r'^\s*方案\s*B\s*[：:]\s*', '', text)
    text = re.sub(r'^\s*配速执行\s*[：:]\s*', '', text)

    if not text:
        text = f'{split_km}km 后若感觉吃力，可降速至 {_sec_to_pace(rescue_sec)}，确保以 15g 糖原冲线。'

    return f'方案B（配速执行）：{text}'


def enforce_inventory_constraints(report: dict[str, Any], advice: dict[str, Any]) -> dict[str, Any]:
    inventory = report.get('current_inventory', {})
    race_plan = report.get('race_plan', {})
    optimize = report.get('optimization_strategy', {})
    key_metrics = report.get('key_metrics', {})
    flags = report.get('context_flags', {})

    existing_km = sorted(int(v) for v in inventory.get('in_race_gel_points_km', []) if isinstance(v, int))
    total = int(inventory.get('total_in_race_gels', len(existing_km) if existing_km else 0))
    bonk_km = key_metrics.get('bonk_km')
    bonk_value = int(bonk_km) if isinstance(bonk_km, int) else None
    willpower_zone = bool(flags.get('willpower_zone', False))

    pace_text = str(race_plan.get('pace_text', '04:20'))
    base_sec = _pace_to_sec(pace_text) or 260
    rescue_sec = min(420, base_sec + 10)
    split_km = int(optimize.get('optimized_start_km', 30))

    normalized = dict(advice)
    original = dict(advice)
    notes: list[str] = []

    if bonk_value is not None:
        target_headline = f'存在风险！预计在 {bonk_value}km 处糖原耗尽（撞墙点）。'
        if normalized.get('headline') != target_headline:
            notes.append('headline 按 bonk_km 强制对齐')
        normalized['headline'] = target_headline

    target_plan_a = (
        f'方案A（配速调整）：{split_km}km 前维持 {_sec_to_pace(base_sec)}，'
        f'{split_km}km 后下调到 {_sec_to_pace(rescue_sec)}，优先把终点糖原拉回安全区。'
    )
    if normalized.get('plan_a') != target_plan_a:
        notes.append('plan_a 改为纯配速策略，移除补给点冲突')
    normalized['plan_a'] = target_plan_a

    normalized_plan_b = _normalize_plan_b(str(normalized.get('plan_b', '')), split_km, rescue_sec)
    if normalized.get('plan_b') != normalized_plan_b:
        notes.append('plan_b 标题统一为“方案B（配速执行）”')
    normalized['plan_b'] = normalized_plan_b

    if willpower_zone:
        target_plan_c = (
            f'方案C（心理执行）：保持当前 {total} 根比赛中能量胶，不新增点位，'
            '最后1.5km按“呼吸-摆臂-步频”节奏推进，靠意志力完成冲线。'
        )
        notes.append('willpower_zone 触发，禁用新增补给建议')
    else:
        new_km = pick_safe_gap(existing_km, bonk_value)
        if new_km is not None:
            target_plan_c = (
                f'方案C（补给补丁）：保持 {total} 根比赛中能量胶，'
                f'在 {new_km}km 增加一次补给（避开已安排点位），总数调整为 {total + 1} 根。'
            )
        else:
            target_plan_c = (
                f'方案C（补给补丁）：保持 {total} 根比赛中能量胶；'
                '找不到安全补给空档，改为30km后每5km补一次含糖饮料。'
            )

    if normalized.get('plan_c') != target_plan_c:
        notes.append('plan_c 按库存与间隔规则重写')
    normalized['plan_c'] = target_plan_c

    if willpower_zone:
        target_warning = 'WILLPOWER_ZONE 已触发：最后阶段以心理与配速执行优先，不再增加补给点。'
    else:
        points_text = '、'.join(str(km) for km in existing_km) if existing_km else '无'
        target_warning = (
            f'当前比赛中胶数量为 {total} 根，已安排在 {points_text}km；'
            '新增补给点需确保不重复且间隔至少5km。'
        )

    if normalized.get('key_warning') != target_warning:
        notes.append('key_warning 改为系统约束说明')
    normalized['key_warning'] = target_warning

    if notes:
        _guard_logger.warning(
            'coach_guard_corrected advice=%s',
            json.dumps(
                {
                    'bonk_km': bonk_value,
                    'willpower_zone': willpower_zone,
                    'inventory_total': total,
                    'inventory_points': existing_km,
                    'notes': notes,
                    'before': {
                        'headline': original.get('headline'),
                        'plan_a': original.get('plan_a'),
                        'plan_b': original.get('plan_b'),
                        'plan_c': original.get('plan_c'),
                        'key_warning': original.get('key_warning'),
                    },
                    'after': {
                        'headline': normalized.get('headline'),
                        'plan_a': normalized.get('plan_a'),
                        'plan_b': normalized.get('plan_b'),
                        'plan_c': normalized.get('plan_c'),
                        'key_warning': normalized.get('key_warning'),
                    },
                },
                ensure_ascii=False,
            ),
        )

    return normalized
