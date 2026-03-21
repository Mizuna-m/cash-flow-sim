import { NextResponse } from "next/server";
import { postgresUuidSchema } from "@/src/lib/validation";
import { deleteCardPayment } from "@/src/infrastructure/repositories/card-payment-repository";

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const cardPaymentId = postgresUuidSchema.parse(id);
    const cardPayment = await deleteCardPayment(cardPaymentId);

    return NextResponse.json({ cardPayment });
  } catch (error) {
    return NextResponse.json(
      {
        message: error instanceof Error ? error.message : "Invalid request"
      },
      { status: 400 }
    );
  }
}
