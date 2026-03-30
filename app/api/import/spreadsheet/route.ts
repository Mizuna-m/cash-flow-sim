import { NextResponse } from "next/server";
import { z } from "zod";
import {
  analyzeSpreadsheetImport,
  importSpreadsheetAnalysis
} from "@/src/application/services/import-spreadsheet";
import { listTransactions } from "@/src/infrastructure/repositories/transaction-repository";
import { parseSpreadsheetFile } from "@/src/lib/import/parse-spreadsheet";

const profileSchema = z.enum([
  "financial-analysis-expense",
  "financial-analysis-income",
  "financial-analysis-recurring"
]);
const modeSchema = z.enum(["preview", "import"]);

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const mode = modeSchema.parse(formData.get("mode") ?? "preview");
    const sheetName = z.string().optional().parse(formData.get("sheetName") ?? undefined);
    const profile = profileSchema.optional().parse(formData.get("profile") ?? undefined);
    const file = formData.get("file");

    if (!(file instanceof File)) {
      throw new Error("Spreadsheet file is required");
    }

    const workbook = await parseSpreadsheetFile(file);
    const transactionHistory = await listTransactions().catch(() => []);
    const analysis = analyzeSpreadsheetImport({ workbook, sheetName, profile, transactionHistory });

    if (mode === "preview") {
      return NextResponse.json({ preview: analysis });
    }

    const result = await importSpreadsheetAnalysis(analysis);
    return NextResponse.json({ preview: analysis, result }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        message: error instanceof Error ? error.message : "Import failed"
      },
      { status: 400 }
    );
  }
}
