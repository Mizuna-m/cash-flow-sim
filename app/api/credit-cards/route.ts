import { NextResponse } from "next/server";
import { z } from "zod";
import { postgresUuidSchema } from "@/src/lib/validation";
import {
  createCreditCard,
  listCreditCards
} from "@/src/infrastructure/repositories/credit-card-repository";

const creditCardInputSchema = z.object({
  name: z.string().min(1),
  closingDay: z.number().int().min(1).max(31),
  paymentDay: z.number().int().min(1).max(31),
  settlementAccountId: postgresUuidSchema.nullable().optional(),
  currency: z.string().length(3),
  isDefault: z.boolean().default(false)
});

export async function GET() {
  const creditCards = await listCreditCards();
  return NextResponse.json({ creditCards });
}

export async function POST(request: Request) {
  try {
    const payload = creditCardInputSchema.parse(await request.json());
    const creditCard = await createCreditCard(payload);
    return NextResponse.json({ creditCard }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        message: error instanceof Error ? error.message : "Invalid request"
      },
      { status: 400 }
    );
  }
}
