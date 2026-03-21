import { NextResponse } from "next/server";
import { z } from "zod";
import { deleteCreditCard, updateCreditCard } from "@/src/infrastructure/repositories/credit-card-repository";
import { postgresUuidSchema } from "@/src/lib/validation";

const creditCardUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  closingDay: z.number().int().min(1).max(31).optional(),
  paymentDay: z.number().int().min(1).max(31).optional(),
  settlementAccountId: postgresUuidSchema.nullable().optional(),
  currency: z.string().length(3).optional(),
  isDefault: z.boolean().optional()
});

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const creditCardId = postgresUuidSchema.parse(id);
    const payload = creditCardUpdateSchema.parse(await request.json());
    const creditCard = await updateCreditCard({
      id: creditCardId,
      ...payload
    });

    return NextResponse.json({ creditCard });
  } catch (error) {
    return NextResponse.json(
      {
        message: error instanceof Error ? error.message : "Invalid request"
      },
      { status: 400 }
    );
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const creditCardId = postgresUuidSchema.parse(id);
    const creditCard = await deleteCreditCard(creditCardId);

    return NextResponse.json({ creditCard });
  } catch (error) {
    return NextResponse.json(
      {
        message: error instanceof Error ? error.message : "Invalid request"
      },
      { status: 400 }
    );
  }
}
