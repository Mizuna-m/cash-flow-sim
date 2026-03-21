import { dbPool } from "@/src/infrastructure/db/client";

export type BalanceEventRecord = {
  id: string;
  date: string;
  fromAccountId: string | null;
  toAccountId: string | null;
  amount: string;
  memo: string;
  orderIndex: number;
  createdAt: string;
  updatedAt: string;
};

type BalanceEventRow = {
  id: string;
  date: string;
  from_account_id: string | null;
  to_account_id: string | null;
  amount: string;
  memo: string;
  order_index: number;
  created_at: string;
  updated_at: string;
};

function mapBalanceEvent(row: BalanceEventRow): BalanceEventRecord {
  return {
    id: row.id,
    date: row.date,
    fromAccountId: row.from_account_id,
    toAccountId: row.to_account_id,
    amount: row.amount,
    memo: row.memo,
    orderIndex: row.order_index,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export async function listBalanceEvents(filters?: { startDate?: string; endDate?: string }) {
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
  const result = await dbPool.query<BalanceEventRow>(
    `
      SELECT
        id,
        date::text,
        from_account_id::text,
        to_account_id::text,
        amount::text,
        memo,
        order_index,
        created_at::text,
        updated_at::text
      FROM balance_events
      ${whereClause}
      ORDER BY date DESC, order_index DESC, id DESC
    `,
    params
  );

  return result.rows.map(mapBalanceEvent);
}

export async function createBalanceEvent(input: {
  date: string;
  fromAccountId?: string | null;
  toAccountId?: string | null;
  amount: string;
  memo?: string;
  orderIndex?: number;
}) {
  const result = await dbPool.query<BalanceEventRow>(
    `
      INSERT INTO balance_events (date, from_account_id, to_account_id, amount, memo, order_index)
      VALUES ($1::date, $2::uuid, $3::uuid, $4::numeric, $5, $6)
      RETURNING
        id,
        date::text,
        from_account_id::text,
        to_account_id::text,
        amount::text,
        memo,
        order_index,
        created_at::text,
        updated_at::text
    `,
    [
      input.date,
      input.fromAccountId ?? null,
      input.toAccountId ?? null,
      input.amount,
      input.memo ?? "",
      input.orderIndex ?? 0
    ]
  );

  return mapBalanceEvent(result.rows[0]);
}

export async function deleteBalanceEvent(id: string) {
  const result = await dbPool.query<BalanceEventRow>(
    `
      DELETE FROM balance_events
      WHERE id = $1::uuid
      RETURNING
        id,
        date::text,
        from_account_id::text,
        to_account_id::text,
        amount::text,
        memo,
        order_index,
        created_at::text,
        updated_at::text
    `,
    [id]
  );

  if (result.rows.length === 0) {
    throw new Error("Balance event not found");
  }

  return mapBalanceEvent(result.rows[0]);
}
