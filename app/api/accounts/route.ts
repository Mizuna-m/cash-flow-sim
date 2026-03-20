import { NextResponse } from "next/server";
import { z } from "zod";
import { createAccount, listAccounts } from "@/src/infrastructure/repositories/account-repository";

const accountInputSchema = z.object({
  name: z.string().min(1),
  type: z.enum(["cash", "bank", "credit", "loan", "investment"]),
  currency: z.string().length(3),
  initialBalance: z.union([z.string(), z.number()]).transform((value) => String(value))
});

export async function GET() {
  const accounts = await listAccounts();
  return NextResponse.json({ accounts });
}

export async function POST(request: Request) {
  try {
    const payload = accountInputSchema.parse(await request.json());
    const account = await createAccount(payload);
    return NextResponse.json({ account }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        message: error instanceof Error ? error.message : "Invalid request"
      },
      { status: 400 }
    );
  }
}
