import test from "node:test";
import assert from "node:assert/strict";
import { simulateRange, sortSimulationEvents } from "@/src/domain/simulation";
import type { SimulationEvent } from "@/src/domain/simulation/types";

test("sortSimulationEvents sorts by date then order index then id", () => {
  const input: SimulationEvent[] = [
    { id: "b", date: "2026-03-03", kind: "transaction", amount: "-50", orderIndex: 2 },
    { id: "a", date: "2026-03-03", kind: "transaction", amount: "-10", orderIndex: 1 },
    { id: "c", date: "2026-03-02", kind: "transaction", amount: "100", orderIndex: 5 }
  ];

  assert.deepEqual(
    sortSimulationEvents(input).map((event) => event.id),
    ["c", "a", "b"]
  );
});

test("simulateRange tracks theoretical, actual, and card balances across days", () => {
  const snapshots = simulateRange({
    startDate: "2026-03-01",
    endDate: "2026-03-04",
    threshold: "0",
    defaultCardId: "default-card",
    initialTheoreticalBalance: "1000",
    initialActualBalance: "1000",
    liquidAccounts: [
      {
        id: "main-bank",
        name: "Main Bank",
        type: "bank",
        initialBalance: "1000"
      }
    ],
    events: [
      {
        id: "salary",
        date: "2026-03-01",
        kind: "transaction",
        amount: "200",
        orderIndex: 1,
        accountId: "main-bank"
      },
      {
        id: "groceries",
        date: "2026-03-02",
        kind: "transaction",
        amount: "-80",
        orderIndex: 1,
        accountId: "main-bank"
      },
      {
        id: "rent",
        date: "2026-03-03",
        kind: "scheduled-event",
        amount: "-300",
        orderIndex: 1,
        cardId: "main-card"
      },
      {
        id: "card-payment",
        date: "2026-03-04",
        kind: "card-payment-forecast",
        amount: "380",
        orderIndex: 1,
        cardId: "main-card",
        accountId: "main-bank"
      }
    ]
  });

  assert.equal(snapshots[0]?.theoreticalBalance, "1200.00");
  assert.equal(snapshots[0]?.actualBalance, "1200.00");

  assert.equal(snapshots[1]?.theoreticalBalance, "1120.00");
  assert.equal(snapshots[1]?.actualBalance, "1120.00");
  assert.deepEqual(snapshots[1]?.cardBalances, {});
  assert.deepEqual(snapshots[1]?.liquidAccountBalances, [
    {
      accountId: "main-bank",
      name: "Main Bank",
      type: "bank",
      balance: "1120.00"
    }
  ]);
  assert.deepEqual(snapshots[1]?.eventSummary, {
    totalCount: 1,
    actualCount: 1,
    forecastCount: 0,
    actualAmount: "-80.00",
    forecastAmount: "0.00",
    kinds: ["transaction"]
  });
  assert.deepEqual(snapshots[1]?.events, [
    {
      id: "groceries",
      kind: "transaction",
      source: "actual",
      label: "transaction",
      detail: "",
      amount: "-80.00",
      orderIndex: 1,
      cardId: "default-card",
      basis: undefined
    }
  ]);

  assert.equal(snapshots[2]?.theoreticalBalance, "820.00");
  assert.equal(snapshots[2]?.actualBalance, "1120.00");
  assert.deepEqual(snapshots[2]?.cardBalances, {
    "main-card": "300.00"
  });

  assert.equal(snapshots[3]?.theoreticalBalance, "820.00");
  assert.equal(snapshots[3]?.actualBalance, "740.00");
  assert.equal(snapshots[3]?.short, false);
  assert.deepEqual(snapshots[3]?.cardBalances, {
    "main-card": "-80.00"
  });
  assert.deepEqual(snapshots[3]?.eventSummary, {
    totalCount: 1,
    actualCount: 0,
    forecastCount: 1,
    actualAmount: "0.00",
    forecastAmount: "380.00",
    kinds: ["card-payment-forecast"]
  });
  assert.deepEqual(snapshots[3]?.events, [
    {
      id: "card-payment",
      kind: "card-payment-forecast",
      source: "forecast",
      label: "card-payment-forecast",
      detail: "",
      amount: "380.00",
      orderIndex: 1,
      cardId: "main-card",
      basis: undefined
    }
  ]);
});

test("simulateRange does not change aggregate actual balance for balance-event transfers", () => {
  const snapshots = simulateRange({
    startDate: "2026-03-01",
    endDate: "2026-03-01",
    threshold: "0",
    defaultCardId: "default-card",
    initialTheoreticalBalance: "1000",
    initialActualBalance: "1000",
    liquidAccounts: [
      {
        id: "main-bank",
        name: "Main Bank",
        type: "bank",
        initialBalance: "1000"
      },
      {
        id: "wallet",
        name: "Wallet",
        type: "cash",
        initialBalance: "0"
      }
    ],
    events: [
      {
        id: "transfer",
        date: "2026-03-01",
        kind: "balance-event",
        amount: "100",
        orderIndex: 1,
        fromAccountId: "main-bank",
        toAccountId: "wallet"
      }
    ]
  });

  assert.equal(snapshots[0]?.theoreticalBalance, "1000.00");
  assert.equal(snapshots[0]?.actualBalance, "1000.00");
  assert.deepEqual(snapshots[0]?.liquidAccountBalances, [
    {
      accountId: "main-bank",
      name: "Main Bank",
      type: "bank",
      balance: "900.00"
    },
    {
      accountId: "wallet",
      name: "Wallet",
      type: "cash",
      balance: "100.00"
    }
  ]);
  assert.deepEqual(snapshots[0]?.eventSummary, {
    totalCount: 1,
    actualCount: 1,
    forecastCount: 0,
    actualAmount: "100.00",
    forecastAmount: "0.00",
    kinds: ["balance-event"]
  });
  assert.equal(snapshots[0]?.events[0]?.kind, "balance-event");
});
