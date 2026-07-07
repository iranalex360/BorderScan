# BorderScan Agent Architecture

## Overview

BorderScan uses a multi-agent architecture.

The system is organized around a main orchestrator agent and several specialized agents.

```text
User
  ↓
Frontend / Conversational UI
  ↓
BorderScanOrchestratorAgent
  ↓
 ┌─────────────────────────────┐
 │ BorderScanDataAgent         │
 │ CommunitySignalAgent        │
 │ HolidayContextAgent         │
 │ PredictionAgent             │
 │ QueueMapAgent               │
 │ RecommendationAgent         │
 │ EvaluationGuardrailAgent    │
 └─────────────────────────────┘
  ↓
Dashboard + Map + Recommendation
```

## Main Agent

### BorderScanOrchestratorAgent

Coordinates all agents and tools.

Responsibilities:

1. Understand the user request.
2. Identify port, lane, and crossing mode.
3. Get official CBP wait data.
4. Get community reports.
5. Get holiday context.
6. Generate prediction.
7. Generate queue map data.
8. Ask RecommendationAgent for the final recommendation.
9. Run EvaluationGuardrailAgent.
10. Return response with confidence and explanation.

## Specialized Agents

### BorderScanDataAgent

Fetches and normalizes official CBP wait-time data.

### CommunitySignalAgent

Processes human-submitted reports, pasted text, and optional OCR text.

### HolidayContextAgent

Checks U.S. and Mexico holidays, long weekends, and special days off.

### PredictionAgent

Predicts wait times for now, +30, +60, and +120 minutes.

### QueueMapAgent

Generates the estimated queue start and red queue line GeoJSON.

### RecommendationAgent

Chooses whether to cross now, wait, or use another crossing.

### EvaluationGuardrailAgent

Checks for unsafe outputs, missing confidence, prompt injection, impossible values, and privacy issues.

## Agent Loop

```text
Observe:
  Fetch CBP data, community reports, holidays, and historical patterns.

Understand:
  Normalize ports, lanes, timestamps, and queue locations.

Evaluate:
  Check freshness, conflicts, and confidence.

Predict:
  Forecast wait times.

Act:
  Update dashboard, map, and recommendation.

Explain:
  Show why the recommendation was made.

Log:
  Store decision trace for observability.
```
