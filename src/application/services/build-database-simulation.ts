import Decimal from "decimal.js";
import { generateCardPaymentForecastEvents } from "@/src/domain/forecast/card-payment";
import { generateDailySpendForecastEvents } from "@/src/domain/forecast/daily-spend";
import { simulateRange } from "@/src/domain/simulation";
import type { SimulationEvent } from "@/src/domain/simulation/types";
import { appEnv } from "@/src/infrastructure/db/env";
import { loadSimulationSeedData } from "@/src/infrastructure/repositories/simulation-repository";

export type BuiltSimulation = {
  snapshots: ReturnType<typeof simulateRange>;
  source: "database" | "demo";
  startDate: string;
  endDate: string;
  forecastSummary: {
    settledThroughDate: string | null;
    firstForecastDate: string | null;
    forecastDays: number;
    dailySpendForecastCount: number;
    dailySpendForecastAverageAmount: string;
    cardPaymentForecastCount: number;
    cardPaymentForecastTotalAmount: string;
  };
};

export type BuildSimulationOptions = {
  excludedEventIds?: string[];
};

function getTagText(tags: Record<string, unknown>, key: string) {
  const values = tags[key];

  if (!Array.isArray(values) || values.length === 0) {
    return "";
  }

  return values.filter((value): value is string => typeof value === "string").join(", ");
}

function compactJsonPath(path: unknown, separator = " / ") {
  if (!Array.isArray(path) || path.length === 0) {
    return "";
  }

  return path.filter((value): value is string => typeof value === "string").join(separator);
}

function compactDetail(parts: Array<string | null | undefined>) {
  return parts.map((part) => part?.trim()).filter(Boolean).join(" / ");
}

function sumInitialBalances(
  accounts: Awaited<ReturnType<typeof loadSimulationSeedData>>["accounts"]
) {
  return accounts.reduce((total, account) => {
    if (account.type === "credit") {
      return total;
    }

    return total.plus(new Decimal(account.initial_balance));
  }, new Decimal(0));
}

function mapEvents(data: Awaited<ReturnType<typeof loadSimulationSeedData>>) {
  const events: SimulationEvent[] = [];

  for (const transaction of data.transactions) {
    events.push({
      id: transaction.id,
      date: transaction.date,
      kind: "transaction",
      amount: transaction.amount,
      orderIndex: transaction.order_index,
      accountId: transaction.account_id,
      cardId: transaction.card_id,
      source: "actual",
      label: transaction.description || transaction.payee || "実績",
      detail:
        compactDetail([
          transaction.account_name,
          transaction.payee,
          compactJsonPath(transaction.payee_detail),
          compactJsonPath(transaction.category_path, " > "),
          getTagText(transaction.tags, "project"),
          transaction.note
        ]) || "transaction"
    });
  }

  for (const scheduledEvent of data.scheduledEvents) {
    events.push({
      id: scheduledEvent.id,
      date: scheduledEvent.start_date,
      kind: "scheduled-event",
      amount: scheduledEvent.amount,
      orderIndex: scheduledEvent.order_index,
      accountId: scheduledEvent.account_id,
      cardId: scheduledEvent.card_id,
      source: "actual",
      label: scheduledEvent.name,
      detail:
        compactDetail([
          scheduledEvent.account_name,
          scheduledEvent.recurrence_rule,
          getTagText(scheduledEvent.tags, "project"),
          getTagText(scheduledEvent.tags, "category")
        ]) || "scheduled event"
    });
  }

  for (const balanceEvent of data.balanceEvents) {
    events.push({
      id: balanceEvent.id,
      date: balanceEvent.date,
      kind: "balance-event",
      amount: balanceEvent.amount,
      orderIndex: balanceEvent.order_index,
      fromAccountId: balanceEvent.from_account_id,
      toAccountId: balanceEvent.to_account_id,
      source: "actual",
      label: balanceEvent.memo || "資金移動",
      detail:
        `${balanceEvent.from_account_name ?? "外部"} -> ${balanceEvent.to_account_name ?? "外部"}`
    });
  }

  for (const cardPayment of data.cardPayments) {
    events.push({
      id: cardPayment.id,
      date: cardPayment.date,
      kind: "card-payment",
      amount: cardPayment.amount,
      orderIndex: cardPayment.order_index,
      accountId: cardPayment.source_account_id,
      cardId: cardPayment.credit_card_id,
      source: "actual",
      label: cardPayment.memo || "カード引落",
      detail:
        compactDetail([cardPayment.credit_card_name, cardPayment.source_account_name]) ||
        "card payment"
    });
  }

  return events;
}

