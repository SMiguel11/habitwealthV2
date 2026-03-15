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
Insights Dashboard (Nuxt 4 · Azure Static Web App)
```

### Hero Technologies
| Technology | Usage |
|---|---|
| **Azure AI Foundry** | Document Intelligence (PDF → transactions) + Azure OpenAI GPT-4o-mini (personalized CBT nudges) |
| **Azure Container Apps** | Hosts the 6-agent FastAPI pipeline with scale-to-zero |
| **GitHub Copilot** | Used throughout development for code generation, review, and documentation |
| **Azure Functions** | SAS token generation, Event Grid handler, Cosmos DB query API |
| **Azure Key Vault** | Managed Identity — zero hardcoded secrets |

---

## ✨ Key Features

- **Financial Stress Index (FSI)** — 0–100 composite score from cash flow, impulse ratio, and survey answers
- **Emotional Pattern Detection** — classifies spending into impulse / comfort / stress / social patterns
- **GPT-4o-mini CBT Nudges** — 3 personalized cognitive-behavioral interventions generated per analysis
- **Financial Digital Twin** — evolving user profile stored in Cosmos DB, updated on every upload
- **HabitWealth Score** — weighted metric combining FSI, goal alignment, and cash flow health
- **Goal Alignment** — tracks monthly savings against user-defined financial goals
- **Bilingual** — full EN/ES i18n support

---

## 🏗️ Project Structure

```
habitwealthTest/
├── app/                        # Nuxt 4 frontend
│   ├── pages/
│   │   ├── index.vue           # Landing page
│   │   ├── get-started.vue     # Onboarding + PDF upload
│   │   ├── analyzing.vue       # Real-time loading
│   │   └── insights.vue        # Results dashboard
│   └── components/
├── azure/
│   └── sas-function/           # Azure Functions (Node.js)
│       ├── sas-function/       # Blob SAS token generator
│       ├── mock-analyze/       # DI orchestrator + Event Grid handler
│       └── insights-api/       # Cosmos DB query endpoint
├── enrichment-agent/           # Multi-agent pipeline (Python · FastAPI)
│   └── main.py                 # 6 agents + GPT-4o-mini integration
├── infra/                      # Bicep IaC
└── .github/workflows/          # CI/CD — Static Web App + Functions
```

---

## 🚀 Live Demo

**App:** https://lemon-tree-0cc9df103.2.azurestaticapps.net 

**Agent API:** https://hwbase-agent-00211.graymeadow-30edd248.westeurope.azurecontainerapps.io

```bash
# Quick API test
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
| Azure Static Web Apps | Frontend hosting with global CDN |
| Azure Functions (Consumption) | SAS tokens, Event Grid, Cosmos API |
| Azure Container Apps | Multi-agent pipeline (scale to zero) |
| Azure Blob Storage | PDF statement storage |
| Azure Event Grid | Blob-created event trigger |
| Azure Document Intelligence | PDF → structured transaction extraction |
| Azure OpenAI (GPT-4o-mini) | Personalized CBT nudge generation |
| Azure Cosmos DB | Digital Twin persistent storage |
| Azure Key Vault | Secret management via Managed Identity |
| Azure Container Registry | Docker image storage |

---

## 🔄 CI/CD

Every push to `main` automatically:
1. **Builds and deploys** the Nuxt frontend to Azure Static Web Apps
2. **Publishes** the Azure Functions app (`--build remote`)

Managed via GitHub Actions — see [.github/workflows/](.github/workflows/).

---

## 🔒 Security

- **Zero hardcoded secrets** — all credentials loaded from Azure Key Vault via Managed Identity
- **SAS tokens** for Blob Storage — short-lived (1h), write-only permissions
- **HTTPS only** — all endpoints enforce TLS
- **Scale-to-zero** — Container App shuts down when idle (no idle cost, no idle attack surface)

---

## 📊 Evaluation Criteria Alignment

| Criterion (20% each) | Implementation |
|---|---|
| **Technological Implementation** | Nuxt 4 + FastAPI + Key Vault + Cosmos DB + CI/CD |
| **Agentic Design & Innovation** | 6 specialized agents, each single-responsibility, output chained as input |
| **Real-World Impact** | FSI score + CBT interventions + Digital Twin — addresses behavioral root causes |
| **User Experience** | 4-page flow, EN/ES i18n, responsive, dark theme, 3D product card |
| **Hackathon Category** | Azure AI Foundry + Agent Framework + GitHub Copilot + Azure deploy |

---

## 👩‍💻 Built With

- [Nuxt 4](https://nuxt.com) + [Vue 3](https://vuejs.org) + [TailwindCSS v4](https://tailwindcss.com)
- [FastAPI](https://fastapi.tiangolo.com) + [Python 3.11](https://python.org)
- [Azure OpenAI](https://azure.microsoft.com/en-us/products/ai-services/openai-service)
- [GitHub Copilot](https://github.com/features/copilot)
- Developed in [Visual Studio Code](https://code.visualstudio.com)
