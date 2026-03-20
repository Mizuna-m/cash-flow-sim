import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1).default("postgres://postgres:postgres@localhost:5432/cash_flow_sim"),
  BASE_CURRENCY: z.string().default("JPY"),
  DEFAULT_CARD_ID: z.string().default("default-card"),
  SHORT_THRESHOLD: z.coerce.number().default(0)
});

export const appEnv = envSchema.parse({
  DATABASE_URL: process.env.DATABASE_URL,
  BASE_CURRENCY: process.env.BASE_CURRENCY,
  DEFAULT_CARD_ID: process.env.DEFAULT_CARD_ID,
  SHORT_THRESHOLD: process.env.SHORT_THRESHOLD
});
