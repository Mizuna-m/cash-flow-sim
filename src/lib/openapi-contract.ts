export type JsonTags = Record<string, unknown>;

export type AccountType = "cash" | "bank" | "credit" | "loan" | "investment";

export type Account = {
  id: string;
  name: string;
  type: AccountType;
  currency: string;
  initialBalance: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CreditCard = {
  id: string;
  name: string;
  closingDay: number;
  paymentDay: number;
  settlementAccountId: string | null;
  currency: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CreditCardCreateRequest = {
  name: string;
  closingDay: number;
  paymentDay: number;
  settlementAccountId?: string | null;
  currency: string;
  isDefault?: boolean;
};

export type Transaction = {
  id: string;
  date: string;
  amount: string;
  tags: JsonTags;
  cardId: string | null;
  memo: string;
  orderIndex: number;
  createdAt: string;
  updatedAt: string;
};

export type ScheduledEvent = {
  id: string;
  name: string;
  startDate: string;
  endDate: string | null;
  recurrenceRule: string | null;
  amount: string;
  tags: JsonTags;
  cardId: string | null;
  isActive: boolean;
  orderIndex: number;
  createdAt: string;
  updatedAt: string;
};

export type BalanceEvent = {
  id: string;
  date: string;
  fromAccountId: string | null;
  toAccountId: string | null;
  amount: string;
  memo: string;
  orderIndex: number;
  createdAt: string;
  updatedAt: string;
};

export type CardPayment = {
  id: string;
  creditCardId: string;
  sourceAccountId: string | null;
  date: string;
  amount: string;
  memo: string;
  orderIndex: number;
  createdAt: string;
  updatedAt: string;
};

export type SimulationEventKind =
  | "transaction"
  | "balance-event"
  | "scheduled-event"
  | "daily-spend-forecast"
  | "card-payment"
  | "card-payment-forecast";

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
  eventSummary: DailyEventSummary;
  events: DailyEventExplanation[];
};

export type ForecastSummary = {
  actualsThroughDate: string | null;
  firstForecastDate: string | null;
  forecastDays: number;
  dailySpendForecastCount: number;
  dailySpendForecastAverageAmount: string;
  cardPaymentForecastCount: number;
  cardPaymentForecastTotalAmount: string;
};

export type SimulationResponse = {
  snapshots: DailySimulationSnapshot[];
  source: "database" | "demo";
  startDate: string;
  endDate: string;
  forecastSummary: ForecastSummary;
};

export type SimulationComparisonScenarioRequest = {
  id: string;
  label: string;
  detail?: string;
  excludedEventIds: string[];
};

export type SimulationComparisonScenarioResult = {
  id: string;
  label: string;
  detail: string;
  excludedEventIds: string[];
  simulation: SimulationResponse;
  diff: {
    shortCountDelta: number;
    projectedShortCountDelta: number;
    lowestTheoreticalBalanceDelta: string;
    lowestActualBalanceDelta: string;
    endingTheoreticalBalanceDelta: string;
    endingActualBalanceDelta: string;
  };
};

export type SimulationComparisonResponse = {
  base: SimulationResponse;
  scenarios: SimulationComparisonScenarioResult[];
};

export type DashboardPayload = {
  accounts: Account[];
  creditCards: CreditCard[];
  transactions: Transaction[];
  scheduledEvents: ScheduledEvent[];
  balanceEvents: BalanceEvent[];
  cardPayments: CardPayment[];
  simulation: SimulationResponse;
  health: {
    status: "ok" | "error";
    baseCurrency: string;
    defaultCardId: string;
  };
};

export type AccountCreateRequest = {
  name: string;
  type: AccountType;
  currency: string;
  initialBalance: string;
};

export type TransactionCreateRequest = {
  date: string;
  amount: string;
  tags?: JsonTags;
  cardId?: string | null;
  memo?: string;
  orderIndex?: number;
};

export type ScheduledEventCreateRequest = {
  name: string;
  startDate: string;
  endDate?: string | null;
  recurrenceRule?: string | null;
  amount: string;
  tags?: JsonTags;
  cardId?: string | null;
  isActive?: boolean;
  orderIndex?: number;
};

export type ScheduledEventUpdateRequest = {
  isActive?: boolean;
};

export type BalanceEventCreateRequest = {
  date: string;
  fromAccountId?: string | null;
  toAccountId?: string | null;
  amount: string;
  memo?: string;
  orderIndex?: number;
};

export type CardPaymentCreateRequest = {
  creditCardId: string;
  sourceAccountId?: string | null;
  date: string;
  amount: string;
  memo?: string;
  orderIndex?: number;
};
