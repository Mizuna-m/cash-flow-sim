import { NextResponse } from "next/server";
import { postgresUuidSchema } from "@/src/lib/validation";
import { deleteBalanceEvent } from "@/src/infrastructure/repositories/balance-event-repository";

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const balanceEventId = postgresUuidSchema.parse(id);
    const balanceEvent = await deleteBalanceEvent(balanceEventId);

    return NextResponse.json({ balanceEvent });
  } catch (error) {
    return NextResponse.json(
      {
        message: error instanceof Error ? error.message : "Invalid request"
      },
      { status: 400 }
    );
  }
}
