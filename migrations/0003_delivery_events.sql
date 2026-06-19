CREATE TABLE IF NOT EXISTS delivery_events (
  id TEXT PRIMARY KEY,
  submission_id TEXT NOT NULL,
  adapter TEXT NOT NULL,
  status TEXT NOT NULL,
  response_json TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (submission_id) REFERENCES submissions(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_delivery_events_submission_id ON delivery_events(submission_id);
CREATE INDEX IF NOT EXISTS idx_delivery_events_created_at ON delivery_events(created_at);
