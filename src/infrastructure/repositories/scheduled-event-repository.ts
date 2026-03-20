import { dbPool } from "@/src/infrastructure/db/client";

export type ScheduledEventRecord = {
  id: string;
  name: string;
  startDate: string;
  endDate: string | null;
  recurrenceRule: string | null;
  amount: string;
  tags: Record<string, unknown>;
  cardId: string | null;
  isActive: boolean;
  orderIndex: number;
  createdAt: string;
  updatedAt: string;
};

type ScheduledEventRow = {
  id: string;
  name: string;
  start_date: string;
  end_date: string | null;
  recurrence_rule: string | null;
  amount: string;
  tags: Record<string, unknown>;
  card_id: string | null;
  is_active: boolean;
  order_index: number;
  created_at: string;
  updated_at: string;
};

function mapScheduledEvent(row: ScheduledEventRow): ScheduledEventRecord {
  return {
    id: row.id,
    name: row.name,
    startDate: row.start_date,
    endDate: row.end_date,
    recurrenceRule: row.recurrence_rule,
    amount: row.amount,
    tags: row.tags,
    cardId: row.card_id,
    isActive: row.is_active,
    orderIndex: row.order_index,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export async function listScheduledEvents(filters?: {
  startDate?: string;
  endDate?: string;
  isActive?: boolean;
}) {
  const clauses: string[] = [];
  const params: Array<string | boolean> = [];

  if (filters?.startDate) {
    params.push(filters.startDate);
    clauses.push(`start_date >= $${params.length}::date`);
  }

  if (filters?.endDate) {
    params.push(filters.endDate);
    clauses.push(`start_date <= $${params.length}::date`);
  }

  if (typeof filters?.isActive === "boolean") {
    params.push(filters.isActive);
    clauses.push(`is_active = $${params.length}`);
  }

  const whereClause = clauses.length > 0 ? `WHERE ${clauses.join(" AND ")}` : "";
  const result = await dbPool.query<ScheduledEventRow>(
    `
      SELECT
        id,
        name,
        start_date::text,
        end_date::text,
        recurrence_rule,
        amount::text,
        tags,
        card_id::text,
        is_active,
        order_index,
        created_at::text,
        updated_at::text
      FROM scheduled_events
      ${whereClause}
      ORDER BY start_date ASC, order_index ASC, id ASC
    `,
    params
  );

  return result.rows.map(mapScheduledEvent);
}

export async function createScheduledEvent(input: {
  name: string;
  startDate: string;
  endDate?: string | null;
  recurrenceRule?: string | null;
  amount: string;
  tags: Record<string, unknown>;
  cardId?: string | null;
  isActive?: boolean;
  orderIndex?: number;
}) {
  const result = await dbPool.query<ScheduledEventRow>(
    `
      INSERT INTO scheduled_events (
        name,
        start_date,
        end_date,
        recurrence_rule,
        amount,
        tags,
        card_id,
        is_active,
        order_index
      )
      VALUES ($1, $2::date, $3::date, $4, $5::numeric, $6::jsonb, $7::uuid, $8, $9)
      RETURNING
        id,
        name,
        start_date::text,
        end_date::text,
        recurrence_rule,
        amount::text,
        tags,
        card_id::text,
        is_active,
        order_index,
        created_at::text,
        updated_at::text
    `,
    [
      input.name,
      input.startDate,
      input.endDate ?? null,
      input.recurrenceRule ?? null,
      input.amount,
      JSON.stringify(input.tags),
      input.cardId ?? null,
      input.isActive ?? true,
      input.orderIndex ?? 0
    ]
  );

  return mapScheduledEvent(result.rows[0]);
}
