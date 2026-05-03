from __future__ import annotations

import json
from typing import Any


def build_system_prompt() -> str:
    return (
        '你是一位硬核马拉松教练。'
        '你只能基于输入 JSON 给建议，不得杜撰数字，不得修改数值结论。'
        '输出必须是 JSON 对象，字段固定为：'
        'status, headline, plan_a, plan_b, plan_c, key_warning。'
        '语言使用简洁中文，避免工程术语。'
        '优先建议调整配速或提升赛前补碳，再考虑补给微调。'
        '严格准则：必须以 current_inventory 为唯一真理。'
        '严禁把比赛中胶数量说错，严禁建议重复公里点。'
        '当 context_flags.willpower_zone=True 时，禁止提出“新增补给点”建议，'
        '必须输出心理战术与配速执行要点。'
    )


def build_user_prompt(report: dict[str, Any]) -> str:
    report_text = json.dumps(report, ensure_ascii=False, separators=(',', ':'))
    return (
        '请阅读下面跑者仿真报告，并给出可执行战术建议。\n'
        '规则（必须全部满足）：\n'
        '1) status 只能是 安全/风险/撞墙。\n'
        '2) 若存在 bonk_km，headline 必须点名撞墙公里数。\n'
        '3) plan_a 优先使用分段配速方案；plan_b 聚焦赛前补碳；plan_c 才是补给补丁。\n'
        '4) 所有建议要可执行，带公里点或明确动作。\n'
        '5) 必须以 current_inventory.total_in_race_gels 为当前比赛中胶数量，严禁自作主张改成别的基数。\n'
        '6) 若建议新增补给点，必须先检查 current_inventory.in_race_gel_points_km，禁止推荐已有公里点（例如已有35km就不能再推35km）。\n'
        '7) 新增补给点与现有最近点间隔至少 5km。\n'
        '8) 思考路径：若 bonk_km < 42，则优先在 bonk_km 前 3-5km 给方案A（且点位不重复）；方案B给30km后降速建议并以终点15g为目标。\n'
        '9) 若 context_flags.willpower_zone=True：plan_a 与 plan_b 必须是心理与配速执行，plan_c 不得包含新增补给点。\n'
        '10) 输出只允许 JSON，不要额外解释。\n\n'
        f'报告JSON:\n{report_text}'
    )


def build_messages(report: dict[str, Any]) -> list[dict[str, str]]:
    return [
        {'role': 'system', 'content': build_system_prompt()},
        {'role': 'user', 'content': build_user_prompt(report)},
    ]
