from __future__ import annotations

import argparse
import sys
from pathlib import Path
from typing import List

from .exporters import export_simulation_csv
from .models import SimulationConfig
from .planning import auto_distribute_gels
from .reporting import print_report
from .simulator import run_simulation


def parse_gel_km_list(raw: str) -> List[int]:
    if not raw.strip():
        return []
    values = []
    for item in raw.split(","):
        km = int(item.strip())
        if km < 1 or km > 42:
            raise ValueError(f"补给公里必须在 1-42 之间: {km}")
        values.append(km)
    return sorted(set(values))


def resolve_gel_points(gel_km_raw: str, auto_gels: int | None) -> List[int]:
    manual_points = parse_gel_km_list(gel_km_raw)
    if manual_points:
        return manual_points
    if auto_gels is not None:
        return auto_distribute_gels(auto_gels)
    return []


def validate_climb_segment_args(args: argparse.Namespace) -> None:
    segment_values = [args.climb_start, args.climb_mid, args.climb_end]
    if any(v is not None for v in segment_values) and not all(v is not None for v in segment_values):
        raise ValueError("如需分段爬升，请同时提供 --climb-start --climb-mid --climb-end")


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="PB Fueler CLI: 马拉松补给仿真")
    parser.add_argument("--weight", type=float, required=True, help="体重(kg)")
    parser.add_argument("--vdot", type=float, required=True, help="VDOT")
    parser.add_argument("--pace", type=float, required=True, help="目标配速(秒/公里)")
    parser.add_argument("--loading", type=float, default=100.0, help="碳水装载百分比(0-100)")
    parser.add_argument("--ambient-temp", type=float, default=12.0, help="环境温度(°C)，默认 12")
    parser.add_argument("--total-climb", type=float, default=0.0, help="总爬升(m)")
    parser.add_argument("--climb-start", type=float, default=None, help="前段爬升(m, 1-14km)")
    parser.add_argument("--climb-mid", type=float, default=None, help="中段爬升(m, 15-28km)")
    parser.add_argument("--climb-end", type=float, default=None, help="后段爬升(m, 29-42km)")
    parser.add_argument("--gel-km", type=str, default="", help="补给公里列表，如 7,14,21")
    parser.add_argument("--auto-gels", type=int, default=None, help="自动补给总次数（仅在未提供 --gel-km 时生效）")
    parser.add_argument("--gel-carb", type=float, default=25.0, help="每次补给碳水克数")
    parser.add_argument("--delay-km", type=int, default=2, help="补给吸收延迟(公里)")
    parser.add_argument("--max-absorb", type=float, default=60.0, help="每小时最大吸收(g/hr)")
    parser.add_argument("--optimize", action="store_true", help="启用 Pace_Solver 优化（Bonk 时触发）")
    parser.add_argument("--export", choices=["csv"], default=None, help="导出仿真数据")
    parser.add_argument("--export-path", type=str, default="pb_fueler_output.csv", help="CSV 导出路径")
    return parser


def main() -> int:
    parser = build_parser()
    args = parser.parse_args()

    try:
        validate_climb_segment_args(args)
        gel_points = resolve_gel_points(args.gel_km, args.auto_gels)
        config = SimulationConfig(
            weight_kg=args.weight,
            vdot=args.vdot,
            target_pace_seconds_per_km=args.pace,
            loading_percent=args.loading,
            gel_km_list=gel_points,
            ambient_temp_c=args.ambient_temp,
            total_climb_m=args.total_climb,
            climb_start_m=args.climb_start,
            climb_mid_m=args.climb_mid,
            climb_end_m=args.climb_end,
            gel_carb_g=args.gel_carb,
            absorption_delay_km=args.delay_km,
            max_absorption_g_per_hour=args.max_absorb,
        )

        result = run_simulation(config)
        print_report(config, result, args.optimize)

        if args.export == "csv":
            output_path = export_simulation_csv(result, Path(args.export_path).resolve())
            print(f"CSV 已导出: {output_path}")
        return 0
    except Exception as exc:  # 基础错误捕获，避免新手直接看到堆栈
        print(f"参数或计算出错: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
