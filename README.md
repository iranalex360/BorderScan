# BorderScan 🛂  
### TJ → SD Border-Crossing Advisor

BorderScan is an agentic, mobile-first border-crossing advisor for the **Tijuana–San Diego region**. It combines official CBP wait times, historical baselines, holiday context, community-style reports, prediction logic, and a live Leaflet queue map to help travelers answer one simple question:

> **Should I cross now, wait, or use a different port?**

BorderScan supports major crossings such as **San Ysidro**, **Otay Mesa**, and **Tecate**, with lane-specific views for **General**, **Ready**, **SENTRI**, and **Pedestrian** lanes.

---

## 🌐 Live Demo

Try the public interactive demo here:

**🔗 Demo:** [BorderScan Live Demo](https://borderscan.onrender.com/)

> Demo note: BorderScan attempts to use live CBP-style data when available. If live data is unavailable, the app clearly labels fallback demo data.

---

## ✨ What BorderScan Does

Border travelers often rely on scattered information: official wait-time websites, personal experience, social media comments, holiday schedules, and visual estimates of the line.

BorderScan brings these signals together into one dashboard.

### Core Features

- **Official CBP wait-time view**
- **San Ysidro, Otay Mesa, and Tecate support**
- **Lane-specific comparisons**
- **BorderScan wait-time estimates**
- **Prediction timeline: Now, +30, +60, +120 minutes**
- **Confidence badges and severe-delay warnings**
- **Leaflet queue map with red dashed queue routes**
- **Optional community-style report parsing**
- **Guardrails against prompt injection and unsafe input**
- **Agent decision traces for explainability**

---

## 🧠 Why BorderScan Matters

Choosing the wrong crossing can cost travelers hours.

A posted wait may say one thing, while real-world traffic tells another story. Lanes open and close, holiday traffic changes patterns, and different ports can behave very differently at the same time.

BorderScan is designed to help users quickly compare options and understand:

- Which crossing looks best right now
- Whether a lane may be overloaded
- Whether official data may be stale or incomplete
- Whether conditions are improving or getting worse
- Why the app recommends crossing now, waiting, or choosing another port

---

## 📱 User Experience

BorderScan is designed as a mobile-first advisor. The dashboard includes:

- A **Best Option** recommendation card
- Port cards for **San Ysidro**, **Otay Mesa**, and **Tecate**
- Lane selector buttons
- Official wait-time data
- BorderScan prediction ranges
- Confidence labels
- Queue map visualization
- Explanation panel
- Community signal input
- Guardrail validation messages

---

## 🏗️ Architecture Summary

BorderScan uses an orchestrator pattern with specialized agent modules.

More info in the [Wiki](https://github.com/iranalex360/BorderScan/wiki/Agentic-Process)

```mermaid
graph TD
    UserQuery[User Dashboard Request] --> Orchestrator[BorderScanOrchestratorAgent]
    Orchestrator --> DataAgent[BorderScanDataAgent]
    Orchestrator --> CommunityAgent[CommunitySignalAgent]
    Orchestrator --> HolidayAgent[HolidayContextAgent]
    Orchestrator --> PredictAgent[PredictionAgent]
    Orchestrator --> MapAgent[QueueMapAgent]
    Orchestrator --> RecAgent[RecommendationAgent]
    RecAgent --> DB[(SQLite Decision Logs)]
    Orchestrator --> Guardrail[EvaluationGuardrailAgent]
    Guardrail --> UI[Sanitized Dashboard Response]
