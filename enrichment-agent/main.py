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
from typing import Any
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

# ──────────────────────────────────────────────────────────────────────────────
# Schemas
# ──────────────────────────────────────────────────────────────────────────────
class Transaction(BaseModel):
    date: str
    merchant: str
    category: str
    amount: float          # negative = expense
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

class ExplainScoreRequest(BaseModel):
    habitWealthScore: int
    netCashFlow: float = 0.0
    hasSavings: bool = False
    byCategory: dict = {}
    fsiLevel: str = "Medium"
    dominantPattern: str = "none"
    weekendSpendAlert: bool = False

# ──────────────────────────────────────────────────────────────────────────────
# Agent 1 – Document Intelligence Parser
# ──────────────────────────────────────────────────────────────────────────────
def agent_document_intelligence(transactions: list[dict]) -> dict:
    """Categorises, deduplicates and summarises raw transactions."""
    by_cat: dict[str, float] = {}
    total_in, total_out = 0.0, 0.0
    for t in transactions:
        amt = t["amount"]
        cat = t.get("category", "Other")
        if amt < 0:
            by_cat[cat] = by_cat.get(cat, 0) + abs(amt)
            total_out += abs(amt)
        else:
            total_in += amt
    return {
        "agent": "DocumentIntelligence",
        "transactionCount": len(transactions),
        "totalIncome": round(total_in, 2),
        "totalExpenses": round(total_out, 2),
        "netCashFlow": round(total_in - total_out, 2),
        "byCategory": {k: round(v, 2) for k, v in by_cat.items()},
        "topMerchants": _top_merchants(transactions),
    }

def _top_merchants(txs: list[dict], n: int = 5) -> list[dict]:
    m: dict[str, float] = {}
    for t in txs:
        if t["amount"] < 0:
            m[t["merchant"]] = m.get(t["merchant"], 0) + abs(t["amount"])
    return sorted([{"merchant": k, "total": round(v, 2)} for k, v in m.items()],
                  key=lambda x: -x["total"])[:n]

# ──────────────────────────────────────────────────────────────────────────────
# Agent 2 – Emotional Pattern Agent
# ──────────────────────────────────────────────────────────────────────────────
EMOTIONAL_KEYWORDS = {
    "impulse": ["amazon", "aliexpress", "zalando", "shein", "steam", "wish"],
    "comfort":  ["mcdonalds", "starbucks", "uber eats", "deliveroo", "glovo"],
    "stress":   ["pharmacy", "alcohol", "tobacco", "casino", "bet"],
    "social":   ["restaurant", "bar", "club", "cinema", "concert"],
}

WEEKEND_DAYS = {5, 6}  # Saturday=5, Sunday=6

def agent_emotional_pattern(transactions: list[dict], survey_answers: list) -> dict:
    scores = dict.fromkeys(EMOTIONAL_KEYWORDS, 0.0)
    weekend_spend = 0.0
    late_night_spend = 0.0  # approximated from weekend flag for now

    for t in transactions:
        if t["amount"] >= 0:
            continue
        name = t["merchant"].lower()
        for pattern, keywords in EMOTIONAL_KEYWORDS.items():
            if any(kw in name for kw in keywords):
                scores[pattern] += abs(t["amount"])
        try:
            d = datetime.fromisoformat(t["date"])
            if d.weekday() in WEEKEND_DAYS:
                weekend_spend += abs(t["amount"])
        except Exception:
            pass

    # Incorporate survey answers (scale 1-4 for first 5 Qs)
    survey_stress = 0
    if survey_answers:
        numeric = [a for a in survey_answers[:5] if isinstance(a, (int, float))]
        survey_stress = round(sum(numeric) / max(len(numeric), 1), 2) if numeric else 0

    dominant = max(scores, key=lambda k: scores[k]) if any(scores.values()) else "none"
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
    return 0.0

# ──────────────────────────────────────────────────────────────────────────────
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
    band = "Low" if fsi < 30 else "Medium" if fsi < 60 else "High"
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

# ──────────────────────────────────────────────────────────────────────────────
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

