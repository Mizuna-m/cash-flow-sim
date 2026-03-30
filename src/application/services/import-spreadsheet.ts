import type {
  Transaction,
  TransactionCreateRequest
} from "@/src/lib/openapi-contract";
import type { ParsedSpreadsheetSheet, ParsedSpreadsheetWorkbook } from "@/src/lib/import/parse-spreadsheet";
import { createTransactionsBulk } from "@/src/infrastructure/repositories/transaction-repository";

export type ImportProfile =
  | "financial-analysis-expense"
  | "financial-analysis-income"
  | "financial-analysis-recurring";

export type ImportTargetKind = "transaction";

export type ImportIssue = {
  level: "warning" | "error";
  rowNumber?: number;
  message: string;
};

export type ImportPreviewRow = {
  rowNumber: number;
  date: string;
  amount: string;
  payee: string;
  description: string;
  note: string;
  categoryPath: string[];
  project: string | null;
  accountId: string | null;
  cardId: string | null;
  suggestion: null | {
    accountId: string | null;
    cardId: string | null;
    categoryPath: string[];
    project: string | null;
    evidenceCount: number;
  };
  appliedSuggestionFields: string[];
  raw: string[];
};

export type ImportAnalysis = {
  fileName: string;
  sheets: Array<{
    name: string;
    rowCount: number;
    suggestion: ImportProfile | null;
  }>;
  selectedSheetName: string | null;
  selectedProfile: ImportProfile | null;
  targetKind: ImportTargetKind;
  canImport: boolean;
  issues: ImportIssue[];
  previewRows: ImportPreviewRow[];
  transactions: TransactionCreateRequest[];
};

type PayeeImportProfile = {
  payee: string;
  accountId: string | null;
  cardId: string | null;
  categoryPath: string[];
  project: string | null;
  evidenceCount: number;
};

function asArray<T>(value: T | T[] | undefined): T[] {
  if (Array.isArray(value)) return value;
  if (value === undefined || value === null) return [];
  return [value];
}

function normalizeHeader(value: string) {
  return value.trim().replace(/\s+/g, "");
}

function cleanValue(value: string | undefined) {
  const normalized = (value ?? "").trim();
  return normalized === "-" ? "" : normalized;
}

function splitHierarchy(value: string) {
  return cleanValue(value)
    .split(" - ")
    .map((item) => item.trim())
    .filter(Boolean);
}

function toDate(value: string) {
  const normalized = cleanValue(value).replace(/\./g, "/");
  const match = normalized.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/);
  if (!match) return null;
  return `${match[1]}-${match[2].padStart(2, "0")}-${match[3].padStart(2, "0")}`;
}

function toAmount(value: string, direction: "income" | "expense") {
  const normalized = cleanValue(value).replace(/[¥,\s]/g, "");
  if (!normalized) return null;
  const sign = direction === "expense" ? -1 : 1;
  const amount = Number(normalized);
  if (Number.isNaN(amount)) return null;
  return (Math.abs(amount) * sign).toFixed(2);
}

function detectProfile(sheet: ParsedSpreadsheetSheet): ImportProfile | null {
  const header = sheet.rows[0]?.map(normalizeHeader) ?? [];
  const joined = header.join("|");
  if (sheet.name === "支出" && joined.includes("相手詳細") && joined.includes("プロジェクト")) {
    return "financial-analysis-expense";
  }
  if (sheet.name === "収入" && joined.includes("日付/請求日基点") && joined.includes("プロジェクト名")) {
    return "financial-analysis-income";
  }
  if (sheet.name === "定期支出" && joined.includes("相手詳細") && joined.includes("プロジェクト")) {
    return "financial-analysis-recurring";
  }
  return null;
}

function buildCategoryLookup(workbook: ParsedSpreadsheetWorkbook) {
  const categorySheet = workbook.sheets.find((sheet) => sheet.name === "種別");
  const lookup = new Map<string, string[]>();

  for (const row of asArray(categorySheet?.rows).slice(1)) {
    const kind = cleanValue(row[1]);
    const group = cleanValue(row[3]);
    if (!kind) continue;
    lookup.set(kind, group && group !== kind ? [group, kind] : [kind]);
  }

  return lookup;
}

function buildProjectTags(project: string) {
  return project ? { project: [project] } : { project: [] };
}

function firstProjectTag(tags: Record<string, unknown> | undefined) {
  const project = tags?.project;
  if (!Array.isArray(project)) return null;
  const first = project.find((value) => typeof value === "string" && value.trim().length > 0);
  return typeof first === "string" ? first : null;
}

