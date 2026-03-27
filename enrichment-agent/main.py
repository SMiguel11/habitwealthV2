"""
HabitWealth – Multi-Agent Enrichment Container App
====================================================
Agents (run in pipeline order):
  1. DocumentIntelligenceAgent  – parses transactions from Document Intelligence output
  2. EmotionalPatternAgent      – detects emotional spending triggers
  3. FinancialStressAgent       – computes Financial Stress Index (FSI)
  4. GoalAlignmentAgent         – scores transactions against user goals
  5. CBTInterventionAgent       – generates cognitive-behavioral nudges
  6. DigitalTwinAgent           – builds / updates the user's Digital Twin profile

Locally: receives an HTTP POST from the Azure Function (mock or real Event Grid).
In production: triggered by Event Grid → Container App ingress.
"""
import os, json, math, re, logging
from datetime import datetime, date, timezone
from typing import Any, Optional
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

logger = logging.getLogger("habitwealth.agent")

# ──────────────────────────────────────────────────────────────────────────────
# Key Vault — load secrets once at startup via Managed Identity
# Falls back gracefully to environment variables for local dev.
# ──────────────────────────────────────────────────────────────────────────────
_kv_secrets: dict[str, str] = {}

def _load_keyvault_secrets() -> None:
    """Fetch secrets from Azure Key Vault using DefaultAzureCredential.
    Safe to call in local dev — simply logs a warning and continues if KV
    is unreachable or the AZURE_KEY_VAULT_URI env var is not set.
    """
    kv_uri = os.getenv("AZURE_KEY_VAULT_URI")
    if not kv_uri:
        logger.info("AZURE_KEY_VAULT_URI not set — skipping Key Vault (local dev mode)")
        return
    try:
        from azure.identity import DefaultAzureCredential
        from azure.keyvault.secrets import SecretClient
        credential = DefaultAzureCredential()
        client = SecretClient(vault_url=kv_uri, credential=credential)
        secret_names = ["storage-key", "cosmos-key", "openai-key", "di-key"]
        for name in secret_names:
            try:
                secret = client.get_secret(name)
                _kv_secrets[name] = secret.value
            except Exception as e:
                logger.warning(f"Could not load KV secret '{name}': {e}")
        logger.info(f"Loaded {len(_kv_secrets)} secret(s) from Key Vault")
    except ImportError:
        logger.warning("azure-keyvault-secrets not installed — skipping Key Vault")
    except Exception as e:
        logger.warning(f"Key Vault initialization failed: {e}")

def get_secret(name: str, env_fallback: str = "") -> str:
    """Return a secret from Key Vault cache, or fall back to an env var."""
    return _kv_secrets.get(name) or os.getenv(env_fallback, "")

