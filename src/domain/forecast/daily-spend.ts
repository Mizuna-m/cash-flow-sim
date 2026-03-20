import Decimal from "decimal.js";
import type { SimulationEvent } from "@/src/domain/simulation/types";

type TransactionSeed = {
  id: string;
  date: string;
  amount: string;
  tags: Record<string, unknown>;
  card_id: string | null;
};

function enumerateDates(startDate: string, endDate: string) {
  const dates: string[] = [];
  const cursor = new Date(`${startDate}T00:00:00Z`);
  const end = new Date(`${endDate}T00:00:00Z`);

  while (cursor <= end) {
    dates.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return dates;
}

function hasProjectTag(tags: Record<string, unknown>) {
  const project = tags.project;
  return Array.isArray(project) && project.length > 0;
}

function pickBaselineExpense(transactions: TransactionSeed[]) {
  const routineExpenses = transactions.filter((transaction) => {
    const amount = new Decimal(transaction.amount);
    return (
      amount.isNegative() &&
      amount.abs().lessThanOrEqualTo(10000) &&
      !hasProjectTag(transaction.tags)
    );
  });

  if (routineExpenses.length === 0) {
    return new Decimal(0);
  }

  const total = routineExpenses.reduce(
    (sum, transaction) => sum.plus(new Decimal(transaction.amount).abs()),
    new Decimal(0)
  );

  return total.div(routineExpenses.length).toDecimalPlaces(2);
}

export function generateDailySpendForecastEvents(input: {
  startDate: string;
  endDate: string;
  transactions: TransactionSeed[];
  defaultCardId: string;
}): SimulationEvent[] {
  const actualTransactionDates = new Set(input.transactions.map((transaction) => transaction.date));
  const latestActualDate = [...actualTransactionDates].sort().at(-1);
  const baselineExpense = pickBaselineExpense(input.transactions);

  if (!latestActualDate || baselineExpense.lessThanOrEqualTo(0)) {
    return [];
  }

  return enumerateDates(input.startDate, input.endDate)
    .filter((date) => date > latestActualDate && !actualTransactionDates.has(date))
    .map((date, index) => ({
      id: `daily-spend-forecast:${date}`,
      date,
      kind: "daily-spend-forecast" as const,
      amount: baselineExpense.negated().toFixed(2),
      orderIndex: 9000 + index,
      cardId: input.defaultCardId
    }));
}
