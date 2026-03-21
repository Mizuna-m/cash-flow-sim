import { dbPool } from "@/src/infrastructure/db/client";

export type TransactionRecord = {
  id: string;
  date: string;
  amount: string;
  accountId: string | null;
  payee: string;
  payeeDetail: string[];
  description: string;
  note: string;
  categoryPath: string[];
  tags: Record<string, unknown>;
  cardId: string | null;
  orderIndex: number;
  createdAt: string;
  updatedAt: string;
};

type TransactionRow = {
  id: string;
  date: string;
  amount: string;
  account_id: string | null;
  payee: string;
  payee_detail: string[];
  description: string;
  note: string;
  category_path: string[];
  tags: Record<string, unknown>;
  card_id: string | null;
  order_index: number;
  created_at: string;
  updated_at: string;
};

function mapTransaction(row: TransactionRow): TransactionRecord {
  return {
    id: row.id,
    date: row.date,
    amount: row.amount,
    accountId: row.account_id,
    payee: row.payee,
    payeeDetail: row.payee_detail,
    description: row.description,
    note: row.note,
    categoryPath: row.category_path,
    tags: row.tags,
    cardId: row.card_id,
    orderIndex: row.order_index,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export async function listTransactions(filters?: { startDate?: string; endDate?: string }) {
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
  const result = await dbPool.query<TransactionRow>(
    `
      SELECT
        id,
        date::text,
        amount::text,
        account_id::text,
        payee,
        payee_detail,
        description,
        note,
        category_path,
        tags,
        card_id::text,
        order_index,
        created_at::text,
        updated_at::text
      FROM transactions
      ${whereClause}
      ORDER BY date DESC, order_index DESC, id DESC
    `,
    params
  );

  return result.rows.map(mapTransaction);
}

export async function createTransaction(input: {
  date: string;
  amount: string;
  accountId?: string | null;
  payee?: string;
  payeeDetail?: string[];
  description?: string;
  note?: string;
  categoryPath?: string[];
  tags: Record<string, unknown>;
  cardId?: string | null;
  orderIndex?: number;
}) {
  const result = await dbPool.query<TransactionRow>(
    `
      INSERT INTO transactions (
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
      VALUES ($1::date, $2::numeric, $3::uuid, $4, $5::jsonb, $6, $7, $8::jsonb, $9::jsonb, $10::uuid, $11)
      RETURNING
        id,
        date::text,
        amount::text,
        account_id::text,
        payee,
        payee_detail,
        description,
        note,
        category_path,
        tags,
        card_id::text,
        order_index,
        created_at::text,
        updated_at::text
    `,
    [
      input.date,
      input.amount,
      input.accountId ?? null,
      input.payee ?? "",
      JSON.stringify(input.payeeDetail ?? []),
      input.description ?? "",
      input.note ?? "",
      JSON.stringify(input.categoryPath ?? []),
      JSON.stringify(input.tags),
      input.cardId ?? null,
      input.orderIndex ?? 0
    ]
  );

  return mapTransaction(result.rows[0]);
}

export async function deleteTransaction(id: string) {
  const result = await dbPool.query<TransactionRow>(
    `
      DELETE FROM transactions
      WHERE id = $1::uuid
      RETURNING
        id,
        date::text,
        amount::text,
        account_id::text,
        payee,
        payee_detail,
        description,
        note,
        category_path,
        tags,
        card_id::text,
        order_index,
        created_at::text,
        updated_at::text
    `,
    [id]
  );

  if (result.rows.length === 0) {
    throw new Error("Transaction not found");
  }

  return mapTransaction(result.rows[0]);
}