app = FastAPI(title="HabitWealth Enrichment Agent", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup_event() -> None:
    logging.basicConfig(level=os.getenv("LOG_LEVEL", "INFO"))
    _load_keyvault_secrets()


# Schemas
# ──────────────────────────────────────────────────────────────────────────────
class Transaction(BaseModel):
    date: str
    merchant: str
    category: str
    amount: float
    currency: str = "EUR"

class UserGoal(BaseModel):
    description: str
    targetAmount: float
    deadlineMonths: int

class EnrichRequest(BaseModel):
    userId: str
    filename: str
    blobUrl: str | None = None
    transactions: list[Transaction]
    goals: list[UserGoal] = []
    surveyAnswers: list[Any] = []
    # Optional ISO date range to restrict which transactions are considered
    # Format: YYYY-MM-DD (e.g. 2025-12-01)
    startDate: Optional[str] = None
    endDate: Optional[str] = None

class ExplainScoreRequest(BaseModel):
    habitWealthScore: int
    netCashFlow: float = 0.0
    hasSavings: bool = False
    byCategory: dict = {}
    fsiLevel: str = "Medium"
    dominantPattern: str = "none"
    weekendSpendAlert: bool = False


# Agent 1 – Document Intelligence Parser
# ──────────────────────────────────────────────────────────────────────────────
def agent_document_intelligence(transactions: list[dict]) -> dict:
    """Categorises, deduplicates and summarises raw transactions."""
    from collections import defaultdict
    by_cat: dict[str, float] = {}
    total_in, total_out = 0.0, 0.0

    # --- Agrupación mensual ---
    monthly_summary = defaultdict(lambda: {"income": 0.0, "expenses": 0.0, "net": 0.0, "byCategory": defaultdict(float)})
    def get_month_key(t):
        # Espera fecha en formato YYYY-MM-DD
        d = t.get("date")
        if not d:
            return "unknown"
        try:
            dt = datetime.fromisoformat(d)
            return f"{dt.year}-{dt.month:02d}"
        except Exception:
            return str(d)[:7]  # fallback: YYYY-MM

    for t in transactions:
        amt = t["amount"]
        cat = t.get("category", "Other")
        month = get_month_key(t)
        if amt < 0:
            by_cat[cat] = by_cat.get(cat, 0) + abs(amt)
            total_out += abs(amt)
            monthly_summary[month]["expenses"] += abs(amt)
            monthly_summary[month]["byCategory"][cat] += abs(amt)
        else:
            total_in += amt
            monthly_summary[month]["income"] += amt
            monthly_summary[month]["byCategory"][cat] += amt
        # neto se calcula después

    # Calcular neto mensual
    for m in monthly_summary:
        monthly_summary[m]["net"] = round(monthly_summary[m]["income"] - monthly_summary[m]["expenses"], 2)
        # Redondear categorías
        monthly_summary[m]["byCategory"] = {k: round(v, 2) for k, v in monthly_summary[m]["byCategory"].items()}

    return {
        "agent": "DocumentIntelligence",
        "transactionCount": len(transactions),
        "totalIncome": round(total_in, 2),
        "totalExpenses": round(total_out, 2),
        "netCashFlow": round(total_in - total_out, 2),
        "byCategory": {k: round(v, 2) for k, v in by_cat.items()},
        "topMerchants": _top_merchants(transactions),
        "monthlySummary": {k: {"income": round(v["income"],2), "expenses": round(v["expenses"],2), "net": v["net"], "byCategory": v["byCategory"]} for k,v in monthly_summary.items()}
    }

def _top_merchants(txs: list[dict], n: int = 5) -> list[dict]:
    m: dict[str, float] = {}
    for t in txs:
        if t["amount"] < 0:
            m[t["merchant"]] = m.get(t["merchant"], 0) + abs(t["amount"])
    return sorted([{"merchant": k, "total": round(v, 2)} for k, v in m.items()],
                  key=lambda x: -x["total"])[:n]


# Agent 2 – Emotional Pattern Agent
# ──────────────────────────────────────────────────────────────────────────────
EMOTIONAL_KEYWORDS = {
    "impulse": ["amazon", "aliexpress", "zalando", "shein", "steam", "wish"],
    "comfort":  ["mcdonalds", "starbucks", "uber eats", "deliveroo", "glovo"],
    "stress":   ["pharmacy", "alcohol", "tobacco", "casino", "bet"],
    "social":   ["restaurant", "bar", "club", "cinema", "concert"],
}

WEEKEND_DAYS = {5, 6}

def _score_transaction_patterns(transaction: dict, scores: dict) -> None:
    """Update emotional pattern scores for a single transaction."""
    name = transaction["merchant"].lower()
    for pattern, keywords in EMOTIONAL_KEYWORDS.items():
        if any(kw in name for kw in keywords):
            scores[pattern] += abs(transaction["amount"])

def _accumulate_weekend_spend(transaction: dict) -> float:
    """Calculate weekend spend amount from a single transaction."""
    try:
        d = datetime.fromisoformat(transaction["date"])
        if d.weekday() in WEEKEND_DAYS:
            return abs(transaction["amount"])
    except Exception:
        pass
    return 0.0


def _parse_date_string(s: Optional[str]) -> date | None:
    """Parse a date string into a date object. Accepts ISO or common formats.
    Returns None if s is falsy or cannot be parsed.
    """
    if not s:
        return None
    s = s.strip()
    # Try ISO first
    try:
        return datetime.fromisoformat(s).date()
    except Exception:
        pass
    # Try common formats dd/MM/YYYY or dd-MM-YYYY or YYYY/MM/DD
    for fmt in ("%d/%m/%Y", "%d-%m-%Y", "%Y-%m-%d", "%Y/%m/%d"):
        try:
            return datetime.strptime(s, fmt).date()
        except Exception:
            continue
    return None


def _filter_transactions_by_date(txs: list[dict], start: Optional[str], end: Optional[str]) -> list[dict]:
    """Return transactions whose `date` lies between `start` and `end` (inclusive).
    If a transaction's date cannot be parsed, it will be kept but a warning logged.
    """
    if not start and not end:
        return txs
    start_d = _parse_date_string(start) or date.min
    end_d = _parse_date_string(end) or date.max
    filtered: list[dict] = []
    for t in txs:
        dstr = t.get("date")
        if not dstr:
            logger.warning("Transaction without date kept: %s", t)
            filtered.append(t)
            continue
        tx_date = None
        try:
            # prefer full ISO parse
            tx_date = datetime.fromisoformat(str(dstr)).date()
        except Exception:
            tx_date = _parse_date_string(str(dstr))
        if tx_date is None:
            logger.warning("Could not parse transaction date '%s' — keeping transaction", dstr)
            filtered.append(t)
            continue
        if start_d <= tx_date <= end_d:
            filtered.append(t)
    logger.info("Filtered transactions: kept %d of %d between %s and %s", len(filtered), len(txs), start, end)
    return filtered

def _calculate_survey_stress(survey_answers: list) -> float:
    """Calculate stress score from survey answers."""
    if not survey_answers:
        return 0.0
    numeric = [a for a in survey_answers[:5] if isinstance(a, (int, float))]
    if not numeric:
        return 0.0
    return round(sum(numeric) / len(numeric), 2)

def _find_dominant_pattern(scores: dict) -> str:
    """Find the dominant emotional spending pattern."""
    if not any(scores.values()):
        return "none"
    return max(scores, key=lambda k: scores[k])

def agent_emotional_pattern(transactions: list[dict], survey_answers: list) -> dict:
    scores = dict.fromkeys(EMOTIONAL_KEYWORDS, 0.0)
    weekend_spend = 0.0

    for t in transactions:
        if t["amount"] >= 0:
            continue
        _score_transaction_patterns(t, scores)
        weekend_spend += _accumulate_weekend_spend(t)

    survey_stress = _calculate_survey_stress(survey_answers)
    dominant = _find_dominant_pattern(scores)
    
    return {
        "agent": "EmotionalPattern",
        "emotionalSpendScores": {k: round(v, 2) for k, v in scores.items()},
        "dominantPattern": dominant,
        "weekendSpend": round(weekend_spend, 2),
        "surveyStressScore": survey_stress,
    }

def _get_monthly_savings(doc: dict) -> float:
    by_category = doc.get("byCategory", {}) or {}
    for key, value in by_category.items():
        normalized = str(key).strip().lower()
        if normalized in {"savings", "saving", "ahorros", "ahorro"} or "saving" in normalized or "ahorr" in normalized or "invers" in normalized:
            return round(abs(float(value or 0)), 2)
    # If no explicit savings category, calculate as: Income - Expenses
    total_in = float(doc.get("totalIncome") or 0)
    total_out = float(doc.get("totalExpenses") or 0)
    available_savings = max(0, total_in - total_out)
    return round(available_savings, 2)


# Agent 3 – Financial Stress Index
# ──────────────────────────────────────────────────────────────────────────────
def agent_financial_stress(doc: dict, emotional: dict) -> dict:
    """
    FSI 0-100 (lower = healthier).
    Factors: negative cash flow, impulse ratio, survey stress.
    """
    total_out = doc["totalExpenses"] or 1
    total_in  = doc["totalIncome"] or total_out

    cash_pressure   = max(0, min(40, (1 - total_in / total_out) * 40))
    impulse_ratio   = emotional["emotionalSpendScores"].get("impulse", 0) / total_out
    impulse_score   = min(30, impulse_ratio * 100)
    survey_contrib  = emotional["surveyStressScore"] / 4 * 30  # max 30 pts

    fsi = round(cash_pressure + impulse_score + survey_contrib, 1)
    if fsi < 30:
        band = "Low"
    elif fsi < 60:
        band = "Medium"
    else:
        band = "High"
    return {
        "agent": "FinancialStress",
        "fsi": fsi,
        "fsiComponents": {
            "cashPressure": round(cash_pressure, 1),
            "impulsePressure": round(impulse_score, 1),
            "surveyPressure": round(survey_contrib, 1),
        },
        "fsiLevel": band,
    }


# Agent 4 – Goal Alignment Agent
# ──────────────────────────────────────────────────────────────────────────────
def agent_goal_alignment(doc: dict, goals: list[dict]) -> dict:
    savings_monthly = _get_monthly_savings(doc)
    alignments = []
    for g in goals:
        target  = g.get("targetAmount", 0)
        months  = g.get("deadlineMonths", 12)
        needed  = target / max(months, 1)
        saved_amount = float(g.get("savedAmount", g.get("currentSaved", savings_monthly)) or 0)
        saved_amount = min(max(saved_amount, 0.0), float(target or 0))
        remaining = max(float(target or 0) - saved_amount, 0.0)
        on_track = savings_monthly >= needed
        months_to_goal = math.ceil(remaining / savings_monthly) if savings_monthly > 0 else None
        progress_pct = round((saved_amount / target) * 100, 1) if target and target > 0 else 0.0
        alignments.append({
            "goal": g.get("description", "Goal"),
            "monthlyNeeded": round(needed, 2),
            "currentSavings": round(savings_monthly, 2),
            "savedAmount": round(saved_amount, 2),
            "progressPct": progress_pct,
            "onTrack": on_track,
            "projectedMonths": months_to_goal,
        })
    overall_alignment = sum(1 for a in alignments if a["onTrack"]) / max(len(alignments), 1)
    return {
        "agent": "GoalAlignment",
        "goals": alignments,
        "overallAlignmentScore": round(overall_alignment * 100, 1),
    }


# Agent 4b – Goal Optimization Agent (NEW)
# Detects patterns + recommends actions + simulates impact
# ──────────────────────────────────────────────────────────────────────────────

def _check_weekend_spending(doc: dict, emotional: dict) -> dict | None:
    """Check if weekend spending is high; return action or None."""
    total_expenses = float(doc.get("totalExpenses") or 0)
    weekend_spend = float(emotional.get("weekendSpend") or 0)
    if total_expenses > 0 and weekend_spend > (total_expenses * 0.15):
        return {
            "title": "Reduce weekend discretionary spending",
            "description": f"Weekend spend is €{weekend_spend:.2f}; adding a weekend cap can accelerate your goal.",
            "category": "Discretionary",
            "potentialSavings": round(weekend_spend * 0.30, 2),
            "effort": "Medium",
            "implementation": "Set a weekly weekend budget and pre-plan leisure expenses.",
        }
    return None

def _check_impulse_spending(doc: dict, emotional: dict) -> dict | None:
    """Check if impulse spending is high; return action or None."""
    total_expenses = float(doc.get("totalExpenses") or 0)
    impulse_score = float(emotional.get("emotionalSpendScores", {}).get("impulse") or 0)
    impulse_ratio = (impulse_score / total_expenses) if total_expenses > 0 else 0
    if impulse_ratio > 0.08:
        return {
            "title": "Control impulse purchases",
            "description": f"Impulse spend is {round(impulse_ratio * 100, 1)}% of expenses.",
            "category": "Behavior",
            "potentialSavings": round(impulse_score * 0.35, 2),
            "effort": "Medium",
            "implementation": "Apply a 24h rule before non-essential purchases.",
        }
    return None

def _check_utilities_optimization(doc: dict) -> dict | None:
    """Check if utilities are above target; return action or None."""
    by_cat = doc.get("byCategory", {}) or {}
    utilities_spend = float(by_cat.get("Utilities", by_cat.get("Hogar / Suministro", 0)) or 0)
    if utilities_spend > 950:
        return {
            "title": "Optimize utilities",
            "description": "Utility costs are above target; renegotiation may reduce fixed costs.",
            "category": "Fixed Costs",
            "potentialSavings": round(utilities_spend * 0.08, 2),
            "effort": "Low",
            "implementation": "Compare providers and renegotiate electricity/internet contracts.",
        }
    return None

def _check_emergency_buffer(doc: dict, fsi: dict) -> dict | None:
    """Check if emergency buffer is needed; return action or None."""
    fsi_level = str(fsi.get("fsiLevel", "")).lower()
    if fsi_level in {"high", "medium"}:
        total_expenses = float(doc.get("totalExpenses") or 0)
        return {
            "title": "Build emergency buffer",
            "description": "A safety buffer reduces stress-driven spending and keeps you on plan.",
            "category": "Savings",
            "potentialSavings": round(total_expenses * 0.05, 2) if total_expenses > 0 else 35.0,
            "effort": "Medium",
            "implementation": "Automate a monthly transfer to a dedicated emergency account.",
        }
    return None

def _collect_optimization_actions(doc: dict, emotional: dict, fsi: dict) -> list[dict]:
    """Collect all applicable optimization actions."""
    actions = []
    
    # Check each pattern and collect actions
    weekend_action = _check_weekend_spending(doc, emotional)
    if weekend_action:
        actions.append(weekend_action)
    
    impulse_action = _check_impulse_spending(doc, emotional)
    if impulse_action:
        actions.append(impulse_action)
    
    utilities_action = _check_utilities_optimization(doc)
    if utilities_action:
        actions.append(utilities_action)
    
    buffer_action = _check_emergency_buffer(doc, fsi)
    if buffer_action:
        actions.append(buffer_action)
    
    return actions

def _get_default_action() -> list[dict]:
    """Return default action when no specific issues detected."""
    return [{
        "title": "Review spending habits",
        "description": "A monthly budget review can uncover fast savings opportunities.",
        "category": "Planning",
        "potentialSavings": 50.0,
        "effort": "Low",
        "implementation": "Block 20 minutes monthly to review subscriptions and variable spending.",
    }]

def _calculate_goal_remaining(goal: dict, current_savings: float) -> float:
    """Calculate remaining amount for a goal."""
    current_projected = goal.get("projectedMonths")
    current_goal_savings = float(goal.get("currentSavings") or current_savings or 0)
    monthly_needed = float(goal.get("monthlyNeeded") or 0)
    
    if current_projected and current_goal_savings > 0:
        return current_goal_savings * float(current_projected)
    if current_projected and monthly_needed > 0:
        return monthly_needed * float(current_projected)
    return monthly_needed * 12

def _optimize_goal_projection(goal: dict, remaining: float, optimized_savings: float) -> dict:
    """Calculate optimized projection for a goal."""
    current_projected = goal.get("projectedMonths")
    optimized_projected = math.ceil(remaining / optimized_savings) if optimized_savings > 0 else None
    
    if current_projected and optimized_projected:
        optimized_projected = min(int(current_projected), int(optimized_projected))
    
    time_saved = (current_projected - optimized_projected) if (current_projected and optimized_projected) else 0
    
    return {
        "goal": goal.get("goal", "Goal"),
        "currentProjected": current_projected,
        "optimizedProjected": optimized_projected,
        "timeSaved": max(0, time_saved),
    }

def _static_goal_optimization(doc: dict, emotional: dict, fsi: dict, goals: dict) -> dict:
    """Rules-based fallback when GPT-4o is unavailable or returns invalid JSON."""
    actions = _collect_optimization_actions(doc, emotional, fsi)
    if not actions:
        actions = _get_default_action()

    total_potential_savings = round(sum(float(a.get("potentialSavings") or 0) for a in actions), 2)
    current_savings = round(_get_monthly_savings(doc), 2)
    optimized_savings = round(current_savings + total_potential_savings, 2)

    optimized_goals = []
    for g in (goals.get("goals", []) or []):
        remaining = _calculate_goal_remaining(g, current_savings)
        optimized_goals.append(_optimize_goal_projection(g, remaining, optimized_savings))

    return {
        "agent": "GoalOptimization",
        "source": "static",
        "actions": actions,
        "totalPotentialSavings": total_potential_savings,
        "currentMonthlySavings": current_savings,
        "optimizedMonthlySavings": optimized_savings,
        "optimizedGoals": optimized_goals,
    }


def _ai_goal_optimization(doc: dict, emotional: dict, fsi: dict, goals: dict) -> dict | None:
    """Use Azure OpenAI GPT-4o-mini to generate personalized optimization actions and timeline impact."""
    api_key = get_secret("openai-key", "AZURE_OPENAI_KEY")
    endpoint = os.getenv("AZURE_OPENAI_ENDPOINT", "")
    if not api_key or not endpoint:
        return None

    deployment = os.getenv("AZURE_OPENAI_GOAL_DEPLOYMENT", os.getenv("AZURE_OPENAI_DEPLOYMENT", "gpt-4o-mini"))

    try:
        from openai import AzureOpenAI

        current_savings = round(_get_monthly_savings(doc), 2)
        payload = _build_optimization_payload(doc, emotional, fsi, goals, current_savings)
        prompt = _build_optimization_prompt(payload)

        client = AzureOpenAI(api_key=api_key, azure_endpoint=endpoint, api_version="2024-02-01")
        raw_response = _call_openai_api(client, deployment, prompt)
        if not raw_response:
            return None

        parsed = _parse_ai_response(raw_response)
        if not parsed:
            return None

        normalized_actions = _extract_and_normalize_actions(parsed)
        if not normalized_actions:
            return None

        total_potential_savings = _calculate_action_savings(parsed, normalized_actions)
        current_monthly_savings = round(float(parsed.get("currentMonthlySavings") or current_savings), 2)
        optimized_monthly_savings = round(float(parsed.get("optimizedMonthlySavings") or (current_monthly_savings + total_potential_savings)), 2)

        optimized_goals = _extract_optimized_goals(parsed, goals, current_monthly_savings, optimized_monthly_savings)

        return {
            "agent": "GoalOptimization",
            "source": deployment,
            "actions": normalized_actions,
            "totalPotentialSavings": total_potential_savings,
            "currentMonthlySavings": current_monthly_savings,
            "optimizedMonthlySavings": optimized_monthly_savings,
            "optimizedGoals": optimized_goals,
        }

    except Exception as exc:
        logger.warning("Goal optimization with Azure OpenAI failed (%s) — static fallback", exc)
        return None


def _build_optimization_payload(doc: dict, emotional: dict, fsi: dict, goals: dict, current_savings: float) -> dict:
    """Build the user data payload for optimization prompt."""
    return {
        "currency": "EUR",
        "financial": {
            "totalIncome": doc.get("totalIncome", 0),
            "totalExpenses": doc.get("totalExpenses", 0),
            "netCashFlow": doc.get("netCashFlow", 0),
            "byCategory": doc.get("byCategory", {}),
        },
        "behavior": {
            "dominantPattern": emotional.get("dominantPattern", "none"),
            "emotionalSpendScores": emotional.get("emotionalSpendScores", {}),
            "weekendSpend": emotional.get("weekendSpend", 0),
            "surveyStressScore": emotional.get("surveyStressScore", 0),
            "fsiLevel": fsi.get("fsiLevel", "Medium"),
            "fsi": fsi.get("fsi", 0),
        },
        "goals": goals.get("goals", []),
        "currentMonthlySavings": current_savings,
    }


def _build_optimization_prompt(payload: dict) -> str:
    """Build the optimization prompt for Azure OpenAI."""
    return (
        "You are a financial optimization advisor. Analyze the user data and produce an actionable plan to achieve goals faster. "
        "Prioritize realistic, behavior-aware actions from both transactions and behavioral survey signals. "
        "Return ONLY valid JSON with this schema: "
        "{"
        "\"actions\": [{\"title\": str, \"description\": str, \"category\": str, \"potentialSavings\": number, \"effort\": \"Low\"|\"Medium\"|\"High\", \"implementation\": str}],"
        "\"totalPotentialSavings\": number,"
        "\"currentMonthlySavings\": number,"
        "\"optimizedMonthlySavings\": number,"
        "\"optimizedGoals\": [{\"goal\": str, \"currentProjected\": number|null, \"optimizedProjected\": number|null, \"timeSaved\": number}]"
        "}. "
        "Rules: 1) max 4 actions, sorted by impact. 2) potentialSavings must be monthly EUR values. "
        "3) If data quality is limited, still return at least 1 safe action. 4) Do not add markdown or explanation outside JSON.\n\n"
        f"UserData:\n{json.dumps(payload, ensure_ascii=True)}"
    )


def _call_openai_api(client, deployment: str, prompt: str) -> str | None:
    """Call Azure OpenAI API and return raw response or None."""
    resp = client.chat.completions.create(
        model=deployment,
        messages=[{"role": "user", "content": prompt}],
        temperature=0.35,
        max_tokens=900,
        response_format={"type": "json_object"},
    )
    return (resp.choices[0].message.content or "").strip() if resp.choices else None


def _clean_json_response(raw: str) -> str:
    """Clean markdown-wrapped JSON response."""
    if raw.startswith("```json"):
        raw = raw[7:].lstrip()
    if raw.endswith("```"):
        raw = raw[:-3].rstrip()
    return raw


def _parse_ai_response(raw: str) -> dict | None:
    """Parse and validate JSON from AI response."""
    try:
        raw = _clean_json_response(raw)
        parsed = json.loads(raw)
        return parsed if isinstance(parsed, dict) else None
    except Exception:
        return None


def _normalize_action(action: dict) -> dict | None:
    """Normalize a single action or return None if invalid."""
    if not isinstance(action, dict):
        return None
    return {
        "title": str(action.get("title") or "Optimization action"),
        "description": str(action.get("description") or ""),
        "category": str(action.get("category") or "Planning"),
        "potentialSavings": round(max(0.0, float(action.get("potentialSavings") or 0.0)), 2),
        "effort": str(action.get("effort") or "Medium"),
        "implementation": str(action.get("implementation") or "Apply this action for the next 30 days."),
    }


def _extract_and_normalize_actions(parsed: dict) -> list[dict]:
    """Extract, normalize, and validate actions from parsed response."""
    actions = parsed.get("actions", []) if isinstance(parsed, dict) else []
    if not isinstance(actions, list) or len(actions) == 0:
        return []
    
    normalized = []
    for action in actions[:4]:
        normalized_action = _normalize_action(action)
        if normalized_action:
            normalized.append(normalized_action)
    return normalized


def _calculate_action_savings(parsed: dict, normalized_actions: list[dict]) -> float:
    """Calculate total potential savings from actions."""
    return round(
        float(parsed.get("totalPotentialSavings") or 0) or
        sum(a["potentialSavings"] for a in normalized_actions),
        2
    )


def _calculate_goal_remaining(goal: dict, current_monthly_savings: float) -> float:
    """Calculate remaining amount needed for a goal."""
    current_projected = goal.get("projectedMonths")
    current_goal_savings = float(goal.get("currentSavings") or current_monthly_savings or 0)
    monthly_needed = float(goal.get("monthlyNeeded") or 0)
    
    if current_projected and current_goal_savings > 0:
        return current_goal_savings * float(current_projected)
    if current_projected and monthly_needed > 0:
        return monthly_needed * float(current_projected)
    return monthly_needed * 12


def _optimize_goal_projection(goal: dict, remaining: float, optimized_monthly_savings: float) -> dict:
    """Compute optimized projection for a goal."""
    current_projected = goal.get("projectedMonths")
    opt_projected = math.ceil(remaining / optimized_monthly_savings) if optimized_monthly_savings > 0 else None
    if current_projected and opt_projected:
        opt_projected = min(int(current_projected), int(opt_projected))
    time_saved = (current_projected - opt_projected) if (current_projected and opt_projected) else 0
    
    return {
        "goal": goal.get("goal", "Goal"),
        "currentProjected": current_projected,
        "optimizedProjected": opt_projected,
        "timeSaved": max(0, time_saved),
    }


def _extract_optimized_goals(parsed: dict, goals: dict, current_monthly_savings: float, optimized_monthly_savings: float) -> list[dict]:
    """Extract optimized goals from response or compute if missing."""
    optimized_goals = parsed.get("optimizedGoals", [])
    if isinstance(optimized_goals, list) and optimized_goals:
        return optimized_goals
    
    if not goals.get("goals"):
        return []
    
    return [
        _optimize_goal_projection(g, _calculate_goal_remaining(g, current_monthly_savings), optimized_monthly_savings)
        for g in goals.get("goals", [])
    ]


def agent_goal_optimization(doc: dict, emotional: dict, fsi: dict, goals: dict) -> dict:
    """AI-first goal optimization using Azure OpenAI GPT-4o-mini with static fallback."""
    ai_result = _ai_goal_optimization(doc, emotional, fsi, goals)
    if ai_result and ai_result.get("actions"):
        return ai_result
    return _static_goal_optimization(doc, emotional, fsi, goals)


# Agent 4c – Utility Anomaly Detector (NEW)
# Detects price increases in fixed services (utilities, rent, subscriptions)
# and identifies duplicate payments
# ──────────────────────────────────────────────────────────────────────────────

# Target utility/fixed service categories
UTILITY_CATEGORIES = {
    "alquiler", "alquiler piso", "renta", "rent",
    "endesa", "luz", "electricidad", "electricity",
    "agua", "water", "gas", "gás",
    "internet", "phone", "móvil", "telefonika", "vodafone",
    "óptica", "opticalia", "vista", "eye care",
    "clínica dental", "dentista", "dental", "dentist",
    "seguro", "insurance", "sanitas", "axa"
}

def _normalize_category(category: str) -> str:
    """Normalize category name for comparison."""
    return str(category or "").strip().lower()

def _is_utility_category(category: str) -> bool:
    """Check if category is a utility/fixed service."""
    normalized = _normalize_category(category)
    return any(util in normalized for util in UTILITY_CATEGORIES)

def _analyze_utility_trends(transactions: list[dict], monthly_summary: dict, threshold_pct: float = 1.0) -> dict:
    """
    Analyze price trends for utility categories across months.
    Returns: {
        "alertType": "price_increase" | "stable",
        "category": category name,
        "months": [{"month": "YYYY-MM", "amount": float}, ...],
        "percentChange": float,
        "alert": bool,
        "message": str
    }
    """
    alerts = []
    
    # Aggregate utilities by category and month
    utility_by_cat_month = {}
    for t in transactions:
        if t.get("amount", 0) >= 0:  # Skip income
            continue
        cat = _normalize_category(t.get("category", "Other"))
        if not _is_utility_category(cat):
            continue
        
        # Extract month from transaction date
        date_str = t.get("date", "")
        if not date_str:
            continue
        try:
            month = date_str[:7]  # YYYY-MM format
        except Exception:
            continue
        
        if cat not in utility_by_cat_month:
            utility_by_cat_month[cat] = {}
        if month not in utility_by_cat_month[cat]:
            utility_by_cat_month[cat][month] = 0.0
        
        utility_by_cat_month[cat][month] += abs(t.get("amount", 0))
    
    # Analyze trends per category
    for cat, months_data in utility_by_cat_month.items():
        sorted_months = sorted(months_data.items())
        if len(sorted_months) < 2:
            continue  # Need at least 2 months to compare
        
        # Get first and last month amounts
        first_amount = sorted_months[0][1]
        last_amount = sorted_months[-1][1]
        
        if first_amount <= 0:
            continue
        
        pct_change = ((last_amount - first_amount) / first_amount) * 100
        
        if pct_change >= threshold_pct:
            alerts.append({
                "alertType": "price_increase",
                "category": cat.title(),
                "months": [{"month": m, "amount": round(a, 2)} for m, a in sorted_months],
                "percentChange": round(pct_change, 2),
                "alert": True,
                "message": f"{cat.title()} increased {pct_change:.1f}% — review the contract or supplier.",
                "severity": "high" if pct_change >= 5 else "medium"
            })
    
    return alerts

def _detect_duplicate_payments(transactions: list[dict]) -> list[dict]:
    """
    Detect duplicate or recurring identical payments.
    Returns list of potential duplicates:
    {
        "merchant": str,
        "amount": float,
        "month": str,
        "count": int,
        "message": str,
        "alert": bool,
        "severity": str
    }
    """
    duplicates = []
    
    # Group by (merchant, amount, month)
    payment_groups = {}
    for t in transactions:
        if t.get("amount", 0) >= 0:  # Skip income
            continue
        
        merchant = str(t.get("merchant", "")).lower().strip()
        amount = abs(round(float(t.get("amount", 0)), 2))
        date_str = t.get("date", "")
        
        if not date_str or amount <= 0:
            continue
        
        month = date_str[:7]  # YYYY-MM
        key = (merchant, amount, month)
        
        if key not in payment_groups:
            payment_groups[key] = 0
        payment_groups[key] += 1
    
    # Flag duplicates (count > 1)
    for (merchant, amount, month), count in payment_groups.items():
        if count > 1:
            duplicates.append({
                "merchant": merchant.title(),
                "amount": amount,
                "month": month,
                "count": count,
                "message": f"Found {count} identical payments of €{amount} from {merchant.title()} in {month}",
                "alert": True,
                "severity": "high" if count >= 3 else "medium"
            })
    
    return duplicates

def agent_utility_anomaly_detector(transactions: list[dict], monthly_summary: dict) -> dict:
    """
    Detects anomalies in utility/fixed service spending:
    - Price increases >= +1%
    - Duplicate/redundant payments
    
    Returns actionable alerts for the user.
    """
    price_alerts = _analyze_utility_trends(transactions, monthly_summary, threshold_pct=1.0)
    duplicate_alerts = _detect_duplicate_payments(transactions)
    
    # Consolidate all alerts
    all_alerts = price_alerts + duplicate_alerts
    
    # Prioritize by severity
    critical_alerts = [a for a in all_alerts if a.get("severity") == "high"]
    warning_alerts = [a for a in all_alerts if a.get("severity") == "medium"]
    
    # Build summary for frontend
    summary_text = ""
    if critical_alerts:
        summary_text = critical_alerts[0]["message"]
    elif warning_alerts:
        summary_text = warning_alerts[0]["message"]
    
    return {
        "agent": "UtilityAnomalyDetector",
        "hasAlerts": bool(all_alerts),
        "criticalAlerts": critical_alerts,
        "warningAlerts": warning_alerts,
        "allAlerts": all_alerts,
        "summaryMessage": summary_text,
        "totalAlertsFound": len(all_alerts),
    }

# Agent 5 – CBT Intervention Agent  (Azure OpenAI GPT-4o-mini + static fallback)
# ──────────────────────────────────────────────────────────────────────────────

# Static fallback nudges — used when Azure OpenAI is not configured or fails
CBT_NUDGES: dict[str, list[str]] = {
    "impulse": [
        "Before your next online purchase, wait 48 hours. Is it still necessary?",
        "Try the 10-10-10 rule: How will you feel about this purchase in 10 minutes, 10 hours, 10 days?",
        "Unsubscribe from promotional emails — they're designed to trigger you.",
    ],
    "comfort": [
        "Notice when you eat out for emotional reasons vs. hunger. Log the emotion instead.",
        "Replace one delivery order per week with cooking. Save €20+ and gain satisfaction.",
    ],
    "stress": [
        "When stress urges spending, try a 5-minute breathing exercise first.",
        "Track the emotion before swiping your card. Awareness is the first CBT step.",
    ],
    "social": [
        "Suggest free social activities: parks, potlucks, hikes.",
        "Set a weekend social budget in advance and commit to it publicly.",
    ],
    "none": ["Great spending patterns! Keep building your emergency fund."],
}


def _ai_nudges(
    dominant: str,
    fsi_level: str,
    emotional_scores: dict,
    doc_summary: dict,
    utility_alerts: dict | None = None,
) -> tuple[list[str], str]:
    """Generate 3 personalized CBT nudges via Azure OpenAI GPT-4o-mini.

    Returns (nudges, source) where source is deployment name or 'static'.
    Falls back gracefully to the static dict if OpenAI is not configured
    or if the API call fails (network error, quota, etc.).
    """
    api_key  = get_secret("openai-key", "AZURE_OPENAI_KEY")
    endpoint = os.getenv("AZURE_OPENAI_ENDPOINT", "")
    deployment = os.getenv("AZURE_OPENAI_DEPLOYMENT", "gpt-4o-mini")

    if not api_key or not endpoint:
        logger.info("Azure OpenAI not configured — using static CBT nudges")
        return CBT_NUDGES.get(dominant, CBT_NUDGES["none"]), "static"

    try:
        from openai import AzureOpenAI  # imported lazily — not a hard dep at startup

        client = AzureOpenAI(
            api_key=api_key,
            azure_endpoint=endpoint,
            api_version="2024-02-01",
        )

        top_areas = ", ".join(
            f"{k} (€{v:.0f})"
            for k, v in sorted(emotional_scores.items(), key=lambda x: -x[1])
            if v > 0
        ) or "general spending"
        
        # Build utility alerts section
        utility_alert_text = ""
        if utility_alerts and utility_alerts.get("allAlerts"):
            alert_msgs = [a.get("message", "") for a in utility_alerts.get("allAlerts", [])[:2]]
            utility_alert_text = "\n- Service/utility alerts: " + "; ".join(alert_msgs)

        prompt = (
            f"You are a certified financial therapist specializing in Cognitive Behavioral "
            f"Therapy (CBT) for money-related behaviors.\n\n"
            f"User profile:\n"
            f"- Dominant emotional spending pattern: \"{dominant}\"\n"
            f"- Financial Stress Level: {fsi_level}\n"
            f"- Top emotional spending areas: {top_areas}\n"
            f"- Net cash flow this month: €{doc_summary.get('netCashFlow', 0):.2f}"
            f"{utility_alert_text}\n\n"
            f"Generate exactly 3 highly personalized, actionable CBT micro-interventions.\n"
            f"Rules:\n"
            f"- Each nudge: 1-2 sentences maximum.\n"
            f"- Compassionate, non-judgmental tone.\n"
            f"- Specific to the \"{dominant}\" pattern, not generic financial advice.\n"
            f"- Include at least one concrete technique per nudge "
            f"(pause timer, emotion journaling, breathing exercise, implementation intention).\n"
            f"- Return ONLY a valid JSON object with two keys: \"en\" (3 nudges in English) "
            f"and \"es\" (the same 3 nudges translated to natural Spanish). No markdown, no explanation.\n"
            f"Example: {{\"en\": [\"nudge 1\", \"nudge 2\", \"nudge 3\"], "
            f"\"es\": [\"consejo 1\", \"consejo 2\", \"consejo 3\"]}}"
        )

        response = client.chat.completions.create(
            model=deployment,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.7,
            max_tokens=600,
        )

        raw = response.choices[0].message.content.strip() if response.choices else ""
        parsed = json.loads(raw) if raw else {}
        nudges_en = parsed.get("en", []) if isinstance(parsed, dict) else parsed
        nudges_es = parsed.get("es", []) if isinstance(parsed, dict) else []
        if isinstance(nudges_en, list) and len(nudges_en) >= 1:
            logger.info(
                "GPT-4o generated %d CBT nudges (EN+ES) for pattern='%s' stress=%s",
                len(nudges_en), dominant, fsi_level,
            )
            return {"en": [str(n) for n in nudges_en[:3]], "es": [str(n) for n in nudges_es[:3]]}, "gpt-4o"

    except Exception as exc:
        logger.warning("Azure OpenAI CBT nudge generation failed (%s) — using static fallback", exc)

    return CBT_NUDGES.get(dominant, CBT_NUDGES["none"]), "static"


def agent_cbt_intervention(emotional: dict, fsi: dict, doc: dict | None = None) -> dict:
    dominant = emotional["dominantPattern"]
    nudges_result, source = _ai_nudges(
        dominant=dominant,
        fsi_level=fsi["fsiLevel"],
        emotional_scores=emotional["emotionalSpendScores"],
        doc_summary=doc or {},
    )
    # nudges_result is {"en": [...], "es": [...]} for GPT, or a plain list for static fallback
    if isinstance(nudges_result, dict):
        nudges_en = nudges_result.get("en", [])
        nudges_es = nudges_result.get("es", [])
    else:
        nudges_en = nudges_result
        nudges_es = []
    level = fsi["fsiLevel"]
    if level == "High":
        urgency = "immediate"
    elif level == "Medium":
        urgency = "suggested"
    else:
        urgency = "preventive"
    return {
        "agent": "CBTIntervention",
        "interventionUrgency": urgency,
        "nudges": nudges_en,
        "nudges_es": nudges_es,
        "nudgeSource": source,
        "primaryPattern": dominant,
        "weekendSpendAlert": emotional["weekendSpend"] > 200,
    }


# Agent 6 – Digital Twin Agent
# ──────────────────────────────────────────────────────────────────────────────
def agent_digital_twin(user_id: str, doc: dict, emotional: dict,
                       fsi: dict, goal: dict, cbt: dict) -> dict:
    """
    Builds an in-memory snapshot of the user's financial Digital Twin.
    In production this would be upserted to Cosmos DB.
    """
    habit_score = max(0, min(100, round(
        100
        - fsi["fsi"] * 0.5                                # penalise stress
        + goal["overallAlignmentScore"] * 0.3             # reward goal alignment
        + (doc["netCashFlow"] > 0) * 20                   # bonus for positive cash flow
    )))

    return {
        "agent": "DigitalTwin",
        "userId": user_id,
        "updatedAt": datetime.now(timezone.utc).isoformat(),
        "habitWealthScore": habit_score,
        "financialPersona": _classify_persona(emotional["dominantPattern"], fsi["fsiLevel"]),
        "emotionVector": emotional["emotionalSpendScores"],
        "fsi": fsi["fsi"],
        "goalAlignmentScore": goal["overallAlignmentScore"],
        "activeNudges": cbt["nudges"][:2],
        "monthlySnapshot": {
            "income": doc["totalIncome"],
            "expenses": doc["totalExpenses"],
            "savings": _get_monthly_savings(doc),
            "netFlow": doc["netCashFlow"],
        },
    }

def _classify_persona(dominant: str, fsi_level: str) -> str:
    mapping = {
        ("impulse", "High"):   "Impulsive Spender",
        ("impulse", "Medium"): "Developing Spender",
        ("comfort", "High"):   "Emotional Eater",
        ("comfort", "Medium"): "Stress Reliever",
        ("stress",  "High"):   "Crisis Spender",
        ("social",  "Low"):    "Social Planner",
        ("none",    "Low"):    "Mindful Saver",
    }
    return mapping.get((dominant, fsi_level), "Conscious Spender")

# Score Explanation helpers
# ──────────────────────────────────────────────────────────────────────────────
def _static_score_explanation(habit_score: int, doc: dict, emotional: dict, fsi_level: str) -> dict:
    """Rule-based score explanation used as fallback when GPT is unavailable."""
    net_flow     = doc.get("netCashFlow", 0)
    has_savings  = _get_monthly_savings(doc) > 0
    weekend_warn = emotional.get("weekendSpend", 0) > 200
    dominant     = emotional.get("dominantPattern", "none")

    pos_en, pos_es, warn_en, warn_es = [], [], [], []

    if net_flow > 0:
        pos_en.append("Your income exceeded your spending this period")
        pos_es.append("Tus ingresos superaron tus gastos este período")
    if has_savings:
        pos_en.append("You contributed to savings or an investment fund")
        pos_es.append("Realizaste una aportación a ahorros o inversión")
    if habit_score >= 70:
        pos_en.append("Your overall financial habits are above average")
        pos_es.append("Tus hábitos financieros están por encima de la media")
    if not weekend_warn and dominant in ("none", "social"):
        pos_en.append("No significant impulse spending patterns were detected")
        pos_es.append("No se detectaron patrones de gasto impulsivo significativos")
    if not pos_en:
        pos_en.append("You are actively tracking your finances — great first step")
        pos_es.append("Estás haciendo seguimiento de tus finanzas — excelente primer paso")

    if weekend_warn:
        warn_en.append("Stress-related purchases were detected near the end of the month")
        warn_es.append("Se detectaron compras relacionadas con el estrés a final de mes")
    if fsi_level == "High":
        warn_en.append("Your financial stress index is elevated — consider reviewing fixed costs")
        warn_es.append("Tu índice de estrés financiero es elevado — revisa tus gastos fijos")

    return {
        "en": {"positives": pos_en[:3], "warnings": warn_en[:1] if warn_en else []},
        "es": {"positives": pos_es[:3], "warnings": warn_es[:1] if warn_es else []},
        "source": "static",
    }


def _ai_score_explanation(habit_score: int, doc: dict, emotional: dict, fsi: dict) -> dict:
    """Call GPT-4o-mini to generate a bilingual score explanation."""
    api_key    = get_secret("openai-key", "AZURE_OPENAI_KEY")
    endpoint   = os.getenv("AZURE_OPENAI_ENDPOINT", "")
    deployment = os.getenv("AZURE_OPENAI_DEPLOYMENT", "gpt-4o-mini")
    fsi_level  = fsi.get("fsiLevel", "Medium")
    dominant   = emotional.get("dominantPattern", "none")
    net_flow   = doc.get("netCashFlow", 0)
    has_savings = _get_monthly_savings(doc) > 0
    weekend_alert = emotional.get("weekendSpend", 0) > 200

    fallback = _static_score_explanation(habit_score, doc, emotional, fsi_level)
    if not api_key or not endpoint:
        return fallback

    try:
        from openai import AzureOpenAI
        client = AzureOpenAI(api_key=api_key, azure_endpoint=endpoint, api_version="2024-02-01")
        prompt = (
            f"You are a personal finance AI coach. The user has a HabitWealth Score of {habit_score}/100.\n\n"
            f"Financial data this period:\n"
            f"- Emotional spending pattern: {dominant}\n"
            f"- Financial Stress Level: {fsi_level}\n"
            f"- Net cash flow: €{net_flow:.2f} ({'positive' if net_flow > 0 else 'negative'})\n"
            f"- Has savings/investment contributions: {'yes' if has_savings else 'no'}\n"
            f"- Weekend spending alert triggered: {'yes' if weekend_alert else 'no'}\n\n"
            f"Generate a score explanation with:\n"
            f"- 2-3 short bullet POSITIVES (what the user did well to earn this score, max 12 words each)\n"
            f"- 0-1 WARNING (only if stress/impulse detected, else empty list), max 15 words\n"
            f"Tone: warm, encouraging, specific to the data.\n"
            f"Return ONLY valid JSON (no markdown):\n"
            f'{{"en": {{"positives": ["..."], "warnings": ["..."]}}, '
            f'"es": {{"positives": ["..."], "warnings": ["..."]}}}}'  
        )
        resp = client.chat.completions.create(
            model=deployment,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.6,
            max_tokens=300,
        )
        raw = resp.choices[0].message.content.strip() if resp.choices else ""
        parsed = json.loads(raw) if raw else {}
        parsed["source"] = "gpt-4o"
        return parsed
    except Exception as exc:
        logger.warning("Score explanation GPT failed (%s) — static fallback", exc)
        return fallback

# Pipeline orchestrator
# ──────────────────────────────────────────────────────────────────────────────
def run_pipeline(request: EnrichRequest) -> dict:
    txs  = [t.model_dump() for t in request.transactions]
    gs   = [g.model_dump() for g in request.goals]
    sv   = request.surveyAnswers

    # If the request includes a date range, filter transactions to that inclusive range
    try:
        txs = _filter_transactions_by_date(txs, getattr(request, "startDate", None), getattr(request, "endDate", None))
    except Exception as exc:
        logger.warning("Date filtering failed (%s) — continuing with unfiltered transactions", exc)

    doc       = agent_document_intelligence(txs)
    emotional = agent_emotional_pattern(txs, sv)
    fsi       = agent_financial_stress(doc, emotional)
    goal      = agent_goal_alignment(doc, gs)
    optim     = agent_goal_optimization(doc, emotional, fsi, goal)
    cbt       = agent_cbt_intervention(emotional, fsi, doc)
    twin      = agent_digital_twin(request.userId, doc, emotional, fsi, goal, cbt)
    cbt["scoreExplanation"] = _ai_score_explanation(twin["habitWealthScore"], doc, emotional, fsi)

    return {
        "userId": request.userId,
        "filename": request.filename,
        "processedAt": datetime.now(timezone.utc).isoformat(),
        "agents": {
            "documentIntelligence": doc,
            "emotionalPattern":     emotional,
            "financialStress":      fsi,
            "goalAlignment":        goal,
            "goalOptimization":     optim,
            "cbtIntervention":      cbt,
            "digitalTwin":          twin,
        },
        # Top-level shortcut for frontend
        "summary": {
            "habitWealthScore": twin["habitWealthScore"],
            "financialPersona": twin["financialPersona"],
            "fsiLevel":         fsi["fsiLevel"],
            "topNudge":         cbt["nudges"][0] if cbt["nudges"] else "",
            "goalAlignmentScore": goal["overallAlignmentScore"],
        },
    }

# Routes
# ──────────────────────────────────────────────────────────────────────────────
@app.get("/health")
def health():
    return {"status": "ok", "service": "HabitWealth Enrichment Agent", "agents": 7}

@app.get("/")
def root():
    return {"message": "Welcome to the HabitWealth Enrichment Agent API", "version": "2.0.0"}

@app.post(
    "/enrich",
    responses={
        400: {"description": "No transactions provided"}
    }
)
def enrich(request: EnrichRequest):
    """Main pipeline entry point – called by the Azure Function event handler."""
    if not request.transactions:
        raise HTTPException(status_code=400, detail="No transactions provided")
    return run_pipeline(request)

@app.post("/enrich/event-grid")
def enrich_from_event_grid(event: dict):
    """
    Receives an Azure Event Grid blob-created event payload.
    Simulates fetching the blob analysis result and running the pipeline.
    In production, the Function would call Document Intelligence first,
    then POST the structured transactions here.
    """
    # Extract blob info from Event Grid schema
    data = event.get("data", {})
    blob_url = data.get("url", "")
    filename = blob_url.split("/")[-1] if blob_url else "unknown.pdf"

    # For local testing: return a signal that the event was received
    # (the Function mock-analyze does the actual processing locally)
    return {
        "received": True,
        "blobUrl": blob_url,
        "filename": filename,
        "note": "Event Grid event received. In production, pipeline runs after Document Intelligence extraction."
    }

@app.post("/explain-score")
def explain_score(req: ExplainScoreRequest):
    """Generate an AI-powered score explanation from aggregated summary data.
    Called by the insights-api when a Cosmos document predates the scoreExplanation field.
    Falls back to rule-based explanation if Azure OpenAI is not configured.
    """
    # Fallback byCategory if not provided
    default_by_category = {"Savings": 1.0} if req.hasSavings else {}
    by_category = req.byCategory or default_by_category
    
    doc = {
        "netCashFlow": req.netCashFlow,
        "byCategory": by_category,
    }
    emotional = {
        "dominantPattern": req.dominantPattern,
        "weekendSpend": 300.0 if req.weekendSpendAlert else 0.0,
        "surveyStressScore": 0,
    }
    fsi = {"fsiLevel": req.fsiLevel}
    return _ai_score_explanation(req.habitWealthScore, doc, emotional, fsi)
