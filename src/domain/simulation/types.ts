export type SimulationEventKind =
  | "transaction"
  | "balance-event"
  | "scheduled-event"
  | "daily-spend-forecast"
  | "card-payment"
  | "card-payment-forecast";

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
  actualCount: number;
  forecastCount: number;
  actualAmount: string;
  forecastAmount: string;
  kinds: SimulationEventKind[];
};

export type DailyEventExplanation = {
  id: string;
  kind: SimulationEventKind;
  source: "actual" | "forecast";
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
  theoreticalBalance: string;
  actualBalance: string;
  short: boolean;
  cardBalances: Record<string, string>;
  liquidAccountBalances: Array<{
    accountId: string;
    name: string;
    type: "cash" | "bank";
    balance: string;
  }>;
  negativeLiquidAccountIds: string[];
  eventSummary: DailyEventSummary;
  events: DailyEventExplanation[];
};

export type SimulationInput = {
  startDate: string;
  endDate: string;
  threshold: string;
  defaultCardId: string;
  initialTheoreticalBalance: string;
  initialActualBalance: string;
  liquidAccounts: Array<{
    id: string;
    name: string;
    type: "cash" | "bank";
    initialBalance: string;
  }>;
  events: SimulationEvent[];
};
