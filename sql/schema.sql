CREATE TABLE IF NOT EXISTS urls (
  id            SERIAL PRIMARY KEY,
  original_url  TEXT NOT NULL,
  short_code    VARCHAR(30) NOT NULL UNIQUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS clicks (
  id          SERIAL PRIMARY KEY,
  url_id      INTEGER NOT NULL REFERENCES urls(id) ON DELETE CASCADE,
  clicked_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  user_agent  TEXT
);

CREATE INDEX IF NOT EXISTS idx_clicks_url_id ON clicks(url_id);