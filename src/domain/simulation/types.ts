export type SimulationEventKind =
  | "transaction"
  | "balance-event"
  | "scheduled-event"
  | "daily-spend-forecast"
  | "card-payment"
  | "card-payment-forecast";

export type SimulationLifecycle = "planned" | "confirmed" | "settled";

export type SimulationEvent = {
  id: string;
  date: string;
  kind: SimulationEventKind;
  amount: string;
  orderIndex: number;
  cardId?: string | null;
  accountId?: string | null;
  fromAccountId?: string | null;
  toAccountId?: string | null;
  source?: "actual" | "forecast";
  label?: string;
  detail?: string;
  basis?: {
    sourceEventIds: string[];
    summary: string;
  };
};

export type DailyEventSummary = {
  totalCount: number;
  plannedCount: number;
  confirmedCount: number;
  settledCount: number;
  plannedAmount: string;
  confirmedAmount: string;
  settledAmount: string;
  kinds: SimulationEventKind[];
};

export type DailyEventExplanation = {
  id: string;
  kind: SimulationEventKind;
  source: "actual" | "forecast";
  lifecycle: SimulationLifecycle;
  label: string;
  detail: string;
  amount: string;
  orderIndex: number;
  cardId: string | null;
  basis?: {
    sourceEventIds: string[];
    summary: string;
  };
};

export type DailySimulationSnapshot = {
  date: string;
  projectedCash: string;
  cash: string;
  plannedOutflow: string;
  short: boolean;
  cardDebt: Record<string, string>;
  cashByAccount: Array<{
    accountId: string;
    name: string;
    type: "cash" | "bank";
    balance: string;
  }>;
  negativeCashAccountIds: string[];
  eventSummary: DailyEventSummary;
  events: DailyEventExplanation[];
};

export type SimulationInput = {
  startDate: string;
  endDate: string;
  threshold: string;
  defaultCardId: string;
  initialProjectedCash: string;
  initialActualBalance: string;
  initialPlannedOutflow?: string;
  liquidAccounts: Array<{
    id: string;
    name: string;
    type: "cash" | "bank";
    initialBalance: string;
  }>;
  events: SimulationEvent[];
};
