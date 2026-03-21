import { NextResponse } from "next/server";
import { z } from "zod";
import { buildSimulationComparison } from "@/src/application/services/build-simulation-comparison";
import { postgresUuidSchema } from "@/src/lib/validation";

const comparisonRequestSchema = z.object({
  startDate: z.string().min(1),
  endDate: z.string().min(1),
  scenarios: z.array(
    z.object({
      id: z.string().min(1),
      label: z.string().min(1),
      detail: z.string().optional(),
      excludedEventIds: z.array(postgresUuidSchema)
    })
  )
});

export async function POST(request: Request) {
  try {
    const payload = comparisonRequestSchema.parse(await request.json());
    const comparison = await buildSimulationComparison(
      payload.startDate,
      payload.endDate,
      payload.scenarios
    );

    return NextResponse.json(comparison);
  } catch (error) {
    return NextResponse.json(
      {
        message: error instanceof Error ? error.message : "Invalid request"
      },
      { status: 400 }
    );
  }
}
