# HabitWealth — AI-Powered Financial Wellness Platform

[![Live App](https://img.shields.io/badge/Live%20App-Azure%20Static%20Web%20App-0078D4?logo=microsoft-azure)](https://lemon-tree-0cc9df103.azurestaticapps.net)
[![License: MIT](https://img.shields.io/badge/License-MIT-emerald.svg)](LICENSE)
[![Built with GitHub Copilot](https://img.shields.io/badge/Built%20with-GitHub%20Copilot-000?logo=github)](https://github.com/features/copilot)
[![Azure](https://img.shields.io/badge/Deployed%20on-Azure-0078D4?logo=microsoft-azure)](https://azure.microsoft.com)

> **Hackathon submission** — *Build AI Applications & Agents using Microsoft AI Platform and tools*

HabitWealth is an intelligent platform that detects emotional spending patterns and delivers real-time cognitive-behavioral micro-interventions to improve financial stability and mental well-being.

---

## 🎯 The Problem

Traditional financial apps track expenses. **HabitWealth addresses why people spend the way they do.**

Many people struggle not with insufficient income, but with:
- **Stress-driven purchases** — spending as emotional relief
- **Impulse buying** — triggered by marketing and anxiety
- **Lack of pattern awareness** — recurring behaviors go unnoticed

These behaviors create a cycle: financial stress → impulsive spending → more financial stress.

---

## 🤖 Architecture

```
User uploads PDF bank statement
        ↓
Azure Blob Storage (SAS token — Azure Functions)
        ↓
Azure Event Grid (BlobCreated trigger)
        ↓
Azure Document Intelligence (prebuilt-layout → structured transactions)
        ↓
Multi-Agent Pipeline (Azure Container Apps · FastAPI)
  ├── Agent 1: Document Intelligence Parser
  ├── Agent 2: Emotional Pattern Detector
  ├── Agent 3: Financial Stress Index (FSI 0–100)
  ├── Agent 4: Goal Alignment Scorer
  ├── Agent 5: CBT Intervention Engine → Azure OpenAI GPT-4o-mini
  └── Agent 6: Digital Twin Builder → Cosmos DB upsert
        ↓
On-Demand Agents (Azure Functions · Node.js · Insights API)
  ├── Agent 7: Nudge Regenerator → GPT-4o-mini (live CBT refresh)
  ├── Agent 8: AI Action Planner → GPT-4o-mini (goal optimization steps)
  ├── Agent 9: Provider Alternatives → GPT-4o-mini (cheaper substitutes)
  └── Agent 10: Investor Agent → Yahoo Finance + GPT-4o-mini (stock scoring)
        ↓
Insights Dashboard (Nuxt 4 · Azure Static Web App)
```

### Hero Technologies
| Technology | Usage |
|---|---|
| **Azure AI Foundry** | Document Intelligence (PDF → transactions) + Azure OpenAI GPT-4o-mini |
| **Azure Container Apps** | Hosts the 6-agent FastAPI pipeline with scale-to-zero |
| **GitHub Copilot** | Used throughout development for code generation, review, and documentation |
| **Azure Functions** | SAS tokens, Event Grid, Cosmos DB API, Investor Agent, Nudge generation |
| **Azure Key Vault** | Managed Identity — zero hardcoded secrets |

---

## ✨ Features

### Core Financial Intelligence
- **Financial Stress Index (FSI)** — 0–100 composite score from cash flow, impulse ratio, and survey answers, displayed as a live semi-circle gauge
- **Emotional Pattern Detection** — classifies spending into impulse / comfort / stress / social / mindful patterns with explanations
- **HabitWealth Score** — weighted metric combining FSI, goal alignment, and cash flow health with AI-generated improvement reasoning
- **Financial Digital Twin** — evolving user profile stored in Cosmos DB, updated on every upload

### AI-Powered Recommendations
- **GPT-4o-mini CBT Nudges** — personalized cognitive-behavioral interventions, regenerated on demand if stored nudges are static  
- **AI Action Plan** — goal optimization actions with estimated monthly savings, effort level, and implementation steps (EN/ES bilingual)
- **Provider Alternatives** — detects recurring service expenses and suggests cheaper alternatives with savings amount and official URL
- **On-demand nudge refresh** — insights API detects static nudges and calls GPT-4o-mini live when needed

### Repeated Expenses Tracker
- Detects fixed services (utilities, subscriptions, insurance, entertainment) whose price has increased month-over-month
- Shows base amount, current amount, percent increase, and monthly bar chart
- Collapses into expandable "cheaper alternatives" panel powered by GPT-4o-mini
- Alternatives link directly to the provider's official website in a new tab

### Investor Agent
- **AI stock analysis modal** accessible from a floating action button (FAB) on the dashboard
- Pulls live data from Yahoo Finance (share price, market cap, P/E, PEG, ROE, beta, margins, etc.)
- GPT-4o-mini scores each stock on 4 axes: Financial Health, Growth, Valuation, Risk → composite Final Score /10
- Recommendation banner: BUY 🟢 / HOLD 🟡 / SELL 🔴 with AI rationale, positives, risks, and conclusion
- **Personal capacity nudge** — when recommendation is BUY and the user has a positive net monthly cash flow, a contextual banner shows their available capacity to invest responsibly
- Defaults to **MSFT (Microsoft Corporation)** and auto-analyzes on modal open; supports any Yahoo Finance ticker

### Dashboard Panels
- **Spending by Category** — donut chart + category cards with monthly breakdown; hover popover shows top transactions per peak month (desktop)
- **Goals** — tracks monthly savings vs. required rate per goal with projected completion months and on-track/behind badges
- **Weekend / Utility Spend Alert** — flags anomalous spending spikes
- **Recent Transactions** — last 10 transactions with merchant, date, and signed amount
- **Unified loading screen** — step-list continues from the analyzing page into insights, showing real-time progress

### UX & Accessibility
- **Bilingual** — full EN/ES i18n support (`i18n/locales/en.json` + `es.json`)
- **Privacy-first trust line** — "We never store your personal data · PDFs are processed and deleted"
- **PDF warning** on upload step — reminds users to remove personal data before uploading
- **Responsive design** — mobile sidebar reorders to show actionable content first; no nested scroll traps; tooltips hidden on touch; toasts constrained to viewport width
- **Social login buttons** — Google and Microsoft (UI-ready)
- Dark theme throughout, 3D tilt product card on landing

---

## 🏗️ Project Structure

```
habitwealthTest/
├── app/                        # Nuxt 4 frontend
│   ├── pages/
│   │   ├── index.vue           # Landing page (hero, 3D card, how-it-works)
│   │   ├── get-started.vue     # Onboarding — PDF upload, survey, goals
│   │   ├── analyzing.vue       # Real-time analysis step tracker
│   │   └── insights.vue        # Full dashboard (KPIs, charts, modals)
│   ├── components/             # AppLogo, MetricCard, ScoreGauge, TrendChart…
│   └── assets/css/main.css
├── azure/
│   └── sas-function/           # Azure Functions (Node.js v4)
│       ├── sas-function/       # Blob SAS token generator
│       ├── mock-analyze/       # Document Intelligence orchestrator + Event Grid
│       └── insights-api/       # Cosmos DB query + GPT-4o-mini on-demand calls
│           └── index.js        # Nudges, Action Plan, Alternatives, Investor Agent
├── enrichment-agent/           # Multi-agent pipeline (Python · FastAPI)
│   └── main.py                 # 6 agents + GPT-4o-mini + Cosmos DB upsert
├── infra/                      # Bicep IaC (Key Vault)
├── i18n/locales/               # en.json + es.json translation files
└── .github/workflows/          # CI/CD — Static Web App + Functions
```

---

## 🚀 Live Demo

**App:** https://lemon-tree-0cc9df103.2.azurestaticapps.net

**Agent API:** https://hwbase-agent-00211.graymeadow-30edd248.westeurope.azurecontainerapps.io

```bash
# Quick API test — enrichment pipeline
curl -X POST https://hwbase-agent-00211.graymeadow-30edd248.westeurope.azurecontainerapps.io/enrich \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "demo",
    "filename": "demo.pdf",
    "transactions": [
      {"date":"2026-03-01","merchant":"Amazon","category":"Shopping","amount":-120},
      {"date":"2026-03-05","merchant":"Salary","category":"Income","amount":2200},
      {"date":"2026-03-08","merchant":"Starbucks","category":"Food","amount":-18}
    ],
    "goals": [{"description":"Emergency Fund","targetAmount":3000,"deadlineMonths":12}],
    "surveyAnswers": [3,2,4,3,2]
  }'

# Investor Agent
curl "https://hwbase-fn-sas-00211.azurewebsites.net/api/investor-agent?ticker=AAPL&lang=es"
```

---

## 🛠️ Local Development

### Prerequisites
- Node.js 18+ · pnpm · Python 3.11+
- Azure Functions Core Tools v4
- Azure CLI

### Frontend
```bash
pnpm install
pnpm dev          # http://localhost:3003
```

### Agent Pipeline
```bash
cd enrichment-agent
python -m venv .venv
.venv/Scripts/activate        # Windows
pip install -r requirements.txt
uvicorn main:app --reload --port 8001
```

### Azure Functions
```bash
cd azure/sas-function
npm install
cp local.settings.json.sample local.settings.json
# Fill in your Azure credentials
func start
```

---

## ☁️ Azure Services Used

| Service | Purpose |
|---|---|
| Azure Static Web Apps | Frontend hosting with global CDN + CI/CD |
| Azure Functions (Consumption) | SAS tokens, Event Grid handler, Insights API, Investor Agent |
| Azure Container Apps | Multi-agent enrichment pipeline (scale to zero) |
| Azure Blob Storage | PDF statement storage |
| Azure Event Grid | BlobCreated trigger → Document Intelligence |
| Azure Document Intelligence | PDF → structured transaction extraction |
| Azure OpenAI (GPT-4o-mini) | CBT nudges, Action Plan, Provider Alternatives, Investor Agent narrative |
| Azure Cosmos DB | Digital Twin persistent storage (per-user) |
| Azure Key Vault | Secret management via Managed Identity |
| Azure Container Registry | Docker image for enrichment agent |

---

## 🔄 CI/CD

Every push to `main` automatically:
1. **Builds and deploys** the Nuxt frontend to Azure Static Web Apps
2. **Publishes** the Azure Functions app (`--build remote`)

Managed via GitHub Actions — see [.github/workflows/](.github/workflows/).

---

## 🔒 Security

- **Zero hardcoded secrets** — all credentials in Azure Key Vault via Managed Identity
- **SAS tokens** for Blob Storage — short-lived (1h), write-only permissions
- **HTTPS only** — all endpoints enforce TLS
- **Scale-to-zero** — Container App shuts down when idle
- **PDF privacy** — statements are processed and immediately discarded; no personal data stored

---

## 📊 Evaluation Criteria Alignment

| Criterion (20% each) | Implementation |
|---|---|
| **Technological Implementation** | Nuxt 4 + FastAPI + Key Vault + Cosmos DB + CI/CD |
| **Agentic Design & Innovation** | 6 specialist agents + 4 on-demand GPT-4o-mini functions (nudges, action plan, alternatives, investor) |
| **Real-World Impact** | FSI score + CBT interventions + Investor Agent + Digital Twin — tackles behavioral root causes |
| **User Experience** | Responsive, bilingual EN/ES, privacy-first, 3D card, smooth loading continuity |
| **Hackathon Category** | Azure AI Foundry + Agent Framework + GitHub Copilot + Azure Static Web Apps + Azure Functions |

Video Presentation: https://youtu.be/nj30hwcKy-Q?si=s8U7Cl6JH10Z0_q4  
Video Using App (Phone): https://youtu.be/0z7I7SxTwBY?si=F_45F8H3O8gbCe50


---

## 👩‍💻 Built With

- [Nuxt 4](https://nuxt.com) + [Vue 3](https://vuejs.org) + [TailwindCSS v4](https://tailwindcss.com)
- [FastAPI](https://fastapi.tiangolo.com) + [Python 3.11](https://python.org)
- [Azure OpenAI](https://azure.microsoft.com/en-us/products/ai-services/openai-service)
- [GitHub Copilot](https://github.com/features/copilot)
- Developed in [Visual Studio Code](https://code.visualstudio.com)
