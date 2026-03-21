import Decimal from "decimal.js";
import type { SimulationEvent } from "@/src/domain/simulation/types";

type CardConfig = {
  id: string;
  closing_day: number;
  payment_day: number;
  settlement_account_id: string | null;
};

type UsageEvent = {
  id: string;
  date: string;
  amount: string;
  cardId: string | null;
};

type ActualCardPayment = {
  date: string;
  credit_card_id: string;
};

function parseDate(value: string) {
  return new Date(`${value}T00:00:00Z`);
}

function formatDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function shiftMonth(date: Date, delta: number) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + delta, 1));
}

function daysInMonth(year: number, monthIndex: number) {
  return new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
}

function clampDay(year: number, monthIndex: number, day: number) {
  return Math.min(day, daysInMonth(year, monthIndex));
}

function computeClosingDate(usageDate: string, closingDay: number) {
  const date = parseDate(usageDate);
  const year = date.getUTCFullYear();
  const monthIndex = date.getUTCMonth();
  const currentClosing = new Date(
    Date.UTC(year, monthIndex, clampDay(year, monthIndex, closingDay))
  );

  if (date <= currentClosing) {
    return currentClosing;
  }

  const nextMonth = shiftMonth(currentClosing, 1);
  return new Date(
    Date.UTC(
      nextMonth.getUTCFullYear(),
      nextMonth.getUTCMonth(),
      clampDay(nextMonth.getUTCFullYear(), nextMonth.getUTCMonth(), closingDay)
    )
  );
}

function computePaymentDate(closingDate: Date, paymentDay: number) {
  const paymentMonth = shiftMonth(closingDate, 1);
  return new Date(
    Date.UTC(
      paymentMonth.getUTCFullYear(),
      paymentMonth.getUTCMonth(),
      clampDay(paymentMonth.getUTCFullYear(), paymentMonth.getUTCMonth(), paymentDay)
    )
  );
}

export function generateCardPaymentForecastEvents(input: {
  startDate: string;
  endDate: string;
  defaultCardId: string;
  creditCards: CardConfig[];
  usageEvents: UsageEvent[];
  actualCardPayments: ActualCardPayment[];
}): SimulationEvent[] {
  const cardById = new Map(input.creditCards.map((card) => [card.id, card]));
  const actualPaymentKeys = new Set(
    input.actualCardPayments.map((payment) => `${payment.credit_card_id}:${payment.date}`)
  );
  const grouped = new Map<string, Decimal>();
  const groupedUsageIds = new Map<string, string[]>();

  for (const usageEvent of input.usageEvents) {
    const amount = new Decimal(usageEvent.amount);

    if (amount.greaterThanOrEqualTo(0)) {
      continue;
    }

    const resolvedCardId = usageEvent.cardId ?? input.defaultCardId;
    const card = cardById.get(resolvedCardId);

    if (!card) {
      continue;
    }

    const closingDate = computeClosingDate(usageEvent.date, card.closing_day);
    const paymentDate = formatDate(computePaymentDate(closingDate, card.payment_day));

    if (paymentDate < input.startDate || paymentDate > input.endDate) {
      continue;
    }

    const key = `${resolvedCardId}:${paymentDate}`;
    const current = grouped.get(key) ?? new Decimal(0);
    grouped.set(key, current.plus(amount.abs()));
    const ids = groupedUsageIds.get(key) ?? [];
    ids.push(usageEvent.id);
    groupedUsageIds.set(key, ids);
  }

  return [...grouped.entries()]
    .filter(([key, amount]) => amount.greaterThan(0) && !actualPaymentKeys.has(key))
    .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey))
    .map(([key, amount], index) => {
      const [cardId, paymentDate] = key.split(":");

      return {
        id: `card-payment-forecast:${cardId}:${paymentDate}`,
        date: paymentDate,
        kind: "card-payment-forecast" as const,
        amount: amount.toFixed(2),
        orderIndex: 9500 + index,
        cardId,
        accountId: cardById.get(cardId)?.settlement_account_id ?? null,
        basis: {
          sourceEventIds: groupedUsageIds.get(key) ?? [],
          summary: `${(groupedUsageIds.get(key) ?? []).length}件のカード利用を集計`
        }
      };
    });
}
