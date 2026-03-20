import { dbPool } from "@/src/infrastructure/db/client";

export type CreditCardRecord = {
  id: string;
  name: string;
  closingDay: number;
  paymentDay: number;
  settlementAccountId: string | null;
  currency: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
};

type CreditCardRow = {
  id: string;
  name: string;
  closing_day: number;
  payment_day: number;
  settlement_account_id: string | null;
  currency: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
};

function mapCreditCard(row: CreditCardRow): CreditCardRecord {
  return {
    id: row.id,
    name: row.name,
    closingDay: row.closing_day,
    paymentDay: row.payment_day,
    settlementAccountId: row.settlement_account_id,
    currency: row.currency,
    isDefault: row.is_default,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export async function listCreditCards() {
  const result = await dbPool.query<CreditCardRow>(
    `
      SELECT
        id,
        name,
        closing_day,
        payment_day,
        settlement_account_id::text,
        currency,
        is_default,
        created_at::text,
        updated_at::text
      FROM credit_cards
      ORDER BY is_default DESC, created_at ASC, id ASC
    `
  );

  return result.rows.map(mapCreditCard);
}
