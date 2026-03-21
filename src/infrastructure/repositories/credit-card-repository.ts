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

export async function createCreditCard(input: {
  name: string;
  closingDay: number;
  paymentDay: number;
  settlementAccountId?: string | null;
  currency: string;
  isDefault?: boolean;
}) {
  const client = await dbPool.connect();

  try {
    await client.query("BEGIN");

    if (input.isDefault) {
      await client.query(`UPDATE credit_cards SET is_default = FALSE WHERE is_default = TRUE`);
    }

    const result = await client.query<CreditCardRow>(
      `
        INSERT INTO credit_cards (
          name,
          closing_day,
          payment_day,
          settlement_account_id,
          currency,
          is_default
        )
        VALUES ($1, $2, $3, $4::uuid, $5, $6)
        RETURNING
          id,
          name,
          closing_day,
          payment_day,
          settlement_account_id::text,
          currency,
          is_default,
          created_at::text,
          updated_at::text
      `,
      [
        input.name,
        input.closingDay,
        input.paymentDay,
        input.settlementAccountId ?? null,
        input.currency,
        input.isDefault ?? false
      ]
    );

    await client.query("COMMIT");
    return mapCreditCard(result.rows[0]);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function updateCreditCard(input: {
  id: string;
  name?: string;
  closingDay?: number;
  paymentDay?: number;
  settlementAccountId?: string | null;
  currency?: string;
  isDefault?: boolean;
}) {
  const client = await dbPool.connect();

  try {
    await client.query("BEGIN");

    const currentResult = await client.query<CreditCardRow>(
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
        WHERE id = $1::uuid
      `,
      [input.id]
    );

    const current = currentResult.rows[0];

    if (!current) {
      throw new Error("Credit card not found");
    }

    if (input.isDefault) {
      await client.query(
        `UPDATE credit_cards SET is_default = FALSE WHERE is_default = TRUE AND id <> $1::uuid`,
        [input.id]
      );
    }

    const result = await client.query<CreditCardRow>(
      `
        UPDATE credit_cards
        SET
          name = $2,
          closing_day = $3,
          payment_day = $4,
          settlement_account_id = $5::uuid,
          currency = $6,
          is_default = $7,
          updated_at = NOW()
        WHERE id = $1::uuid
        RETURNING
          id,
          name,
          closing_day,
          payment_day,
          settlement_account_id::text,
          currency,
          is_default,
          created_at::text,
          updated_at::text
      `,
      [
        input.id,
        input.name ?? current.name,
        input.closingDay ?? current.closing_day,
        input.paymentDay ?? current.payment_day,
        input.settlementAccountId === undefined
          ? current.settlement_account_id
          : input.settlementAccountId,
        input.currency ?? current.currency,
        input.isDefault ?? current.is_default
      ]
    );

    await client.query("COMMIT");
    return mapCreditCard(result.rows[0]);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function deleteCreditCard(id: string) {
  const client = await dbPool.connect();

  try {
    await client.query("BEGIN");

    const result = await client.query<CreditCardRow>(
      `
        DELETE FROM credit_cards
        WHERE id = $1::uuid
        RETURNING
          id,
          name,
          closing_day,
          payment_day,
          settlement_account_id::text,
          currency,
          is_default,
          created_at::text,
          updated_at::text
      `,
      [id]
    );

    const creditCard = result.rows[0];

    if (!creditCard) {
      throw new Error("Credit card not found");
    }

    if (creditCard.is_default) {
      await client.query(
        `
          UPDATE credit_cards
          SET is_default = TRUE, updated_at = NOW()
          WHERE id = (
            SELECT id
            FROM credit_cards
            ORDER BY created_at ASC, id ASC
            LIMIT 1
          )
        `
      );
    }

    await client.query("COMMIT");
    return mapCreditCard(creditCard);
  } catch (error) {
    await client.query("ROLLBACK");

    if (typeof error === "object" && error && "code" in error && error.code === "23503") {
      throw new Error("使用中のカードは削除できません。関連する取引や予定を先に整理してください。");
    }

    throw error;
  } finally {
    client.release();
  }
}
