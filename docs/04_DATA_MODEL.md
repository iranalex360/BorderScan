# BorderScan Data Model

## Ports

Supported ports:

```text
san_ysidro
otay_mesa
tecate
```

## Lane Types

Supported lanes:

```text
general
ready
sentri
pedestrian
```

## Tables

### cbp_wait_observations

Stores official CBP observations.

```sql
CREATE TABLE cbp_wait_observations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  port TEXT NOT NULL,
  lane_type TEXT NOT NULL,
  crossing_mode TEXT,
  wait_minutes INTEGER,
  lanes_open INTEGER,
  port_status TEXT,
  source_updated_at TEXT,
  ingested_at TEXT DEFAULT CURRENT_TIMESTAMP
);
```

### community_reports

Stores user-submitted reports.

```sql
CREATE TABLE community_reports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT,
  port TEXT NOT NULL,
  lane_type TEXT,
  crossing_mode TEXT,
  report_type TEXT NOT NULL,
  reported_wait_minutes INTEGER,
  queue_start_label TEXT,
  report_text TEXT,
  source_platform TEXT,
  trust_score REAL,
  validation_status TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
```

### extracted_wait_signals

Stores structured signals extracted from messy community input.

```sql
CREATE TABLE extracted_wait_signals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  report_id INTEGER,
  port TEXT,
  lane_type TEXT,
  wait_minutes INTEGER,
  queue_start_label TEXT,
  signal_time TEXT,
  confidence REAL,
  extraction_method TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
```

### user_preferences

Stores simple user memory.

```sql
CREATE TABLE user_preferences (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT,
  preferred_port TEXT,
  preferred_lane TEXT,
  has_sentri INTEGER DEFAULT 0,
  willing_to_use_otay INTEGER DEFAULT 1,
  alert_threshold_minutes INTEGER,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);
```

### queue_estimates

Stores generated queue map estimates.

```sql
CREATE TABLE queue_estimates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  port TEXT NOT NULL,
  lane_type TEXT NOT NULL,
  queue_start_label TEXT,
  queue_length_km REAL,
  estimated_wait_minutes INTEGER,
  confidence TEXT,
  geojson TEXT,
  generated_at TEXT DEFAULT CURRENT_TIMESTAMP
);
```

### agent_decision_logs

Stores observable agent traces.

```sql
CREATE TABLE agent_decision_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_query TEXT,
  port TEXT,
  lane_type TEXT,
  official_wait_minutes INTEGER,
  community_estimate_minutes INTEGER,
  prediction_minutes INTEGER,
  recommendation TEXT,
  confidence TEXT,
  reasoning_summary TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
```
