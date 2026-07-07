-- BorderScan SQLite Schema
-- Aligned with docs/04_DATA_MODEL.md

CREATE TABLE IF NOT EXISTS cbp_wait_observations (
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

CREATE TABLE IF NOT EXISTS community_reports (
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

CREATE TABLE IF NOT EXISTS extracted_wait_signals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  report_id INTEGER REFERENCES community_reports(id) ON DELETE CASCADE,
  port TEXT,
  lane_type TEXT,
  wait_minutes INTEGER,
  queue_start_label TEXT,
  signal_time TEXT,
  confidence REAL,
  extraction_method TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_preferences (
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

CREATE TABLE IF NOT EXISTS queue_estimates (
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

CREATE TABLE IF NOT EXISTS agent_decision_logs (
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

CREATE TABLE IF NOT EXISTS cbp_wait_snapshots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  port TEXT NOT NULL,
  lane TEXT NOT NULL,
  cbp_port_number TEXT,
  cbp_lane_path TEXT,
  wait_minutes INTEGER,
  lanes_open INTEGER,
  lane_update_time TEXT,
  source_record_time TEXT,
  fetched_at TEXT NOT NULL,
  day_of_week TEXT NOT NULL,
  hour INTEGER NOT NULL,
  holiday_profile TEXT DEFAULT 'none'
);

CREATE TABLE IF NOT EXISTS prediction_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  port TEXT NOT NULL,
  lane TEXT NOT NULL,
  predicted_p50 INTEGER,
  predicted_p75 INTEGER,
  low_range INTEGER,
  high_range INTEGER,
  confidence TEXT,
  cbp_wait_at_prediction INTEGER,
  lanes_open INTEGER,
  trend TEXT,
  holiday_profile TEXT,
  prediction_target_minutes INTEGER DEFAULT 60,
  created_at TEXT NOT NULL,
  evaluated_at TEXT,
  actual_wait_proxy INTEGER,
  error_minutes INTEGER,
  absolute_error_minutes INTEGER,
  calibration_status TEXT DEFAULT 'pending'
);

CREATE TABLE IF NOT EXISTS prediction_calibration_profiles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  port TEXT NOT NULL,
  lane TEXT NOT NULL,
  average_error_minutes REAL DEFAULT 0,
  median_absolute_error_minutes REAL DEFAULT 0,
  sample_size INTEGER DEFAULT 0,
  tendency TEXT DEFAULT 'neutral',
  updated_at TEXT NOT NULL
);

