# BorderScan Demo Script

## Demo Goal

Show that BorderScan is an agentic border-crossing advisor, not just a static dashboard.

## Demo Flow

### Step 1: Open Dashboard

Show current official waits:

* San Ysidro
* Otay Mesa
* Tecate

Explain:

> BorderScan starts with official CBP wait-time data as the baseline.

### Step 2: Show Community Reports

Submit this sample report:

```text
SY general starts near 5 y 10, looks like about 2 hours.
```

Explain:

> The CommunitySignalAgent extracts the port, lane, wait estimate, and queue start location.

Expected extraction:

```json
{
  "port": "san_ysidro",
  "lane": "general",
  "wait_minutes": 120,
  "queue_start_label": "near 5 y 10"
}
```

### Step 3: Show CBP Mismatch

Show warning:

> CBP may be underreporting. Official wait is 55 minutes, but community reports suggest 100-120 minutes.

### Step 4: Show Live Queue Map

Show:

* Marker at estimated queue start
* Red line to border entry
* Confidence badge

Explain:

> The QueueMapAgent generates GeoJSON from the estimated queue start and known border corridor.

### Step 5: Show Holiday-Aware Prediction

Show:

```text
Now: 105 min
+30 min: 115 min
+60 min: 95 min
+120 min: 75 min
```

Explain:

> The PredictionAgent combines CBP, community reports, historical averages, and holiday context.

### Step 6: Show Recommendation

Show:

> Recommendation: Use Otay Mesa General now or wait before attempting San Ysidro.

Explain:

> The RecommendationAgent compares signals and provides a decision with confidence.

### Step 7: Show Evaluation

Show tests for:

* Community extraction
* Prompt injection
* Impossible wait values
* Queue map GeoJSON
* Recommendation confidence

## Final Pitch

BorderScan demonstrates:

1. Agents and vibe coding
2. Tools and interoperability
3. Skills, memory, and state
4. Security and evaluation
5. Spec-driven production-style development
