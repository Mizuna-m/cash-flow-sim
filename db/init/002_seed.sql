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
  ),
  (
    '33333333-3333-3333-3333-333333333334',
    'Forecast Demo Card',
    5,
    15,
    '11111111-1111-1111-1111-111111111111',
    'JPY',
    FALSE
  )
ON CONFLICT (id) DO NOTHING;

INSERT INTO transactions (
  id,
  date,
  amount,
  account_id,
  payee,
  payee_detail,
  description,
  note,
  category_path,
  tags,
  card_id,
  order_index
)
VALUES
  (
    '44444444-4444-4444-4444-444444444441',
    DATE '2026-03-01',
    280000,
    '11111111-1111-1111-1111-111111111111',
    'Contoso Payroll',
    '[]'::jsonb,
    'Monthly salary',
    '',
    '["収入","給与"]'::jsonb,
    '{"project":[]}'::jsonb,
    NULL,
    1
  ),
  (
    '44444444-4444-4444-4444-444444444442',
    DATE '2026-03-02',
    -3200,
    '11111111-1111-1111-1111-111111111111',
    'FamilyMart',
    '["MSH日本橋箱崎ビル店","FamilyMart"]'::jsonb,
    'Groceries',
    '',
    '["食費","日用品"]'::jsonb,
    '{"project":[]}'::jsonb,
    NULL,
    1
  ),
  (
    '44444444-4444-4444-4444-444444444443',
    DATE '2026-03-05',
    -45000,
    NULL,
    'Travel Portal',
    '["春の旅行","Travel Portal"]'::jsonb,
    'Travel booking',
    '',
    '["交通費","高速代"]'::jsonb,
    '{"project":["春の旅行"]}'::jsonb,
    '33333333-3333-3333-3333-333333333333',
    1
  )
ON CONFLICT (id) DO NOTHING;

INSERT INTO scheduled_events (id, name, start_date, recurrence_rule, amount, account_id, tags, card_id, is_active, order_index)
VALUES
  (
    '55555555-5555-5555-5555-555555555551',
    'Monthly Rent',
    DATE '2026-03-27',
    'FREQ=MONTHLY',
    -85000,
    '11111111-1111-1111-1111-111111111111',
    '{"category":["家賃"],"project":[]}'::jsonb,
    NULL,
    TRUE,
    1
  ),
  (
    '55555555-5555-5555-5555-555555555556',
    'Forecast Demo Headphones',
    DATE '2026-03-04',
    NULL,
    -9000,
    NULL,
    '{"category":["ガジェット"],"project":["forecast-demo"]}'::jsonb,
    '33333333-3333-3333-3333-333333333334',
    TRUE,
    1
  ),
  (
    '55555555-5555-5555-5555-555555555554',
    'Forecast Demo Laptop',
    DATE '2026-04-02',
    NULL,
    -18000,
    NULL,
    '{"category":["家電"],"project":["forecast-demo"]}'::jsonb,
    '33333333-3333-3333-3333-333333333334',
    TRUE,
    2
  ),
  (
    '55555555-5555-5555-5555-555555555553',
    'Forecast Demo Insurance',
    DATE '2026-04-18',
    NULL,
    -42000,
    '11111111-1111-1111-1111-111111111111',
    '{"category":["保険"],"project":["forecast-demo"]}'::jsonb,
    NULL,
    TRUE,
    3
  ),
  (
    '55555555-5555-5555-5555-555555555555',
    'Forecast Demo Concert',
    DATE '2026-04-24',
    NULL,
    -16000,
    '22222222-2222-2222-2222-222222222222',
    '{"category":["娯楽"],"project":["forecast-demo"]}'::jsonb,
    NULL,
    TRUE,
    4
  )
ON CONFLICT (id) DO NOTHING;

UPDATE transactions
SET
  account_id = CASE id
  WHEN '44444444-4444-4444-4444-444444444441' THEN '11111111-1111-1111-1111-111111111111'::uuid
  WHEN '44444444-4444-4444-4444-444444444442' THEN '11111111-1111-1111-1111-111111111111'::uuid
  WHEN '44444444-4444-4444-4444-444444444443' THEN NULL
  ELSE account_id
END,
  payee = CASE id
  WHEN '44444444-4444-4444-4444-444444444441' THEN 'Contoso Payroll'
  WHEN '44444444-4444-4444-4444-444444444442' THEN 'FamilyMart'
  WHEN '44444444-4444-4444-4444-444444444443' THEN 'Travel Portal'
  ELSE payee
END,
  payee_detail = CASE id
  WHEN '44444444-4444-4444-4444-444444444441' THEN '[]'::jsonb
  WHEN '44444444-4444-4444-4444-444444444442' THEN '["MSH日本橋箱崎ビル店","FamilyMart"]'::jsonb
  WHEN '44444444-4444-4444-4444-444444444443' THEN '["春の旅行","Travel Portal"]'::jsonb
  ELSE payee_detail
END,
  description = CASE id
  WHEN '44444444-4444-4444-4444-444444444441' THEN 'Monthly salary'
  WHEN '44444444-4444-4444-4444-444444444442' THEN 'Groceries'
  WHEN '44444444-4444-4444-4444-444444444443' THEN 'Travel booking'
  ELSE description
END,
  note = CASE id
  WHEN '44444444-4444-4444-4444-444444444441' THEN ''
  WHEN '44444444-4444-4444-4444-444444444442' THEN ''
  WHEN '44444444-4444-4444-4444-444444444443' THEN ''
  ELSE note
END,
  category_path = CASE id
  WHEN '44444444-4444-4444-4444-444444444441' THEN '["収入","給与"]'::jsonb
  WHEN '44444444-4444-4444-4444-444444444442' THEN '["食費","日用品"]'::jsonb
  WHEN '44444444-4444-4444-4444-444444444443' THEN '["交通費","高速代"]'::jsonb
  ELSE category_path
END,
  tags = CASE id
  WHEN '44444444-4444-4444-4444-444444444441' THEN '{"project":[]}'::jsonb
  WHEN '44444444-4444-4444-4444-444444444442' THEN '{"project":[]}'::jsonb
  WHEN '44444444-4444-4444-4444-444444444443' THEN '{"project":["春の旅行"]}'::jsonb
  ELSE tags
END
WHERE id IN (
  '44444444-4444-4444-4444-444444444441',
  '44444444-4444-4444-4444-444444444442',
  '44444444-4444-4444-4444-444444444443'
);

UPDATE scheduled_events
SET account_id = CASE id
  WHEN '55555555-5555-5555-5555-555555555551' THEN '11111111-1111-1111-1111-111111111111'::uuid
  WHEN '55555555-5555-5555-5555-555555555556' THEN NULL
  WHEN '55555555-5555-5555-5555-555555555554' THEN NULL
  WHEN '55555555-5555-5555-5555-555555555553' THEN '11111111-1111-1111-1111-111111111111'::uuid
  WHEN '55555555-5555-5555-5555-555555555555' THEN '22222222-2222-2222-2222-222222222222'::uuid
  ELSE account_id
END
WHERE id IN (
  '55555555-5555-5555-5555-555555555551',
  '55555555-5555-5555-5555-555555555556',
  '55555555-5555-5555-5555-555555555554',
  '55555555-5555-5555-5555-555555555553',
  '55555555-5555-5555-5555-555555555555'
);

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
