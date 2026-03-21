import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { postgresUuidSchema } from "@/src/lib/validation";
import {
  createTransaction,
  listTransactions
} from "@/src/infrastructure/repositories/transaction-repository";

const transactionInputSchema = z.object({
  date: z.string().min(1),
  amount: z.union([z.string(), z.number()]).transform((value) => String(value)),
  accountId: postgresUuidSchema.nullable().optional(),
  payee: z.string().default(""),
  payeeDetail: z.array(z.string()).default([]),
  description: z.string().default(""),
  note: z.string().default(""),
  categoryPath: z.array(z.string()).default([]),
  tags: z.record(z.string(), z.unknown()).default({}),
  cardId: postgresUuidSchema.nullable().optional(),
  orderIndex: z.number().int().nonnegative().default(0)
});

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const startDate = searchParams.get("startDate") ?? undefined;
  const endDate = searchParams.get("endDate") ?? undefined;
  const transactions = await listTransactions({ startDate, endDate });

  return NextResponse.json({ transactions });
}

export async function POST(request: Request) {
  try {
    const payload = transactionInputSchema.parse(await request.json());
    const transaction = await createTransaction(payload);
    return NextResponse.json({ transaction }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        message: error instanceof Error ? error.message : "Invalid request"
      },
      { status: 400 }
    );
  }
}
