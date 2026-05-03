from __future__ import annotations

import json
import os
import socket
import urllib.error
import urllib.request
from typing import Any, TypedDict

from .coach_guard import enforce_inventory_constraints
from .coach_prompt import build_messages
from .coach_templates import build_fallback_advice


class CoachAdvice(TypedDict):
    source: str
    status: str
    headline: str
    plan_a: str
    plan_b: str
    plan_c: str
    key_warning: str
    fallback_reason: str | None


def _remove_code_fence(text: str) -> str:
    cleaned = text.strip()
    if cleaned.startswith('```'):
        lines = cleaned.splitlines()
        if len(lines) >= 3 and lines[-1].strip().startswith('```'):
            cleaned = '\n'.join(lines[1:-1]).strip()
    return cleaned


def _normalize_advice(advice: dict[str, Any]) -> CoachAdvice:
    status = str(advice.get('status', '风险'))
    headline = str(advice.get('headline', '')).strip()
    plan_a = str(advice.get('plan_a', '')).strip()
    plan_b = str(advice.get('plan_b', '')).strip()
    plan_c = str(advice.get('plan_c', '')).strip()
    key_warning = str(advice.get('key_warning', '')).strip()
    if not headline or not plan_a or not plan_b or not plan_c:
        raise ValueError('LLM advice missing required fields')
    return {
        'source': 'llm',
        'status': status,
        'headline': headline,
        'plan_a': plan_a,
        'plan_b': plan_b,
        'plan_c': plan_c,
        'key_warning': key_warning,
        'fallback_reason': None,
    }


def request_coach_advice(report: dict[str, Any], timeout_s: float = 3.5) -> CoachAdvice:
    api_key = os.getenv('DEEPSEEK_API_KEY', '').strip()
    if not api_key:
        return build_fallback_advice(report, 'missing_api_key')

    endpoint = os.getenv('DEEPSEEK_API_URL', 'https://api.deepseek.com/chat/completions').strip()
    model = os.getenv('DEEPSEEK_MODEL', 'deepseek-chat').strip()
    payload = {
        'model': model,
        'temperature': 0.35,
        'response_format': {'type': 'json_object'},
        'messages': build_messages(report),
    }

    body = json.dumps(payload, ensure_ascii=False).encode('utf-8')
    request = urllib.request.Request(
        endpoint,
        data=body,
        method='POST',
        headers={
            'Authorization': f'Bearer {api_key}',
            'Content-Type': 'application/json',
        },
    )

    try:
        with urllib.request.urlopen(request, timeout=timeout_s) as response:
            raw = response.read().decode('utf-8')
        data = json.loads(raw)
        content = data['choices'][0]['message']['content']
        advice_obj = json.loads(_remove_code_fence(content))
        normalized = _normalize_advice(advice_obj)
        corrected = enforce_inventory_constraints(report, normalized)
        return corrected  # type: ignore[return-value]
    except socket.timeout:
        return build_fallback_advice(report, 'timeout')
    except (urllib.error.URLError, urllib.error.HTTPError):
        return build_fallback_advice(report, 'network_error')
    except (KeyError, IndexError, json.JSONDecodeError, ValueError, TypeError):
        return build_fallback_advice(report, 'invalid_llm_response')