export function buildPayeeImportProfiles(transactions: Transaction[]) {
  const counts = new Map<
    string,
    {
      total: number;
      accountIds: Map<string, number>;
      cardIds: Map<string, number>;
      categoryPaths: Map<string, number>;
      projects: Map<string, number>;
    }
  >();

  for (const transaction of transactions) {
    const payee = cleanValue(transaction.payee);
    if (!payee) continue;

    const bucket =
      counts.get(payee) ??
      {
        total: 0,
        accountIds: new Map<string, number>(),
        cardIds: new Map<string, number>(),
        categoryPaths: new Map<string, number>(),
        projects: new Map<string, number>()
      };
    bucket.total += 1;

    if (transaction.accountId) {
      bucket.accountIds.set(transaction.accountId, (bucket.accountIds.get(transaction.accountId) ?? 0) + 1);
    }
    if (transaction.cardId) {
      bucket.cardIds.set(transaction.cardId, (bucket.cardIds.get(transaction.cardId) ?? 0) + 1);
    }
    if (transaction.categoryPath.length > 0) {
      const key = transaction.categoryPath.join(" > ");
      bucket.categoryPaths.set(key, (bucket.categoryPaths.get(key) ?? 0) + 1);
    }
    const project = firstProjectTag(transaction.tags);
    if (project) {
      bucket.projects.set(project, (bucket.projects.get(project) ?? 0) + 1);
    }

    counts.set(payee, bucket);
  }

  const pickTop = (map: Map<string, number>) =>
    [...map.entries()].sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))[0] ?? null;

  const profiles = new Map<string, PayeeImportProfile>();
  for (const [payee, bucket] of counts.entries()) {
    const topAccount = pickTop(bucket.accountIds);
    const topCard = pickTop(bucket.cardIds);
    const topCategory = pickTop(bucket.categoryPaths);
    const topProject = pickTop(bucket.projects);

    profiles.set(payee, {
      payee,
      accountId: topAccount?.[0] ?? null,
      cardId: topCard?.[0] ?? null,
      categoryPath: topCategory?.[0] ? topCategory[0].split(" > ").map((item) => item.trim()) : [],
      project: topProject?.[0] ?? null,
      evidenceCount: bucket.total
    });
  }

  return profiles;
}

function mapFinancialAnalysisRow(input: {
  row: string[];
  rowNumber: number;
  profile: ImportProfile;
  categoryLookup: Map<string, string[]>;
  payeeProfiles: Map<string, PayeeImportProfile>;
}) {
  const issues: ImportIssue[] = [];
  const dateIndex = 0;
  const payeeIndex = 1;
  const payeeDetailIndex = input.profile === "financial-analysis-income" ? -1 : 2;
  const descriptionIndex = input.profile === "financial-analysis-income" ? 2 : 3;
  const amountIndex = input.profile === "financial-analysis-income" ? 3 : 4;
  const categoryIndex = input.profile === "financial-analysis-income" ? 5 : 6;
  const noteIndex = input.profile === "financial-analysis-income" ? 6 : 7;
  const projectIndex = input.profile === "financial-analysis-income" ? 8 : 9;
  const date = toDate(input.row[dateIndex] ?? "");
  const payee = cleanValue(input.row[payeeIndex]);
  const payeeDetail = payeeDetailIndex >= 0 ? splitHierarchy(input.row[payeeDetailIndex] ?? "") : [];
  const description = cleanValue(input.row[descriptionIndex]);
  const amount = toAmount(
    input.row[amountIndex] ?? "",
    input.profile === "financial-analysis-income" ? "income" : "expense"
  );
  const categoryName = cleanValue(input.row[categoryIndex]);
  const note = cleanValue(input.row[noteIndex]);
  const project = cleanValue(input.row[projectIndex]);
  const profile = payee ? input.payeeProfiles.get(payee) ?? null : null;

  if (!date) issues.push({ level: "error", rowNumber: input.rowNumber, message: "日付を解釈できません" });
  if (!amount) issues.push({ level: "error", rowNumber: input.rowNumber, message: "金額を解釈できません" });

  const directCategoryPath = categoryName ? input.categoryLookup.get(categoryName) ?? [categoryName] : [];
  const categoryPath = directCategoryPath.length > 0 ? directCategoryPath : profile?.categoryPath ?? [];
  const normalizedProject = project || profile?.project || null;
  const accountId = profile?.accountId ?? null;
  const cardId = profile?.cardId ?? null;
  const appliedSuggestionFields = [
    ...(directCategoryPath.length === 0 && profile?.categoryPath.length ? ["categoryPath"] : []),
    ...(!project && profile?.project ? ["project"] : []),
    ...(profile?.accountId ? ["accountId"] : []),
    ...(profile?.cardId ? ["cardId"] : [])
  ];

  const payload: TransactionCreateRequest | null =
    date && amount
      ? {
          date,
          amount,
          accountId,
          payee,
          payeeDetail,
          description,
          note,
          categoryPath,
          tags: buildProjectTags(normalizedProject ?? ""),
          cardId,
          orderIndex: Math.max(input.rowNumber - 2, 0)
        }
      : null;

  return {
    issues,
    payload,
    previewRow:
      date && amount
        ? {
            rowNumber: input.rowNumber,
            date,
            amount,
            payee,
            description,
            note,
            categoryPath,
            project: normalizedProject,
            accountId,
            cardId,
            suggestion: profile,
            appliedSuggestionFields,
            raw: input.row
          }
        : null
  };
}

