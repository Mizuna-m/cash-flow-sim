import { dbPool } from "@/src/infrastructure/db/client";

type AccountRow = {
  id: string;
  name: string;
  type: "cash" | "bank" | "credit" | "loan" | "investment";
  currency: string;
  initial_balance: string;
};

type CreditCardRow = {
  id: string;
  name: string;
  closing_day: number;
  payment_day: number;
  settlement_account_id: string | null;
  is_default: boolean;
};

type TransactionRow = {
  id: string;
  date: string;
  amount: string;
  tags: Record<string, unknown>;
  card_id: string | null;
  memo: string;
  order_index: number;
};

type ScheduledEventRow = {
  id: string;
  start_date: string;
  name: string;
  amount: string;
  tags: Record<string, unknown>;
  recurrence_rule: string | null;
  card_id: string | null;
  order_index: number;
};

type BalanceEventRow = {
  id: string;
  date: string;
  amount: string;
  memo: string;
  from_account_name: string | null;
  to_account_name: string | null;
  order_index: number;
};

type CardPaymentRow = {
  id: string;
  date: string;
  amount: string;
  credit_card_id: string;
  credit_card_name: string;
  source_account_name: string | null;
  memo: string;
  order_index: number;
};

export type SimulationSeedData = {
  accounts: AccountRow[];
  creditCards: CreditCardRow[];
  transactions: TransactionRow[];
  scheduledEvents: ScheduledEventRow[];
  balanceEvents: BalanceEventRow[];
  cardPayments: CardPaymentRow[];
};

export async function loadSimulationSeedData(
  startDate: string,
  endDate: string
): Promise<SimulationSeedData> {
  const [accounts, creditCards, transactions, scheduledEvents, balanceEvents, cardPayments] =
    await Promise.all([
      dbPool.query<AccountRow>(
        `
          SELECT id, name, type, currency, initial_balance
          FROM accounts
          WHERE is_active = TRUE
          ORDER BY name ASC
        `
      ),
      dbPool.query<CreditCardRow>(
        `
          SELECT
            id,
            name,
            closing_day,
            payment_day,
            settlement_account_id::text,
            is_default
          FROM credit_cards
          ORDER BY is_default DESC, name ASC
        `
      ),
      dbPool.query<TransactionRow>(
        `
          SELECT
            id,
            date::text,
            amount::text,
            tags,
            card_id::text,
            memo,
            order_index
          FROM transactions
          WHERE date BETWEEN $1::date AND $2::date
          ORDER BY date ASC, order_index ASC, id ASC
        `,
        [startDate, endDate]
      ),
      dbPool.query<ScheduledEventRow>(
        `
          SELECT
            id,
            start_date::text,
            name,
            amount::text,
            tags,
            recurrence_rule,
            card_id::text,
            order_index
          FROM scheduled_events
          WHERE is_active = TRUE
            AND start_date BETWEEN $1::date AND $2::date
          ORDER BY start_date ASC, order_index ASC, id ASC
        `,
        [startDate, endDate]
      ),
      dbPool.query<BalanceEventRow>(
        `
          SELECT
            balance_events.id,
            balance_events.date::text,
            balance_events.amount::text,
            balance_events.memo,
            from_account.name AS from_account_name,
            to_account.name AS to_account_name,
            balance_events.order_index
          FROM balance_events
          LEFT JOIN accounts AS from_account
            ON from_account.id = balance_events.from_account_id
          LEFT JOIN accounts AS to_account
            ON to_account.id = balance_events.to_account_id
          WHERE date BETWEEN $1::date AND $2::date
          ORDER BY date ASC, order_index ASC, id ASC
        `,
        [startDate, endDate]
      ),
      dbPool.query<CardPaymentRow>(
        `
          SELECT
            card_payments.id,
            card_payments.date::text,
            card_payments.amount::text,
            card_payments.credit_card_id::text,
            credit_cards.name AS credit_card_name,
            accounts.name AS source_account_name,
            card_payments.memo,
            card_payments.order_index
          FROM card_payments
          INNER JOIN credit_cards
            ON credit_cards.id = card_payments.credit_card_id
          LEFT JOIN accounts
            ON accounts.id = card_payments.source_account_id
          WHERE date BETWEEN $1::date AND $2::date
          ORDER BY date ASC, order_index ASC, id ASC
        `,
        [startDate, endDate]
      )
    ]);

  return {
    accounts: accounts.rows,
    creditCards: creditCards.rows,
    transactions: transactions.rows,
    scheduledEvents: scheduledEvents.rows,
    balanceEvents: balanceEvents.rows,
    cardPayments: cardPayments.rows
  };
}