# ──────────────────────────────────────────────────────────────────────────────
# Agent 4b – Goal Optimization Agent (NEW)
# Detects patterns + recommends actions + simulates impact
# ──────────────────────────────────────────────────────────────────────────────
def _static_goal_optimization(doc: dict, emotional: dict, fsi: dict, goals: dict) -> dict:
    """Rules-based fallback when GPT-4o is unavailable or returns invalid JSON."""
    actions = []
    total_expenses = float(doc.get("totalExpenses") or 0)

    weekend_spend = float(emotional.get("weekendSpend") or 0)
    if total_expenses > 0 and weekend_spend > (total_expenses * 0.15):
        actions.append({
            "title": "Reduce weekend discretionary spending",
            "description": f"Weekend spend is €{weekend_spend:.2f}; adding a weekend cap can accelerate your goal.",
            "category": "Discretionary",
            "potentialSavings": round(weekend_spend * 0.30, 2),
            "effort": "Medium",
            "implementation": "Set a weekly weekend budget and pre-plan leisure expenses.",
        })

    impulse_score = float(emotional.get("emotionalSpendScores", {}).get("impulse") or 0)
    impulse_ratio = (impulse_score / total_expenses) if total_expenses > 0 else 0
    if impulse_ratio > 0.08:
        actions.append({
            "title": "Control impulse purchases",
            "description": f"Impulse spend is {round(impulse_ratio * 100, 1)}% of expenses.",
            "category": "Behavior",
            "potentialSavings": round(impulse_score * 0.35, 2),
            "effort": "Medium",
            "implementation": "Apply a 24h rule before non-essential purchases.",
        })

    by_cat = doc.get("byCategory", {}) or {}
    utilities_spend = float(by_cat.get("Utilities", by_cat.get("Hogar / Suministro", 0)) or 0)
    if utilities_spend > 950:
        actions.append({
            "title": "Optimize utilities",
            "description": "Utility costs are above target; renegotiation may reduce fixed costs.",
            "category": "Fixed Costs",
            "potentialSavings": round(utilities_spend * 0.08, 2),
            "effort": "Low",
            "implementation": "Compare providers and renegotiate electricity/internet contracts.",
        })

    if str(fsi.get("fsiLevel", "")).lower() in {"high", "medium"}:
        actions.append({
            "title": "Build emergency buffer",
            "description": "A safety buffer reduces stress-driven spending and keeps you on plan.",
            "category": "Savings",
            "potentialSavings": round(total_expenses * 0.05, 2) if total_expenses > 0 else 35.0,
            "effort": "Medium",
            "implementation": "Automate a monthly transfer to a dedicated emergency account.",
        })

    if not actions:
        actions = [{
            "title": "Review spending habits",
            "description": "A monthly budget review can uncover fast savings opportunities.",
            "category": "Planning",
            "potentialSavings": 50.0,
            "effort": "Low",
            "implementation": "Block 20 minutes monthly to review subscriptions and variable spending.",
        }]

    total_potential_savings = round(sum(float(a.get("potentialSavings") or 0) for a in actions), 2)
    current_savings = round(_get_monthly_savings(doc), 2)
    optimized_savings = round(current_savings + total_potential_savings, 2)

    optimized_goals = []
    for g in goals.get("goals", []) or []:
        current_projected = g.get("projectedMonths")
        current_goal_savings = float(g.get("currentSavings") or current_savings or 0)
        monthly_needed = float(g.get("monthlyNeeded") or 0)
        # Infer remaining from current projection and current savings first.
        # Using monthlyNeeded * projectedMonths can overestimate remaining and worsen projections.
        if current_projected and current_goal_savings > 0:
            remaining = current_goal_savings * float(current_projected)
        elif current_projected and monthly_needed > 0:
            remaining = monthly_needed * float(current_projected)
        else:
            remaining = monthly_needed * 12

        optimized_projected = math.ceil(remaining / optimized_savings) if optimized_savings > 0 else None
        if current_projected and optimized_projected:
            optimized_projected = min(int(current_projected), int(optimized_projected))
        time_saved = (current_projected - optimized_projected) if (current_projected and optimized_projected) else 0
        optimized_goals.append({
            "goal": g.get("goal", "Goal"),
            "currentProjected": current_projected,
            "optimizedProjected": optimized_projected,
            "timeSaved": max(0, time_saved),
        })

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
    deployment = os.getenv("AZURE_OPENAI_GOAL_DEPLOYMENT", os.getenv("AZURE_OPENAI_DEPLOYMENT", "gpt-4o-mini"))

    if not api_key or not endpoint:
        return None

    try:
        from openai import AzureOpenAI

        current_savings = round(_get_monthly_savings(doc), 2)
        payload = {
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

        prompt = (
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

        client = AzureOpenAI(api_key=api_key, azure_endpoint=endpoint, api_version="2024-02-01")
        resp = client.chat.completions.create(
            model=deployment,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.35,
            max_tokens=900,
            response_format={"type": "json_object"},
        )

        raw = (resp.choices[0].message.content or "").strip() if resp.choices else ""
        raw = re.sub(r"(?:^```json\s*)|(?:\s*```$)", "", raw)
        parsed = json.loads(raw)

        actions = parsed.get("actions", []) if isinstance(parsed, dict) else []
        if not isinstance(actions, list) or len(actions) == 0:
            return None

        normalized_actions = []
        for action in actions[:4]:
            if not isinstance(action, dict):
                continue
            normalized_actions.append({
                "title": str(action.get("title") or "Optimization action"),
                "description": str(action.get("description") or ""),
                "category": str(action.get("category") or "Planning"),
                "potentialSavings": round(max(0.0, float(action.get("potentialSavings") or 0.0)), 2),
                "effort": str(action.get("effort") or "Medium"),
                "implementation": str(action.get("implementation") or "Apply this action for the next 30 days."),
            })

        if not normalized_actions:
            return None

        total_potential_savings = round(
            float(parsed.get("totalPotentialSavings") or 0) or
            sum(a["potentialSavings"] for a in normalized_actions),
            2
        )
        current_monthly_savings = round(float(parsed.get("currentMonthlySavings") or current_savings), 2)
        optimized_monthly_savings = round(float(parsed.get("optimizedMonthlySavings") or (current_monthly_savings + total_potential_savings)), 2)

        optimized_goals = parsed.get("optimizedGoals", []) if isinstance(parsed.get("optimizedGoals", []), list) else []
        if not optimized_goals and goals.get("goals"):
            for g in goals.get("goals", []):
                current_projected = g.get("projectedMonths")
                current_goal_savings = float(g.get("currentSavings") or current_monthly_savings or 0)
                monthly_needed = float(g.get("monthlyNeeded") or 0)
                if current_projected and current_goal_savings > 0:
                    remaining = current_goal_savings * float(current_projected)
                elif current_projected and monthly_needed > 0:
                    remaining = monthly_needed * float(current_projected)
                else:
                    remaining = monthly_needed * 12

                opt_projected = math.ceil(remaining / optimized_monthly_savings) if optimized_monthly_savings > 0 else None
                if current_projected and opt_projected:
                    opt_projected = min(int(current_projected), int(opt_projected))
                time_saved = (current_projected - opt_projected) if (current_projected and opt_projected) else 0
                optimized_goals.append({
                    "goal": g.get("goal", "Goal"),
                    "currentProjected": current_projected,
                    "optimizedProjected": opt_projected,
                    "timeSaved": max(0, time_saved),
                })

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


def agent_goal_optimization(doc: dict, emotional: dict, fsi: dict, goals: dict) -> dict:
    """AI-first goal optimization using Azure OpenAI GPT-4o-mini with static fallback."""
    ai_result = _ai_goal_optimization(doc, emotional, fsi, goals)
    if ai_result and ai_result.get("actions"):
        return ai_result
    return _static_goal_optimization(doc, emotional, fsi, goals)
    
# ──────────────────────────────────────────────────────────────────────────────
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

        prompt = (
            f"You are a certified financial therapist specializing in Cognitive Behavioral "
            f"Therapy (CBT) for money-related behaviors.\n\n"
            f"User profile:\n"
            f"- Dominant emotional spending pattern: \"{dominant}\"\n"
            f"- Financial Stress Level: {fsi_level}\n"
            f"- Top emotional spending areas: {top_areas}\n"
            f"- Net cash flow this month: €{doc_summary.get('netCashFlow', 0):.2f}\n\n"
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
    urgency = "immediate" if level == "High" else "suggested" if level == "Medium" else "preventive"
    return {
        "agent": "CBTIntervention",
        "interventionUrgency": urgency,
        "nudges": nudges_en,
        "nudges_es": nudges_es,
        "nudgeSource": source,
        "primaryPattern": dominant,
        "weekendSpendAlert": emotional["weekendSpend"] > 200,
    }

# ──────────────────────────────────────────────────────────────────────────────
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

# ──────────────────────────────────────────────────────────────────────────────
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
        "en": {"positives": pos_en[:3], "warnings": warn_en[:1]},
        "es": {"positives": pos_es[:3], "warnings": warn_es[:1]},
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

# ──────────────────────────────────────────────────────────────────────────────
# Pipeline orchestrator
# ──────────────────────────────────────────────────────────────────────────────
def run_pipeline(request: EnrichRequest) -> dict:
    txs  = [t.model_dump() for t in request.transactions]
    gs   = [g.model_dump() for g in request.goals]
    sv   = request.surveyAnswers

    doc       = agent_document_intelligence(txs)
    emotional = agent_emotional_pattern(txs, sv)
    fsi       = agent_financial_stress(doc, emotional)
    goal      = agent_goal_alignment(doc, gs)
    optim     = agent_goal_optimization(doc, emotional, fsi, goal)  # NEW
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
            "goalOptimization":     optim,  # NEW
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

# ──────────────────────────────────────────────────────────────────────────────
# Routes
# ──────────────────────────────────────────────────────────────────────────────
@app.get("/health")
def health():
    return {"status": "ok", "service": "HabitWealth Enrichment Agent", "agents": 7}

@app.get("/")
def root():
    return {"message": "Welcome to the HabitWealth Enrichment Agent API", "version": "2.0.0"}

@app.post("/enrich")
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
    doc = {
        "netCashFlow": req.netCashFlow,
        "byCategory": req.byCategory if req.byCategory else ({"Savings": 1.0} if req.hasSavings else {}),
    }
    emotional = {
        "dominantPattern": req.dominantPattern,
        "weekendSpend": 300.0 if req.weekendSpendAlert else 0.0,
        "surveyStressScore": 0,
    }
    fsi = {"fsiLevel": req.fsiLevel}
    return _ai_score_explanation(req.habitWealthScore, doc, emotional, fsi)
