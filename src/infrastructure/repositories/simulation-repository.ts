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
  order_index: number;
};

type ScheduledEventRow = {
  id: string;
  start_date: string;
  amount: string;
  card_id: string | null;
  order_index: number;
};

type BalanceEventRow = {
  id: string;
  date: string;
  amount: string;
  order_index: number;
};

type CardPaymentRow = {
  id: string;
  date: string;
  amount: string;
  credit_card_id: string;
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
            order_index
          FROM transactions
          WHERE date BETWEEN $1::date AND $2::date
          ORDER BY date ASC, order_index ASC, id ASC
        `,
        [startDate, endDate]
      ),
      dbPool.query<ScheduledEventRow>(
        `
          SELECT id, start_date::text, amount::text, card_id::text, order_index
          FROM scheduled_events
          WHERE is_active = TRUE
            AND start_date BETWEEN $1::date AND $2::date
          ORDER BY start_date ASC, order_index ASC, id ASC
        `,
        [startDate, endDate]
      ),
      dbPool.query<BalanceEventRow>(
        `
          SELECT id, date::text, amount::text, order_index
          FROM balance_events
          WHERE date BETWEEN $1::date AND $2::date
          ORDER BY date ASC, order_index ASC, id ASC
        `,
        [startDate, endDate]
      ),
      dbPool.query<CardPaymentRow>(
        `
          SELECT id, date::text, amount::text, credit_card_id::text, order_index
          FROM card_payments
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
