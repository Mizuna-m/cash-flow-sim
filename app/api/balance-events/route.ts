import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { postgresUuidSchema } from "@/src/lib/validation";
import {
  createBalanceEvent,
  listBalanceEvents
} from "@/src/infrastructure/repositories/balance-event-repository";

const balanceEventInputSchema = z.object({
  date: z.string().min(1),
  fromAccountId: postgresUuidSchema.nullable().optional(),
  toAccountId: postgresUuidSchema.nullable().optional(),
  amount: z.union([z.string(), z.number()]).transform((value) => String(value)),
  memo: z.string().default(""),
  orderIndex: z.number().int().nonnegative().default(0)
});

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const startDate = searchParams.get("startDate") ?? undefined;
  const endDate = searchParams.get("endDate") ?? undefined;
  const balanceEvents = await listBalanceEvents({ startDate, endDate });

  return NextResponse.json({ balanceEvents });
}

export async function POST(request: Request) {
  try {
    const payload = balanceEventInputSchema.parse(await request.json());
    const balanceEvent = await createBalanceEvent(payload);
    return NextResponse.json({ balanceEvent }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        message: error instanceof Error ? error.message : "Invalid request"
      },
      { status: 400 }
    );
  }
}
