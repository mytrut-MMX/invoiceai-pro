-- HMRC OAuth token storage for MTD for VAT integration.
--
-- Tokens are encrypted at the application layer (AES-256-GCM) before storage.
-- This table holds one active token set per user.

CREATE TABLE IF NOT EXISTS hmrc_tokens (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  access_token  TEXT NOT NULL,      -- AES-256-GCM encrypted
  refresh_token TEXT NOT NULL,      -- AES-256-GCM encrypted
  expires_at    TIMESTAMPTZ NOT NULL,
  vrn           VARCHAR(20),        -- VAT Registration Number
  scope         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT uq_hmrc_tokens_user UNIQUE (user_id)
);

CREATE INDEX IF NOT EXISTS idx_hmrc_tokens_expires
  ON hmrc_tokens (user_id, expires_at);

-- RLS
ALTER TABLE hmrc_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY hmrc_tokens_owner ON hmrc_tokens
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
