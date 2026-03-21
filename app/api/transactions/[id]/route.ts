import { NextResponse } from "next/server";
import { postgresUuidSchema } from "@/src/lib/validation";
import { deleteTransaction } from "@/src/infrastructure/repositories/transaction-repository";

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const transactionId = postgresUuidSchema.parse(id);
    const transaction = await deleteTransaction(transactionId);

    return NextResponse.json({ transaction });
  } catch (error) {
    return NextResponse.json(
      {
        message: error instanceof Error ? error.message : "Invalid request"
      },
      { status: 400 }
    );
  }
}
