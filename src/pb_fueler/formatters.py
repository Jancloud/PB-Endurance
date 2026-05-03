from __future__ import annotations


def format_pace(pace_seconds: float) -> str:
    total_seconds = int(round(pace_seconds))
    minutes = total_seconds // 60
    seconds = total_seconds % 60
    return f"{minutes:02d}:{seconds:02d}"


def format_duration(total_seconds: float) -> str:
    value = int(round(total_seconds))
    hours = value // 3600
    minutes = (value % 3600) // 60
    seconds = value % 60
    return f"{hours:02d}:{minutes:02d}:{seconds:02d}"
