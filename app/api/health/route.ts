import { NextResponse } from "next/server";
import { appEnv } from "@/src/infrastructure/db/env";

export function GET() {
  return NextResponse.json({
    status: "ok",
    baseCurrency: appEnv.BASE_CURRENCY,
    defaultCardId: appEnv.DEFAULT_CARD_ID
  });
}
