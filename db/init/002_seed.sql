INSERT INTO accounts (id, name, type, currency, initial_balance)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'Main Bank', 'bank', 'JPY', 250000),
  ('22222222-2222-2222-2222-222222222222', 'Travel Wallet', 'cash', 'JPY', 30000)
ON CONFLICT (id) DO NOTHING;

INSERT INTO credit_cards (id, name, closing_day, payment_day, settlement_account_id, currency, is_default)
VALUES
  (
    '33333333-3333-3333-3333-333333333333',
    'Default Card',
    25,
    10,
    '11111111-1111-1111-1111-111111111111',
    'JPY',
    TRUE
  )
ON CONFLICT (id) DO NOTHING;

INSERT INTO transactions (id, date, amount, tags, card_id, memo, order_index)
VALUES
  (
    '44444444-4444-4444-4444-444444444441',
    DATE '2026-03-01',
    280000,
    '{"category":["給与"],"project":[]}'::jsonb,
    NULL,
    'Monthly salary',
    1
  ),
  (
    '44444444-4444-4444-4444-444444444442',
    DATE '2026-03-02',
    -3200,
    '{"category":["食費"],"project":[]}'::jsonb,
    NULL,
    'Groceries',
    1
  ),
  (
    '44444444-4444-4444-4444-444444444443',
    DATE '2026-03-05',
    -45000,
    '{"category":["旅行"],"project":["春の旅行"]}'::jsonb,
    '33333333-3333-3333-3333-333333333333',
    'Travel booking',
    1
  )
ON CONFLICT (id) DO NOTHING;

INSERT INTO scheduled_events (id, name, start_date, recurrence_rule, amount, tags, card_id, is_active, order_index)
VALUES
  (
    '55555555-5555-5555-5555-555555555551',
    'Monthly Rent',
    DATE '2026-03-27',
    'FREQ=MONTHLY',
    -85000,
    '{"category":["家賃"],"project":[]}'::jsonb,
    NULL,
    TRUE,
    1
  )
ON CONFLICT (id) DO NOTHING;

INSERT INTO balance_events (id, date, from_account_id, to_account_id, amount, memo, order_index)
VALUES
  (
    '66666666-6666-6666-6666-666666666661',
    DATE '2026-03-07',
    '11111111-1111-1111-1111-111111111111',
    '22222222-2222-2222-2222-222222222222',
    10000,
    'Move travel cash',
    1
  )
ON CONFLICT (id) DO NOTHING;

INSERT INTO card_payments (id, credit_card_id, source_account_id, date, amount, memo, order_index)
VALUES
  (
    '77777777-7777-7777-7777-777777777771',
    '33333333-3333-3333-3333-333333333333',
    '11111111-1111-1111-1111-111111111111',
    DATE '2026-03-10',
    48000,
    'Card settlement',
    1
  )
ON CONFLICT (id) DO NOTHING;
