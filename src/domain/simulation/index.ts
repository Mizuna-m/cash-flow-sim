import Decimal from "decimal.js";
import {
  type DailySimulationSnapshot,
  type SimulationEvent,
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

function applyEvent(
  event: SimulationEvent,
  theoreticalBalance: Decimal,
  actualBalance: Decimal,
  cardBalances: Map<string, Decimal>,
  defaultCardId: string
) {
  const amount = new Decimal(event.amount);
  const cardId = event.cardId ?? defaultCardId;

  switch (event.kind) {
    case "transaction":
      if (amount.isNegative()) {
        theoreticalBalance = theoreticalBalance.plus(amount);
        incrementCardBalance(cardBalances, cardId, amount.abs());
      } else {
        theoreticalBalance = theoreticalBalance.plus(amount);
        actualBalance = actualBalance.plus(amount);
      }
      break;
    case "scheduled-event":
    case "daily-spend-forecast":
      theoreticalBalance = theoreticalBalance.plus(amount);
      incrementCardBalance(cardBalances, cardId, amount.abs());
      break;
    case "card-payment":
    case "card-payment-forecast":
      actualBalance = actualBalance.minus(amount.abs());
      incrementCardBalance(cardBalances, cardId, amount.abs().negated());
      break;
    case "balance-event":
      break;
    default:
      break;
  }

  return {
    theoreticalBalance,
    actualBalance
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

export function simulateRange(input: SimulationInput): DailySimulationSnapshot[] {
  const threshold = new Decimal(input.threshold);
  let theoreticalBalance = new Decimal(input.initialTheoreticalBalance);
  let actualBalance = new Decimal(input.initialActualBalance);
  const cardBalances = new Map<string, Decimal>();
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
        theoreticalBalance,
        actualBalance,
        cardBalances,
        input.defaultCardId
      );
      theoreticalBalance = next.theoreticalBalance;
      actualBalance = next.actualBalance;
    }

    return {
      date,
      theoreticalBalance: theoreticalBalance.toFixed(2),
      actualBalance: actualBalance.toFixed(2),
      short: actualBalance.lessThan(threshold),
      cardBalances: formatCardBalances(cardBalances)
    };
  });
}
