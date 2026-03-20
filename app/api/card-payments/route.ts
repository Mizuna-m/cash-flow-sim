import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  createCardPayment,
  listCardPayments
} from "@/src/infrastructure/repositories/card-payment-repository";

const cardPaymentInputSchema = z.object({
  creditCardId: z.string().uuid(),
  sourceAccountId: z.string().uuid().nullable().optional(),
  date: z.string().min(1),
  amount: z.union([z.string(), z.number()]).transform((value) => String(value)),
  memo: z.string().default(""),
  orderIndex: z.number().int().nonnegative().default(0)
});

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const startDate = searchParams.get("startDate") ?? undefined;
  const endDate = searchParams.get("endDate") ?? undefined;
  const cardPayments = await listCardPayments({ startDate, endDate });

  return NextResponse.json({ cardPayments });
}

export async function POST(request: Request) {
  try {
    const payload = cardPaymentInputSchema.parse(await request.json());
    const cardPayment = await createCardPayment(payload);
    return NextResponse.json({ cardPayment }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        message: error instanceof Error ? error.message : "Invalid request"
      },
      { status: 400 }
    );
  }
}
