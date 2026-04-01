import { buildDatabaseSimulation } from "@/src/application/services/build-database-simulation";
import { buildDefaultRange } from "@/src/lib/date-range";
import type { DashboardPayload } from "@/src/lib/openapi-contract";
import { appEnv } from "@/src/infrastructure/db/env";
import { listAccounts } from "@/src/infrastructure/repositories/account-repository";
import { listBalanceEvents } from "@/src/infrastructure/repositories/balance-event-repository";
import { listCardPayments } from "@/src/infrastructure/repositories/card-payment-repository";
import { listCreditCards } from "@/src/infrastructure/repositories/credit-card-repository";
import { listScheduledEvents } from "@/src/infrastructure/repositories/scheduled-event-repository";
import { listTransactions } from "@/src/infrastructure/repositories/transaction-repository";

export function getDefaultRange() {
  return buildDefaultRange(new Date("2026-03-21T00:00:00+09:00"));
}

export async function loadDashboardPayload(
  startDate: string,
  endDate: string
): Promise<DashboardPayload> {
  const [accounts, creditCards, transactions, scheduledEvents, balanceEvents, cardPayments] =
    await Promise.all([
      listAccounts().catch(() => []),
      listCreditCards().catch(() => []),
      listTransactions({ startDate, endDate }).catch(() => []),
      listScheduledEvents({ startDate, endDate }).catch(() => []),
      listBalanceEvents({ startDate, endDate }).catch(() => []),
      listCardPayments({ startDate, endDate }).catch(() => [])
    ]);

  const simulation = await buildDatabaseSimulation(startDate, endDate).catch(() => ({
    snapshots: [],
    source: "demo" as const,
    startDate,
    endDate,
    forecastSummary: {
      settledThroughDate: null,
      firstForecastDate: null,
      forecastDays: 0,
      dailySpendForecastCount: 0,
      dailySpendForecastAverageAmount: "0.00",
      cardPaymentForecastCount: 0,
      cardPaymentForecastTotalAmount: "0.00"
    }
  }));

  return {
    accounts,
    creditCards,
    transactions,
    scheduledEvents,
    balanceEvents,
    cardPayments,
    simulation,
    health: {
      status: "ok",
      baseCurrency: appEnv.BASE_CURRENCY,
      defaultCardId: creditCards.find((card) => card.isDefault)?.id ?? appEnv.DEFAULT_CARD_ID
    }
  };
}
