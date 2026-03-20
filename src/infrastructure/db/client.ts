import { Pool } from "pg";
import { appEnv } from "@/src/infrastructure/db/env";

declare global {
  var __cashFlowSimPool__: Pool | undefined;
}

export const dbPool =
  global.__cashFlowSimPool__ ??
  new Pool({
    connectionString: appEnv.DATABASE_URL
  });

if (process.env.NODE_ENV !== "production") {
  global.__cashFlowSimPool__ = dbPool;
}
