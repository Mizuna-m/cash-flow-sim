import Decimal from "decimal.js";
import {
  type DailyEventExplanation,
  type DailyEventSummary,
  type DailySimulationSnapshot,
  type SimulationEvent,
  type SimulationLifecycle,
  type SimulationInput
} from "@/src/domain/simulation/types";

function compareEvents(left: SimulationEvent, right: SimulationEvent) {
  if (left.date !== right.date) {
    return left.date.localeCompare(right.date);
  }

  if (left.orderIndex !== right.orderIndex) {
    return left.orderIndex - right.orderIndex;
  }

  return left.id.localeCompare(right.id);
}

export function sortSimulationEvents(events: SimulationEvent[]) {
  return [...events].sort(compareEvents);
}

function incrementCardBalance(
  cardBalances: Map<string, Decimal>,
  cardId: string,
  amount: Decimal
) {
  const current = cardBalances.get(cardId) ?? new Decimal(0);
  cardBalances.set(cardId, current.plus(amount));
}

function formatCardBalances(cardBalances: Map<string, Decimal>) {
  return Object.fromEntries(
    [...cardBalances.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([cardId, amount]) => [cardId, amount.toFixed(2)])
  );
}

function incrementLiquidAccountBalance(
  balances: Map<string, Decimal>,
  accountId: string,
  amount: Decimal
) {
  const current = balances.get(accountId) ?? new Decimal(0);
  balances.set(accountId, current.plus(amount));
}

function formatLiquidAccountBalances(
  accountBalances: Map<string, Decimal>,
  liquidAccounts: SimulationInput["liquidAccounts"]
) {
  return liquidAccounts
    .map((account) => ({
      accountId: account.id,
      name: account.name,
      type: account.type,
      balance: (accountBalances.get(account.id) ?? new Decimal(account.initialBalance)).toFixed(2)
    }))
    .sort((left, right) => left.name.localeCompare(right.name));
}

function applyEvent(
  event: SimulationEvent,
  projectedCash: Decimal,
  cash: Decimal,
  plannedOutflow: Decimal,
  cardDebt: Map<string, Decimal>,
  cashByAccount: Map<string, Decimal>,
  defaultCardId: string
) {
  const amount = new Decimal(event.amount);
  const cardId = event.cardId ?? defaultCardId;

  switch (event.kind) {
    case "transaction":
      if (amount.isNegative()) {
        projectedCash = projectedCash.plus(amount);

        if (event.cardId) {
          incrementCardBalance(cardDebt, cardId, amount.abs());
        } else if (event.accountId) {
          cash = cash.plus(amount);
          incrementLiquidAccountBalance(cashByAccount, event.accountId, amount);
        }
      } else {
        projectedCash = projectedCash.plus(amount);
        cash = cash.plus(amount);

        if (event.accountId) {
          incrementLiquidAccountBalance(cashByAccount, event.accountId, amount);
        }
      }
      break;
    case "scheduled-event":
      projectedCash = projectedCash.plus(amount);

      if (amount.isNegative()) {
        plannedOutflow = plannedOutflow.plus(amount.abs());
      }
      break;
    case "daily-spend-forecast":
      projectedCash = projectedCash.plus(amount);
      plannedOutflow = plannedOutflow.plus(amount.abs());
      break;
    case "card-payment":
      cash = cash.minus(amount.abs());
      incrementCardBalance(cardDebt, cardId, amount.abs().negated());

      if (event.accountId) {
        incrementLiquidAccountBalance(cashByAccount, event.accountId, amount.abs().negated());
      }
      break;
    case "card-payment-forecast":
      projectedCash = projectedCash.minus(amount.abs());
      plannedOutflow = plannedOutflow.plus(amount.abs());
      break;
    case "balance-event":
      if (event.fromAccountId) {
        incrementLiquidAccountBalance(cashByAccount, event.fromAccountId, amount.negated());
      }
      if (event.toAccountId) {
        incrementLiquidAccountBalance(cashByAccount, event.toAccountId, amount);
      }
      break;
    default:
      break;
  }

  return {
    projectedCash,
    cash,
    plannedOutflow
  };
}

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

function isForecastEvent(kind: SimulationEvent["kind"]) {
  return kind === "daily-spend-forecast" || kind === "card-payment-forecast";
}

