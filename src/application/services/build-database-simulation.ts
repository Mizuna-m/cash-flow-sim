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
    actualsThroughDate: string | null;
    firstForecastDate: string | null;
    forecastDays: number;
    dailySpendForecastCount: number;
    dailySpendForecastAverageAmount: string;
    cardPaymentForecastCount: number;
    cardPaymentForecastTotalAmount: string;
  };
};

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
      cardId: transaction.card_id
    });
  }

  for (const scheduledEvent of data.scheduledEvents) {
    events.push({
      id: scheduledEvent.id,
      date: scheduledEvent.start_date,
      kind: "scheduled-event",
      amount: scheduledEvent.amount,
      orderIndex: scheduledEvent.order_index,
      cardId: scheduledEvent.card_id
    });
  }

  for (const balanceEvent of data.balanceEvents) {
    events.push({
      id: balanceEvent.id,
      date: balanceEvent.date,
      kind: "balance-event",
      amount: balanceEvent.amount,
      orderIndex: balanceEvent.order_index
    });
  }

  for (const cardPayment of data.cardPayments) {
    events.push({
      id: cardPayment.id,
      date: cardPayment.date,
      kind: "card-payment",
      amount: cardPayment.amount,
      orderIndex: cardPayment.order_index,
      cardId: cardPayment.credit_card_id
    });
  }

  return events;
}

function buildForecastSummary(input: {
  transactions: Awaited<ReturnType<typeof loadSimulationSeedData>>["transactions"];
  dailySpendForecastEvents: SimulationEvent[];
  cardPaymentForecastEvents: SimulationEvent[];
}) {
  const actualsThroughDate =
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
    actualsThroughDate,
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
  endDate = "2026-03-31"
): Promise<BuiltSimulation> {
  const data = await loadSimulationSeedData(startDate, endDate);
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
  });

  const snapshots = simulateRange({
    startDate,
    endDate,
    threshold: String(appEnv.SHORT_THRESHOLD),
    defaultCardId,
    initialTheoreticalBalance: initialBalance.toFixed(2),
    initialActualBalance: initialBalance.toFixed(2),
    events: [...baseEvents, ...dailySpendForecastEvents, ...cardPaymentForecastEvents]
  });

  return {
    snapshots,
    source: "database",
    startDate,
    endDate,
    forecastSummary: buildForecastSummary({
      transactions: data.transactions,
      dailySpendForecastEvents,
      cardPaymentForecastEvents
    })
  };
}
