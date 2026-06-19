CREATE TABLE IF NOT EXISTS submissions (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL,
  name TEXT,
  email TEXT NOT NULL,
  subject TEXT,
  message TEXT NOT NULL,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  ip_hash TEXT NOT NULL,
  user_agent TEXT,
  spam_status TEXT NOT NULL DEFAULT 'accepted',
  delivery_status TEXT NOT NULL DEFAULT 'pending',
  delivery_error TEXT
);

CREATE INDEX IF NOT EXISTS idx_submissions_created_at ON submissions(created_at);
CREATE INDEX IF NOT EXISTS idx_submissions_spam_status ON submissions(spam_status);
CREATE INDEX IF NOT EXISTS idx_submissions_delivery_status ON submissions(delivery_status);
