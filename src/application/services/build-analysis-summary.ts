import Decimal from "decimal.js";
import type { TransactionRecord } from "@/src/infrastructure/repositories/transaction-repository";

type MonthlyBucket = {
  month: string;
  income: string;
  expense: string;
  net: string;
};

export type AnalysisRow = {
  key: string;
  label: string;
  income: string;
  expense: string;
  net: string;
  count: number;
  monthly: MonthlyBucket[];
};

export type AnalysisSummary = {
  startDate: string;
  endDate: string;
  months: string[];
  totals: {
    income: string;
    expense: string;
    net: string;
    count: number;
  };
  projects: AnalysisRow[];
  categories: AnalysisRow[];
  groups: AnalysisRow[];
};

type MutableSummary = {
  label: string;
  income: Decimal;
  expense: Decimal;
  net: Decimal;
  count: number;
  months: Map<string, { income: Decimal; expense: Decimal; net: Decimal }>;
};

function getProjectLabel(tags: Record<string, unknown>) {
  const value = tags.project;

  if (Array.isArray(value)) {
    const first = value.find((item) => typeof item === "string" && item.trim().length > 0);
    return typeof first === "string" ? first : "未設定";
  }

  if (typeof value === "string" && value.trim().length > 0) {
    return value;
  }

  return "未設定";
}

function getCategoryLabel(path: string[]) {
  return path.length > 0 ? path.join(" > ") : "未分類";
}

function getGroupLabel(path: string[]) {
  return path[0] ?? "未分類";
}

function getMonthKey(date: string) {
  return date.slice(0, 7);
}

function ensureSummary(map: Map<string, MutableSummary>, key: string, label: string, months: string[]) {
  let summary = map.get(key);

  if (!summary) {
    summary = {
      label,
      income: new Decimal(0),
      expense: new Decimal(0),
      net: new Decimal(0),
      count: 0,
      months: new Map(
        months.map((month) => [month, { income: new Decimal(0), expense: new Decimal(0), net: new Decimal(0) }])
      )
    };
    map.set(key, summary);
  }

  return summary;
}

function applyAmount(summary: MutableSummary, month: string, rawAmount: string) {
  const amount = new Decimal(rawAmount);
  const bucket = summary.months.get(month);

  summary.count += 1;
  summary.net = summary.net.plus(amount);

  if (amount.greaterThanOrEqualTo(0)) {
    summary.income = summary.income.plus(amount);
    bucket?.income && (bucket.income = bucket.income.plus(amount));
  } else {
    const expense = amount.abs();
    summary.expense = summary.expense.plus(expense);
    bucket?.expense && (bucket.expense = bucket.expense.plus(expense));
  }

  if (bucket) {
    bucket.net = bucket.net.plus(amount);
  }
}

function finalizeRows(source: Map<string, MutableSummary>, months: string[]) {
  return [...source.entries()]
    .map(([key, summary]) => ({
      key,
      label: summary.label,
      income: summary.income.toFixed(2),
      expense: summary.expense.toFixed(2),
      net: summary.net.toFixed(2),
      count: summary.count,
      monthly: months.map((month) => {
        const bucket = summary.months.get(month);

        return {
          month,
          income: bucket?.income.toFixed(2) ?? "0.00",
          expense: bucket?.expense.toFixed(2) ?? "0.00",
          net: bucket?.net.toFixed(2) ?? "0.00"
        };
      })
    }))
    .sort((left, right) => {
      const leftMagnitude = Decimal.max(new Decimal(left.income), new Decimal(left.expense));
      const rightMagnitude = Decimal.max(new Decimal(right.income), new Decimal(right.expense));
      const byMagnitude = rightMagnitude.comparedTo(leftMagnitude);

      if (byMagnitude !== 0) {
        return byMagnitude;
      }

      return left.label.localeCompare(right.label, "ja");
    });
}

function collectMonths(transactions: TransactionRecord[]) {
  return [...new Set(transactions.map((transaction) => getMonthKey(transaction.date)))].sort();
}

export function buildAnalysisSummary(input: {
  startDate: string;
  endDate: string;
  transactions: TransactionRecord[];
}): AnalysisSummary {
  const months = collectMonths(input.transactions);
  const projectMap = new Map<string, MutableSummary>();
  const categoryMap = new Map<string, MutableSummary>();
  const groupMap = new Map<string, MutableSummary>();
  const totals = {
    income: new Decimal(0),
    expense: new Decimal(0),
    net: new Decimal(0),
    count: input.transactions.length
  };

  for (const transaction of input.transactions) {
    const month = getMonthKey(transaction.date);
    const projectLabel = getProjectLabel(transaction.tags);
    const categoryLabel = getCategoryLabel(transaction.categoryPath);
    const groupLabel = getGroupLabel(transaction.categoryPath);
    const amount = new Decimal(transaction.amount);

    applyAmount(ensureSummary(projectMap, projectLabel, projectLabel, months), month, transaction.amount);
    applyAmount(ensureSummary(categoryMap, categoryLabel, categoryLabel, months), month, transaction.amount);
    applyAmount(ensureSummary(groupMap, groupLabel, groupLabel, months), month, transaction.amount);

    totals.net = totals.net.plus(amount);

    if (amount.greaterThanOrEqualTo(0)) {
      totals.income = totals.income.plus(amount);
    } else {
      totals.expense = totals.expense.plus(amount.abs());
    }
  }

  return {
    startDate: input.startDate,
    endDate: input.endDate,
    months,
    totals: {
      income: totals.income.toFixed(2),
      expense: totals.expense.toFixed(2),
      net: totals.net.toFixed(2),
      count: totals.count
    },
    projects: finalizeRows(projectMap, months),
    categories: finalizeRows(categoryMap, months),
    groups: finalizeRows(groupMap, months)
  };
}
