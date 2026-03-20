import { z } from "zod";

export const postgresUuidSchema = z
  .string()
  .regex(/^[0-9a-fA-F-]{36}$/, "Invalid UUID");
