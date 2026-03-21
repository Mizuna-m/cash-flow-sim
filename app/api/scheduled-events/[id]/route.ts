import { NextResponse } from "next/server";
import { z } from "zod";
import { postgresUuidSchema } from "@/src/lib/validation";
import { updateScheduledEvent } from "@/src/infrastructure/repositories/scheduled-event-repository";

const scheduledEventUpdateSchema = z.object({
  isActive: z.boolean().optional()
});

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const payload = scheduledEventUpdateSchema.parse(await request.json());
    const eventId = postgresUuidSchema.parse(id);
    const scheduledEvent = await updateScheduledEvent({
      id: eventId,
      isActive: payload.isActive
    });

    return NextResponse.json({ scheduledEvent });
  } catch (error) {
    return NextResponse.json(
      {
        message: error instanceof Error ? error.message : "Invalid request"
      },
      { status: 400 }
    );
  }
}
