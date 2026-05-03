from __future__ import annotations

import csv
from pathlib import Path

from .models import SimulationResult


def export_simulation_csv(result: SimulationResult, output_path: Path) -> Path:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with output_path.open("w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(["km", "remaining_g", "intensity", "absorption_active", "is_bonk"])
        for row in result.km_results:
            writer.writerow(
                [
                    row.km,
                    f"{row.remaining_g:.4f}",
                    f"{row.intensity:.6f}",
                    "1" if row.absorption_active else "0",
                    "1" if row.is_bonk else "0",
                ]
            )
    return output_path
