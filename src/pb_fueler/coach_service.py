from __future__ import annotations

from .coach_payload import build_coach_payload
from .llm_client import request_coach_advice
from .models import PaceSolverResult, SimulationConfig, SimulationResult


def generate_coach_advice(
    config: SimulationConfig,
    result: SimulationResult,
    solver_result: PaceSolverResult | None = None,
) -> dict:
    report = build_coach_payload(config, result, solver_result)
    advice = request_coach_advice(report)
    return {"report": report, "advice": advice}