function buildForecastSummary(input: {
  transactions: Awaited<ReturnType<typeof loadSimulationSeedData>>["transactions"];
  dailySpendForecastEvents: SimulationEvent[];
  cardPaymentForecastEvents: SimulationEvent[];
}) {
  const settledThroughDate =
    [...input.transactions.map((transaction) => transaction.date)].sort().at(-1) ?? null;
  const forecastDates = [
    ...input.dailySpendForecastEvents.map((event) => event.date),
    ...input.cardPaymentForecastEvents.map((event) => event.date)
  ].sort();
  const dailySpendTotal = input.dailySpendForecastEvents.reduce(
    (sum, event) => sum.plus(new Decimal(event.amount).abs()),
    new Decimal(0)
  );
  const cardPaymentTotal = input.cardPaymentForecastEvents.reduce(
    (sum, event) => sum.plus(new Decimal(event.amount).abs()),
    new Decimal(0)
  );

  return {
    settledThroughDate,
    firstForecastDate: forecastDates[0] ?? null,
    forecastDays: new Set(forecastDates).size,
    dailySpendForecastCount: input.dailySpendForecastEvents.length,
    dailySpendForecastAverageAmount:
      input.dailySpendForecastEvents.length === 0
        ? "0.00"
        : dailySpendTotal.div(input.dailySpendForecastEvents.length).toFixed(2),
    cardPaymentForecastCount: input.cardPaymentForecastEvents.length,
    cardPaymentForecastTotalAmount: cardPaymentTotal.toFixed(2)
  };
}

export async function buildDatabaseSimulation(
  startDate = "2026-03-01",
  endDate = "2026-03-31",
  options?: BuildSimulationOptions
): Promise<BuiltSimulation> {
  const excludedEventIds = new Set(options?.excludedEventIds ?? []);
  const rawData = await loadSimulationSeedData(startDate, endDate);
  const data = {
    ...rawData,
    transactions: rawData.transactions.filter((item) => !excludedEventIds.has(item.id)),
    scheduledEvents: rawData.scheduledEvents.filter((item) => !excludedEventIds.has(item.id)),
    balanceEvents: rawData.balanceEvents.filter((item) => !excludedEventIds.has(item.id)),
    cardPayments: rawData.cardPayments.filter((item) => !excludedEventIds.has(item.id))
  };
  const initialBalance = sumInitialBalances(data.accounts);
  const defaultCardId =
    data.creditCards.find((creditCard) => creditCard.is_default)?.id ?? appEnv.DEFAULT_CARD_ID;
  const baseEvents = mapEvents(data);
  const dailySpendForecastEvents = generateDailySpendForecastEvents({
    startDate,
    endDate,
    transactions: data.transactions,
    defaultCardId
  });
  const cardPaymentForecastEvents = generateCardPaymentForecastEvents({
    startDate,
    endDate,
    defaultCardId,
    creditCards: data.creditCards,
    usageEvents: [
      ...data.transactions.map((transaction) => ({
        id: transaction.id,
        date: transaction.date,
        amount: transaction.amount,
        cardId: transaction.card_id
      })),
      ...data.scheduledEvents.map((scheduledEvent) => ({
        id: scheduledEvent.id,
        date: scheduledEvent.start_date,
        amount: scheduledEvent.amount,
        cardId: scheduledEvent.card_id
      })),
      ...dailySpendForecastEvents.map((forecast) => ({
        id: forecast.id,
        date: forecast.date,
        amount: forecast.amount,
        cardId: forecast.cardId ?? defaultCardId
      }))
    ],
    actualCardPayments: data.cardPayments
  }).map((event) => {
    const card = data.creditCards.find((creditCard) => creditCard.id === event.cardId);

    return {
      ...event,
      source: "forecast" as const,
      label: "カード引落予測",
      detail: card ? `${card.name} / 締日ベース` : "card payment forecast",
      basis: event.basis
    };
  });
  const decoratedDailySpendForecastEvents = dailySpendForecastEvents.map((event) => ({
    ...event,
    source: "forecast" as const,
    label: "日常支出予測",
    detail: "実績平均から生成",
    basis: event.basis
  }));

  const snapshots = simulateRange({
    startDate,
    endDate,
    threshold: String(appEnv.SHORT_THRESHOLD),
    defaultCardId,
    initialProjectedCash: initialBalance.toFixed(2),
    initialActualBalance: initialBalance.toFixed(2),
    initialPlannedOutflow: "0.00",
    liquidAccounts: data.accounts
      .filter(
        (account): account is (typeof data.accounts)[number] & { type: "cash" | "bank" } =>
          account.type === "cash" || account.type === "bank"
      )
      .map((account) => ({
        id: account.id,
        name: account.name,
        type: account.type,
        initialBalance: account.initial_balance
      })),
    events: [...baseEvents, ...decoratedDailySpendForecastEvents, ...cardPaymentForecastEvents]
  });

  return {
    snapshots,
    source: "database",
    startDate,
    endDate,
    forecastSummary: buildForecastSummary({
      transactions: data.transactions,
      dailySpendForecastEvents: decoratedDailySpendForecastEvents,
      cardPaymentForecastEvents
    })
  };
}
