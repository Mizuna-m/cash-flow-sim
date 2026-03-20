import { dbPool } from "@/src/infrastructure/db/client";

export type AccountRecord = {
  id: string;
  name: string;
  type: "cash" | "bank" | "credit" | "loan" | "investment";
  currency: string;
  initialBalance: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

type AccountRow = {
  id: string;
  name: AccountRecord["name"];
  type: AccountRecord["type"];
  currency: string;
  initial_balance: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

function mapAccount(row: AccountRow): AccountRecord {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    currency: row.currency,
    initialBalance: row.initial_balance,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export async function listAccounts() {
  const result = await dbPool.query<AccountRow>(
    `
      SELECT
        id,
        name,
        type,
        currency,
        initial_balance::text,
        is_active,
        created_at::text,
        updated_at::text
      FROM accounts
      ORDER BY created_at ASC, id ASC
    `
  );

  return result.rows.map(mapAccount);
}

export async function createAccount(input: {
  name: string;
  type: AccountRecord["type"];
  currency: string;
  initialBalance: string;
}) {
  const result = await dbPool.query<AccountRow>(
    `
      INSERT INTO accounts (name, type, currency, initial_balance)
      VALUES ($1, $2, $3, $4::numeric)
      RETURNING
        id,
        name,
        type,
        currency,
        initial_balance::text,
        is_active,
        created_at::text,
        updated_at::text
    `,
    [input.name, input.type, input.currency, input.initialBalance]
  );

  return mapAccount(result.rows[0]);
}
