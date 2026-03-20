import { NextRequest, NextResponse } from "next/server";
import { buildDatabaseSimulation } from "@/src/application/services/build-database-simulation";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const startDate = searchParams.get("startDate") ?? "2026-03-01";
  const endDate = searchParams.get("endDate") ?? "2026-03-31";

  try {
    const simulation = await buildDatabaseSimulation(startDate, endDate);

    return NextResponse.json(simulation);
  } catch (error) {
    return NextResponse.json(
      {
        status: "error",
        message: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}
