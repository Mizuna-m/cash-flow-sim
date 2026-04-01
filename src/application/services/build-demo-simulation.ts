import { simulateRange } from "@/src/domain/simulation";

export function buildDemoSimulation() {
  return simulateRange({
    startDate: "2026-03-01",
    endDate: "2026-03-06",
    threshold: "0",
    defaultCardId: "default-card",
    initialProjectedCash: "1000",
    initialActualBalance: "1000",
    initialPlannedOutflow: "0",
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
        id: "travel",
        date: "2026-03-03",
        kind: "scheduled-event",
        amount: "-300",
        orderIndex: 1,
        cardId: "main-card"
      },
      {
        id: "forecast",
        date: "2026-03-05",
        kind: "daily-spend-forecast",
        amount: "-40",
        orderIndex: 1
      },
      {
        id: "card-payment",
        date: "2026-03-06",
        kind: "card-payment-forecast",
        amount: "380",
        orderIndex: 1,
        cardId: "main-card",
        accountId: "main-bank"
      }
    ]
  });
}
