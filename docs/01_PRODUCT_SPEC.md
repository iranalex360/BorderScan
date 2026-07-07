# BorderScan Product Spec

## One-Sentence Pitch

BorderScan is an agentic border-crossing advisor that combines official CBP data, community reports, holiday awareness, prediction, and a live queue map to recommend when and where to cross from Tijuana to San Diego.

## Target User

People crossing northbound from Tijuana to San Diego through:

* San Ysidro
* Otay Mesa
* Tecate

## Core User Questions

The app should answer:

1. What is the current official wait?
2. What does the community say?
3. Is CBP likely underreporting?
4. Where does the line start?
5. Should I cross now, wait, or use another port?
6. How do holidays or long weekends affect the estimate?

## MVP Features

### 1. Dashboard

Show current waits by port and lane:

* General
* Ready Lane
* SENTRI
* Pedestrian

Each card should show:

* CBP wait
* Community-adjusted estimate
* Confidence
* Last updated
* Warning if data is stale

### 2. Community Reports

Users can submit:

* Port
* Lane
* Wait time
* Line start location
* Text note
* Optional screenshot

### 3. Live Queue Map

Show:

* Estimated queue start marker
* Red line from queue start to border entry
* Border entry marker
* Community report markers
* Confidence badge

### 4. Holiday-Aware Prediction

Show predictions for:

* Now
* +30 minutes
* +60 minutes
* +120 minutes

Prediction should consider:

* CBP wait
* Community reports
* Historical average
* U.S. holidays
* Mexico holidays
* Long weekends
* Day of week
* Hour of day

### 5. Recommendation Agent

Return:

* Best option
* Estimated wait
* Confidence
* Explanation
* Alternative option

Example:

> Use Otay Mesa General now. San Ysidro CBP data says 55 minutes, but community reports suggest 100-120 minutes and the line is reported near 5 y 10.

## Non-Goals for MVP

* No paid traffic APIs
* No automatic Facebook scraping
* No exact live vehicle tracking
* No SMS notifications
* No production authentication required
* No guarantee of official accuracy
