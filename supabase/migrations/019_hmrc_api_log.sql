-- HMRC API call audit log.
--
-- Every outbound call to HMRC's MTD API is logged here for compliance,
-- debugging, and rate-limit monitoring.

CREATE TABLE IF NOT EXISTS hmrc_api_log (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint      TEXT NOT NULL,            -- e.g. GET /organisations/vat/{vrn}/obligations
  method        VARCHAR(10) NOT NULL,     -- GET, POST
  request_body  JSONB,                    -- sanitised request payload (no tokens)
  response_code INTEGER,                  -- HTTP status from HMRC
  response_body JSONB,                    -- full HMRC response
  error_message TEXT,                     -- user-friendly error if failed
  duration_ms   INTEGER,                  -- round-trip time
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_hmrc_api_log_user
  ON hmrc_api_log (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_hmrc_api_log_endpoint
  ON hmrc_api_log (endpoint, created_at DESC);

-- RLS
ALTER TABLE hmrc_api_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY hmrc_api_log_owner ON hmrc_api_log
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
