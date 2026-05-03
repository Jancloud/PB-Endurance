from __future__ import annotations

from pathlib import Path
from typing import Optional

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field
from pydantic.config import ConfigDict

from .coach_service import generate_coach_advice
from .formatters import format_duration
from .models import SimulationConfig
from .optimizer import find_pace_solver_result
from .planning import auto_distribute_gels
from .simulator import run_simulation
from .ui_payload import build_simulator_ui_payload


class SimRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    weight_kg: float = Field(default=65.0, gt=0)
    vdot: float = Field(default=53.6, gt=0)
    pace_sec_per_km: float = Field(default=250.0, gt=0)
    loading_percent: float = Field(default=90.0, ge=0, le=100)
    gel_count: int = Field(default=6, ge=0)
    gel_carb_g: float = Field(default=25.0, gt=0)
    ambient_temp_c: float = 12.0
    total_climb_m: float = Field(default=0.0, ge=0)
    climb_start_m: Optional[float] = Field(default=None, ge=0)
    climb_mid_m: Optional[float] = Field(default=None, ge=0)
    climb_end_m: Optional[float] = Field(default=None, ge=0)
    optimize: bool = False


app = FastAPI(title="PB Fueler Web")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _build_config(req: SimRequest) -> SimulationConfig:
    return SimulationConfig(
        weight_kg=req.weight_kg,
        vdot=req.vdot,
        target_pace_seconds_per_km=req.pace_sec_per_km,
        loading_percent=req.loading_percent,
        gel_km_list=auto_distribute_gels(req.gel_count),
        gel_carb_g=req.gel_carb_g,
        ambient_temp_c=req.ambient_temp_c,
        total_climb_m=req.total_climb_m,
        climb_start_m=req.climb_start_m,
        climb_mid_m=req.climb_mid_m,
        climb_end_m=req.climb_end_m,
    )


def _validate_segmented_climb(req: SimRequest) -> Optional[dict]:
    segmented_values = [req.climb_start_m, req.climb_mid_m, req.climb_end_m]
    if any(v is not None for v in segmented_values) and not all(v is not None for v in segmented_values):
        return {"error": "如需分段爬升，请同时提供 climb_start_m/climb_mid_m/climb_end_m"}
    return None


@app.post("/api/simulate")
def api_simulate(req: SimRequest):
    validation_error = _validate_segmented_climb(req)
    if validation_error is not None:
        return validation_error

    config = _build_config(req)
    result = run_simulation(config)
    solver_result = find_pace_solver_result(config, result) if req.optimize else None
    payload = build_simulator_ui_payload(config, result, solver_result)

    # UI 强制按业务规则：预计完赛时间 = 目标配速 * 42.195
    payload["summary"]["finish_time"] = format_duration(req.pace_sec_per_km * 42.195)

    # 给 tooltip 追加实时配速和糖耗增量
    prev = result.initial_g
    for i, row in enumerate(result.km_results):
        delta = row.remaining_g - prev
        payload["series"][i]["pace_sec_per_km"] = req.pace_sec_per_km
        payload["series"][i]["delta_g"] = round(delta, 2)
        prev = row.remaining_g

    return payload


@app.post("/api/coach-advice")
def api_coach_advice(req: SimRequest):
    validation_error = _validate_segmented_climb(req)
    if validation_error is not None:
        return validation_error

    config = _build_config(req)
    result = run_simulation(config)
    solver_result = find_pace_solver_result(config, result) if req.optimize else None
    return generate_coach_advice(config, result, solver_result)


@app.get("/")
def root():
    return RedirectResponse(url="/ui/index.html")


_workspace_root = Path(__file__).resolve().parents[2]
_ui_dir = _workspace_root / "ui"
app.mount("/ui", StaticFiles(directory=str(_ui_dir), html=True), name="ui")