function resolveLifecycle(event: SimulationEvent): SimulationLifecycle {
  switch (event.kind) {
    case "scheduled-event":
    case "daily-spend-forecast":
    case "card-payment-forecast":
      return "planned";
    case "transaction":
      return Number(event.amount) < 0 && Boolean(event.cardId) ? "confirmed" : "settled";
    case "balance-event":
    case "card-payment":
    default:
      return "settled";
  }
}

function buildEmptySummary(): DailyEventSummary {
  return {
    totalCount: 0,
    plannedCount: 0,
    confirmedCount: 0,
    settledCount: 0,
    plannedAmount: "0.00",
    confirmedAmount: "0.00",
    settledAmount: "0.00",
    kinds: []
  };
}

function summarizeEvents(events: SimulationEvent[]): DailyEventSummary {
  if (events.length === 0) {
    return buildEmptySummary();
  }

  let plannedAmount = new Decimal(0);
  let confirmedAmount = new Decimal(0);
  let settledAmount = new Decimal(0);
  let plannedCount = 0;
  let confirmedCount = 0;
  let settledCount = 0;
  const kinds = new Set<SimulationEvent["kind"]>();

  for (const event of events) {
    const amount = new Decimal(event.amount);
    const lifecycle = resolveLifecycle(event);
    kinds.add(event.kind);

    if (lifecycle === "planned") {
      plannedCount += 1;
      plannedAmount = plannedAmount.plus(amount);
      continue;
    }

    if (lifecycle === "confirmed") {
      confirmedCount += 1;
      confirmedAmount = confirmedAmount.plus(amount);
      continue;
    }

    settledCount += 1;
    settledAmount = settledAmount.plus(amount);
  }

  return {
    totalCount: events.length,
    plannedCount,
    confirmedCount,
    settledCount,
    plannedAmount: plannedAmount.toFixed(2),
    confirmedAmount: confirmedAmount.toFixed(2),
    settledAmount: settledAmount.toFixed(2),
    kinds: [...kinds].sort(),
  };
}

function buildEventExplanations(
  events: SimulationEvent[],
  defaultCardId: string
): DailyEventExplanation[] {
  return events.map((event) => ({
    id: event.id,
    kind: event.kind,
    source: event.source ?? (isForecastEvent(event.kind) ? "forecast" : "actual"),
    lifecycle: resolveLifecycle(event),
    label: event.label ?? event.kind,
    detail: event.detail ?? "",
    amount: new Decimal(event.amount).toFixed(2),
    orderIndex: event.orderIndex,
    cardId: event.cardId ?? defaultCardId,
    basis: event.basis
  }));
}

export function simulateRange(input: SimulationInput): DailySimulationSnapshot[] {
  const threshold = new Decimal(input.threshold);
  let projectedCash = new Decimal(input.initialProjectedCash);
  let cash = new Decimal(input.initialActualBalance);
  let plannedOutflow = new Decimal(input.initialPlannedOutflow ?? "0");
  const cardDebt = new Map<string, Decimal>();
  const cashByAccount = new Map(
    input.liquidAccounts.map((account) => [account.id, new Decimal(account.initialBalance)])
  );
  const dailyEvents = new Map<string, SimulationEvent[]>();

  for (const event of sortSimulationEvents(input.events)) {
    const events = dailyEvents.get(event.date) ?? [];
    events.push(event);
    dailyEvents.set(event.date, events);
  }

  return enumerateDates(input.startDate, input.endDate).map((date) => {
    const events = dailyEvents.get(date) ?? [];

    for (const event of events) {
      const next = applyEvent(
        event,
        projectedCash,
        cash,
        plannedOutflow,
        cardDebt,
        cashByAccount,
        input.defaultCardId
      );
      projectedCash = next.projectedCash;
      cash = next.cash;
      plannedOutflow = next.plannedOutflow;
    }

    const cashByAccountSnapshot = formatLiquidAccountBalances(
      cashByAccount,
      input.liquidAccounts
    );
    const negativeCashAccountIds = cashByAccountSnapshot
      .filter((account) => new Decimal(account.balance).lessThan(0))
      .map((account) => account.accountId);

    return {
      date,
      projectedCash: projectedCash.toFixed(2),
      cash: cash.toFixed(2),
      plannedOutflow: plannedOutflow.toFixed(2),
      short: cash.lessThan(threshold) || negativeCashAccountIds.length > 0,
      cardDebt: formatCardBalances(cardDebt),
      cashByAccount: cashByAccountSnapshot,
      negativeCashAccountIds,
      eventSummary: summarizeEvents(events),
      events: buildEventExplanations(events, input.defaultCardId)
    };
  });
}
