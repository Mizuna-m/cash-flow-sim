import { dbPool } from "@/src/infrastructure/db/client";

export type CardPaymentRecord = {
  id: string;
  creditCardId: string;
  sourceAccountId: string | null;
  date: string;
  amount: string;
  memo: string;
  orderIndex: number;
  createdAt: string;
  updatedAt: string;
};

type CardPaymentRow = {
  id: string;
  credit_card_id: string;
  source_account_id: string | null;
  date: string;
  amount: string;
  memo: string;
  order_index: number;
  created_at: string;
  updated_at: string;
};

function mapCardPayment(row: CardPaymentRow): CardPaymentRecord {
  return {
    id: row.id,
    creditCardId: row.credit_card_id,
    sourceAccountId: row.source_account_id,
    date: row.date,
    amount: row.amount,
    memo: row.memo,
    orderIndex: row.order_index,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export async function listCardPayments(filters?: { startDate?: string; endDate?: string }) {
  const clauses: string[] = [];
  const params: string[] = [];

  if (filters?.startDate) {
    params.push(filters.startDate);
    clauses.push(`date >= $${params.length}::date`);
  }

  if (filters?.endDate) {
    params.push(filters.endDate);
    clauses.push(`date <= $${params.length}::date`);
  }

  const whereClause = clauses.length > 0 ? `WHERE ${clauses.join(" AND ")}` : "";
  const result = await dbPool.query<CardPaymentRow>(
    `
      SELECT
        id,
        credit_card_id::text,
        source_account_id::text,
        date::text,
        amount::text,
        memo,
        order_index,
        created_at::text,
        updated_at::text
      FROM card_payments
      ${whereClause}
      ORDER BY date DESC, order_index DESC, id DESC
    `,
    params
  );

  return result.rows.map(mapCardPayment);
}

export async function createCardPayment(input: {
  creditCardId: string;
  sourceAccountId?: string | null;
  date: string;
  amount: string;
  memo?: string;
  orderIndex?: number;
}) {
  const result = await dbPool.query<CardPaymentRow>(
    `
      INSERT INTO card_payments (credit_card_id, source_account_id, date, amount, memo, order_index)
      VALUES ($1::uuid, $2::uuid, $3::date, $4::numeric, $5, $6)
      RETURNING
        id,
        credit_card_id::text,
        source_account_id::text,
        date::text,
        amount::text,
        memo,
        order_index,
        created_at::text,
        updated_at::text
    `,
    [
      input.creditCardId,
      input.sourceAccountId ?? null,
      input.date,
      input.amount,
      input.memo ?? "",
      input.orderIndex ?? 0
    ]
  );

  return mapCardPayment(result.rows[0]);
}
