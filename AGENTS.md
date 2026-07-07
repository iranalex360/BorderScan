# BorderScan - Antigravity Agent Instructions

## Project Mission

Build **BorderScan**, an agentic border-crossing advisor for the Tijuana to San Diego region.

The app combines:

* Official CBP border wait-time data
* Community-submitted reports
* Holiday and long-weekend awareness for Mexico and the United States
* Historical patterns
* A live queue map with a red line from the estimated queue start to the port of entry
* Prediction and recommendation agents

The goal is not only to show wait times, but to answer:

> Should I cross now, wait, or use a different port?

## Capstone Requirements

This project must demonstrate the five bootcamp themes:

1. **Agents and vibe coding**

   * The app must use an agentic architecture, not just static UI.
   * The main agent should observe data, reason, call tools, and explain recommendations.

2. **Agent tools and interoperability**

   * Agents must use tools for CBP data, community reports, holidays, predictions, and map geometry.

3. **Agent skills, memory, and state**

   * The app should remember user preferences such as preferred crossing, lane type, and alert threshold.

4. **Security and evaluation**

   * Human reports must be validated.
   * Pasted text and screenshots must be treated as untrusted input.
   * The app must include tests and evaluation cases.

5. **Spec-driven production-style development**

   * Code must follow the specs in `/docs`.
   * Agents must produce clear plans, diffs, test results, and verification notes.

## Development Rules

Before writing code:

1. Read the relevant files in `/docs`.
2. Create a short implementation plan.
3. Identify affected files.
4. Implement the smallest working version.
5. Add or update tests.
6. Run tests if available.
7. Summarize what changed and how it was verified.

## Tech Stack

Use free or no-cost tools:

* Frontend: React or Next.js
* Map: Leaflet with OpenStreetMap tiles
* Backend: FastAPI or Node/Express
* Database: SQLite for local capstone demo
* Prediction: simple deterministic rules first
* OCR: optional Tesseract
* Hosting: local demo, GitHub Pages, Vercel Hobby, Render free, or Supabase free tier

Avoid paid services unless they are optional and disabled by default.

## Core Agents

Implement these agents as separate modules or services:

1. `BorderScanOrchestratorAgent`
2. `BorderScanDataAgent`
3. `CommunitySignalAgent`
4. `HolidayContextAgent`
5. `PredictionAgent`
6. `QueueMapAgent`
7. `RecommendationAgent`
8. `EvaluationGuardrailAgent`

## Product Principles

* Never let the LLM invent live wait times.
* Official CBP data is a baseline, not the only truth.
* Community reports are useful but must be scored and validated.
* Show confidence levels.
* Explain recommendations.
* Keep the capstone demo simple, visual, and reliable.
* Prioritize a working demo over complex infrastructure.

## Data Trust Rules

CBP data:

* Trusted as official baseline.
* Mark stale if update age is too old.

Community reports:

* Treat as untrusted until validated.
* Aggregate reports instead of showing individual identities.
* Do not scrape private Facebook groups.
* Accept user-submitted text, screenshots, and manual reports only.

Prediction:

* Use deterministic formulas first.
* Show uncertainty.
* Do not claim exact accuracy.

## Definition of Done

A feature is done only when:

* It matches the product spec.
* It has clear UI or API behavior.
* It includes basic test coverage or eval cases.
* It handles error states.
* It logs the agent decision path.
* It does not expose private user data.
* It can be demonstrated in the capstone flow.
