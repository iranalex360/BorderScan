# BorderScan Tool Contracts

## getCBPWaitTimes

Input:

```json
{
  "port": "san_ysidro",
  "lane": "general"
}
```

Output:

```json
{
  "official_wait_minutes": 55,
  "source_updated_at": "ISO timestamp",
  "lanes_open": 3,
  "port_status": "open"
}
```

## submitCommunityReport

Input:

```json
{
  "port": "san_ysidro",
  "lane": "general",
  "reported_wait_minutes": 120,
  "queue_start_label": "near 5 y 10",
  "report_text": "SY regular starts near 5 y 10, about 2 hours"
}
```

Output:

```json
{
  "report_id": "string",
  "validation_status": "accepted | needs_review | rejected",
  "trust_score": 0.72
}
```

## extractCommunitySignal

Input:

```json
{
  "text": "SY regular starts near 5 y 10, about 2 hours"
}
```

Output:

```json
{
  "port": "san_ysidro",
  "lane": "general",
  "wait_minutes": 120,
  "queue_start_label": "near 5 y 10",
  "confidence": 0.75
}
```

## getHolidayContext

Input:

```json
{
  "date": "YYYY-MM-DD",
  "timezone": "America/Tijuana"
}
```

Output:

```json
{
  "is_us_holiday": false,
  "is_mx_holiday": true,
  "is_long_weekend": true,
  "impact_level": "medium"
}
```

## predictWaitTime

Input:

```json
{
  "port": "san_ysidro",
  "laneType": "standard",
  "currentWaitMinutes": 55,
  "isCbpStale": false,
  "historicalMedian": 50,
  "queueLengthMeters": 820,
  "trend": "stable",
  "holidayProfile": "none"
}
```

Output:

```json
{
  "now": 145,
  "p50": 145,
  "p75": 195,
  "low_range": 110,
  "high_range": 240,
  "confidence": "low",
  "warnings": [
    "Severe-delay conditions detected. Wait may exceed 2 hours."
  ],
  "reasoning_summary": "Historical, community, and queue-map signals indicate severe delay conditions.",
  "delay_band": "severe",
  "max_cap_applied": 240,
  "signals_used": {
    "cbp_wait": 100,
    "community_median": 150,
    "historical_median": 135,
    "historical_p75": 180,
    "queue_estimate": 170,
    "holiday_impact": "high",
    "trend": "rising_fast"
  },
  "cbp_trust": 0.15,
  "community_trust": 1.0,
  "queue_estimate": 170,
  "historical_median": 135,
  "spread_minutes": 70
}
```

*Note: predictions can represent severe waits up to 240 minutes for standard/general/ready vehicle lanes. Maximum caps are lane-specific: General/Standard/Ready (240 min), SENTRI (150 min), Pedestrian (180 min), and Pedestrian Ready (120 min).*


## generateQueueMap

Input:

```json
{
  "port": "san_ysidro",
  "lane": "general",
  "queue_start_label": "near 5 y 10"
}
```

Output:

```json
{
  "queue_start_label": "near 5 y 10",
  "queue_length_km": 3.2,
  "geojson": {}
}
```

## generateRecommendation

Input:

```json
{
  "port": "san_ysidro",
  "lane": "general",
  "official_wait_minutes": 55,
  "community_estimate_minutes": 105,
  "prediction_minutes": 95,
  "holiday_impact": "medium",
  "queue_start_label": "near 5 y 10"
}
```

Output:

```json
{
  "recommendation": "Use Otay Mesa General now.",
  "confidence": "medium",
  "explanation": [
    "CBP reports San Ysidro at 55 minutes.",
    "Community reports suggest 100-120 minutes.",
    "The queue is estimated near 5 y 10.",
    "Holiday context increases uncertainty."
  ]
}
```