export function analyzeSpreadsheetImport(input: {
  workbook: ParsedSpreadsheetWorkbook;
  sheetName?: string | null;
  profile?: ImportProfile | null;
  transactionHistory?: Transaction[];
}): ImportAnalysis {
  const sheets = input.workbook.sheets.map((sheet) => ({
    name: sheet.name,
    rowCount: Math.max(sheet.rows.length - 1, 0),
    suggestion: detectProfile(sheet)
  }));
  const selectedSheet =
    input.workbook.sheets.find((sheet) => sheet.name === input.sheetName) ??
    input.workbook.sheets.find((sheet) => detectProfile(sheet) !== null) ??
    input.workbook.sheets[0];
  const selectedProfile = input.profile ?? (selectedSheet ? detectProfile(selectedSheet) : null);
  const categoryLookup = buildCategoryLookup(input.workbook);
  const payeeProfiles = buildPayeeImportProfiles(input.transactionHistory ?? []);
  const issues: ImportIssue[] = [];
  const transactions: TransactionCreateRequest[] = [];
  const previewRows: ImportPreviewRow[] = [];

  if (!selectedSheet || !selectedProfile) {
    return {
      fileName: input.workbook.fileName,
      sheets,
      selectedSheetName: selectedSheet?.name ?? null,
      selectedProfile,
      targetKind: "transaction",
      canImport: false,
      issues: [
        {
          level: "error",
          message: "対応可能なシートを判定できませんでした。支出 / 収入 / 定期支出 を選んでください。"
        }
      ],
      previewRows: [],
      transactions: []
    };
  }

  if (selectedProfile === "financial-analysis-recurring") {
    issues.push({
      level: "warning",
      message: "定期支出シートは初版では scheduled ではなく transaction 実績として取り込みます。"
    });
  }

  for (const [index, row] of selectedSheet.rows.slice(1).entries()) {
    if (!row.some((cell) => cleanValue(cell))) continue;
    const mapped = mapFinancialAnalysisRow({
      row,
      rowNumber: index + 2,
      profile: selectedProfile,
      categoryLookup,
      payeeProfiles
    });
    issues.push(...mapped.issues);
    if (mapped.payload && mapped.previewRow) {
      transactions.push(mapped.payload);
      previewRows.push(mapped.previewRow);
    }
  }

  return {
    fileName: input.workbook.fileName,
    sheets,
    selectedSheetName: selectedSheet.name,
    selectedProfile,
    targetKind: "transaction",
    canImport: issues.every((issue) => issue.level !== "error") && transactions.length > 0,
    issues,
    previewRows: previewRows.slice(0, 50),
    transactions
  };
}

export async function importSpreadsheetAnalysis(analysis: ImportAnalysis) {
  if (!analysis.canImport) {
    throw new Error("この内容ではインポートできません。dry-run の結果を確認してください。");
  }

  const transactions = await createTransactionsBulk(
    analysis.transactions.map((transaction) => ({
      date: transaction.date,
      amount: transaction.amount,
      accountId: transaction.accountId ?? null,
      payee: transaction.payee ?? "",
      payeeDetail: transaction.payeeDetail ?? [],
      description: transaction.description ?? "",
      note: transaction.note ?? "",
      categoryPath: transaction.categoryPath ?? [],
      tags: transaction.tags ?? { project: [] },
      cardId: transaction.cardId ?? null,
      orderIndex: transaction.orderIndex ?? 0
    }))
  );

  return {
    importedCount: transactions.length,
    targetKind: analysis.targetKind,
    selectedSheetName: analysis.selectedSheetName,
    selectedProfile: analysis.selectedProfile
  };
}
