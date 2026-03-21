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
  account_id: string | null;
  account_name: string | null;
  payee: string;
  payee_detail: string[];
  description: string;
  note: string;
  category_path: string[];
  tags: Record<string, unknown>;
  card_id: string | null;
  order_index: number;
};

type ScheduledEventRow = {
  id: string;
  start_date: string;
  name: string;
  amount: string;
  account_id: string | null;
  account_name: string | null;
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
  from_account_id: string | null;
  to_account_id: string | null;
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
  source_account_id: string | null;
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
            transactions.id,
            transactions.date::text,
            transactions.amount::text,
            transactions.account_id::text,
            accounts.name AS account_name,
            transactions.payee,
            transactions.payee_detail,
            transactions.description,
            transactions.note,
            transactions.category_path,
            transactions.tags,
            transactions.card_id::text,
            transactions.order_index
          FROM transactions
          LEFT JOIN accounts
            ON accounts.id = transactions.account_id
          WHERE date BETWEEN $1::date AND $2::date
          ORDER BY transactions.date ASC, transactions.order_index ASC, transactions.id ASC
        `,
        [startDate, endDate]
      ),
      dbPool.query<ScheduledEventRow>(
        `
          SELECT
            scheduled_events.id,
            scheduled_events.start_date::text,
            scheduled_events.name,
            scheduled_events.amount::text,
            scheduled_events.account_id::text,
            accounts.name AS account_name,
            scheduled_events.tags,
            scheduled_events.recurrence_rule,
            scheduled_events.card_id::text,
            scheduled_events.order_index
          FROM scheduled_events
          LEFT JOIN accounts
            ON accounts.id = scheduled_events.account_id
          WHERE scheduled_events.is_active = TRUE
            AND scheduled_events.start_date BETWEEN $1::date AND $2::date
          ORDER BY scheduled_events.start_date ASC, scheduled_events.order_index ASC, scheduled_events.id ASC
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
            balance_events.from_account_id::text,
            balance_events.to_account_id::text,
            from_account.name AS from_account_name,
            to_account.name AS to_account_name,
            balance_events.order_index
          FROM balance_events
          LEFT JOIN accounts AS from_account
            ON from_account.id = balance_events.from_account_id
          LEFT JOIN accounts AS to_account
            ON to_account.id = balance_events.to_account_id
          WHERE date BETWEEN $1::date AND $2::date
          ORDER BY balance_events.date ASC, balance_events.order_index ASC, balance_events.id ASC
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
            card_payments.source_account_id::text,
            accounts.name AS source_account_name,
            card_payments.memo,
            card_payments.order_index
          FROM card_payments
          INNER JOIN credit_cards
            ON credit_cards.id = card_payments.credit_card_id
          LEFT JOIN accounts
            ON accounts.id = card_payments.source_account_id
          WHERE date BETWEEN $1::date AND $2::date
          ORDER BY card_payments.date ASC, card_payments.order_index ASC, card_payments.id ASC
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
