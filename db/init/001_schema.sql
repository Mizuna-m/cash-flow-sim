CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('cash', 'bank', 'credit', 'loan', 'investment')),
  currency CHAR(3) NOT NULL,
  initial_balance NUMERIC(18, 2) NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS credit_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  closing_day SMALLINT NOT NULL CHECK (closing_day BETWEEN 1 AND 31),
  payment_day SMALLINT NOT NULL CHECK (payment_day BETWEEN 1 AND 31),
  settlement_account_id UUID REFERENCES accounts(id),
  currency CHAR(3) NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  amount NUMERIC(18, 2) NOT NULL,
  account_id UUID REFERENCES accounts(id),
  payee TEXT NOT NULL DEFAULT '',
  payee_detail JSONB NOT NULL DEFAULT '[]'::jsonb,
  description TEXT NOT NULL DEFAULT '',
  note TEXT NOT NULL DEFAULT '',
  category_path JSONB NOT NULL DEFAULT '[]'::jsonb,
  tags JSONB NOT NULL DEFAULT '{}'::jsonb,
  card_id UUID REFERENCES credit_cards(id),
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS scheduled_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE,
  recurrence_rule TEXT,
  amount NUMERIC(18, 2) NOT NULL,
  account_id UUID REFERENCES accounts(id),
  tags JSONB NOT NULL DEFAULT '{}'::jsonb,
  card_id UUID REFERENCES credit_cards(id),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (end_date IS NULL OR end_date >= start_date)
);

CREATE TABLE IF NOT EXISTS balance_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  from_account_id UUID REFERENCES accounts(id),
  to_account_id UUID REFERENCES accounts(id),
  amount NUMERIC(18, 2) NOT NULL CHECK (amount >= 0),
  memo TEXT NOT NULL DEFAULT '',
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (from_account_id IS DISTINCT FROM to_account_id)
);

CREATE TABLE IF NOT EXISTS card_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  credit_card_id UUID NOT NULL REFERENCES credit_cards(id),
  source_account_id UUID REFERENCES accounts(id),
  date DATE NOT NULL,
  amount NUMERIC(18, 2) NOT NULL CHECK (amount >= 0),
  memo TEXT NOT NULL DEFAULT '',
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS account_id UUID REFERENCES accounts(id);

ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS payee TEXT NOT NULL DEFAULT '';

ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS payee_detail JSONB NOT NULL DEFAULT '[]'::jsonb;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'transactions'
      AND column_name = 'memo'
  ) AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'transactions'
      AND column_name = 'description'
  ) THEN
    ALTER TABLE transactions RENAME COLUMN memo TO description;
  END IF;
END $$;

ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS description TEXT NOT NULL DEFAULT '';

ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS note TEXT NOT NULL DEFAULT '';

ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS category_path JSONB NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE scheduled_events
  ADD COLUMN IF NOT EXISTS account_id UUID REFERENCES accounts(id);

CREATE INDEX IF NOT EXISTS idx_accounts_type ON accounts(type);
CREATE INDEX IF NOT EXISTS idx_credit_cards_settlement_account_id ON credit_cards(settlement_account_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
CREATE INDEX IF NOT EXISTS idx_transactions_card_id ON transactions(card_id);
CREATE INDEX IF NOT EXISTS idx_transactions_account_id ON transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_transactions_payee ON transactions(payee);
CREATE INDEX IF NOT EXISTS idx_transactions_category_path ON transactions USING GIN(category_path);
CREATE INDEX IF NOT EXISTS idx_transactions_tags ON transactions USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_scheduled_events_start_date ON scheduled_events(start_date);
CREATE INDEX IF NOT EXISTS idx_scheduled_events_is_active ON scheduled_events(is_active);
CREATE INDEX IF NOT EXISTS idx_scheduled_events_account_id ON scheduled_events(account_id);
CREATE INDEX IF NOT EXISTS idx_balance_events_date ON balance_events(date);
CREATE INDEX IF NOT EXISTS idx_card_payments_date ON card_payments(date);
CREATE INDEX IF NOT EXISTS idx_card_payments_credit_card_id ON card_payments(credit_card_id);
