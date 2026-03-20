import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { postgresUuidSchema } from "@/src/lib/validation";
import {
  createScheduledEvent,
  listScheduledEvents
} from "@/src/infrastructure/repositories/scheduled-event-repository";

const scheduledEventInputSchema = z.object({
  name: z.string().min(1),
  startDate: z.string().min(1),
  endDate: z.string().nullable().optional(),
  recurrenceRule: z.string().nullable().optional(),
  amount: z.union([z.string(), z.number()]).transform((value) => String(value)),
  tags: z.record(z.string(), z.unknown()).default({}),
  cardId: postgresUuidSchema.nullable().optional(),
  isActive: z.boolean().default(true),
  orderIndex: z.number().int().nonnegative().default(0)
});

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const startDate = searchParams.get("startDate") ?? undefined;
  const endDate = searchParams.get("endDate") ?? undefined;
  const activeParam = searchParams.get("isActive");
  const isActive =
    activeParam === null ? undefined : activeParam === "true" ? true : false;
  const scheduledEvents = await listScheduledEvents({ startDate, endDate, isActive });

  return NextResponse.json({ scheduledEvents });
}

export async function POST(request: Request) {
  try {
    const payload = scheduledEventInputSchema.parse(await request.json());
    const scheduledEvent = await createScheduledEvent(payload);
    return NextResponse.json({ scheduledEvent }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        message: error instanceof Error ? error.message : "Invalid request"
      },
      { status: 400 }
    );
  }
}
