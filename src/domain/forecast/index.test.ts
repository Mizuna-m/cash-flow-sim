import test from "node:test";
import assert from "node:assert/strict";
import { generateDailySpendForecastEvents } from "@/src/domain/forecast/daily-spend";
import { generateCardPaymentForecastEvents } from "@/src/domain/forecast/card-payment";

test("generateDailySpendForecastEvents creates future forecasts from routine spending", () => {
  const events = generateDailySpendForecastEvents({
    startDate: "2026-03-01",
    endDate: "2026-03-05",
    defaultCardId: "default-card",
    transactions: [
      {
        id: "1",
        date: "2026-03-01",
        amount: "-1200",
        tags: { category: ["食費"], project: [] },
        card_id: null
      },
      {
        id: "2",
        date: "2026-03-02",
        amount: "-1800",
        tags: { category: ["食費"], project: [] },
        card_id: null
      }
    ]
  });

  assert.deepEqual(
    events.map((event) => [event.date, event.amount]),
    [
      ["2026-03-03", "-1500.00"],
      ["2026-03-04", "-1500.00"],
      ["2026-03-05", "-1500.00"]
    ]
  );
  assert.deepEqual(events[0]?.basis, {
    sourceEventIds: ["1", "2"],
    summary: "2件の通常支出平均"
  });
});

test("generateCardPaymentForecastEvents groups usage by card closing period", () => {
  const events = generateCardPaymentForecastEvents({
    startDate: "2026-03-01",
    endDate: "2026-05-31",
    defaultCardId: "default-card",
    creditCards: [
      {
        id: "default-card",
        closing_day: 25,
        payment_day: 10
      }
    ],
    usageEvents: [
      { id: "u1", date: "2026-03-05", amount: "-1200", cardId: null },
      { id: "u2", date: "2026-03-24", amount: "-3000", cardId: "default-card" },
      { id: "u3", date: "2026-03-26", amount: "-2000", cardId: "default-card" }
    ],
    actualCardPayments: []
  });

  assert.deepEqual(
    events.map((event) => [event.date, event.amount]),
    [
      ["2026-04-10", "4200.00"],
      ["2026-05-10", "2000.00"]
    ]
  );
  assert.deepEqual(events[0]?.basis, {
    sourceEventIds: ["u1", "u2"],
    summary: "2件のカード利用を集計"
  });
});
