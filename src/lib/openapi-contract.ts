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

export type CreditCardUpdateRequest = {
  name?: string;
  closingDay?: number;
  paymentDay?: number;
  settlementAccountId?: string | null;
  currency?: string;
  isDefault?: boolean;
};

export type Transaction = {
  id: string;
  date: string;
  amount: string;
  accountId: string | null;
  payee: string;
  payeeDetail: string[];
  description: string;
  note: string;
  categoryPath: string[];
  tags: JsonTags;
  cardId: string | null;
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
  accountId: string | null;
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

export type SimulationLifecycle = "planned" | "confirmed" | "settled";

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

export type ForecastSummary = {
  settledThroughDate: string | null;
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
    projectedNegativeDaysDelta: number;
    lowestProjectedCashDelta: string;
    lowestCashDelta: string;
    endingPlannedOutflowDelta: string;
    endingProjectedCashDelta: string;
    endingCashDelta: string;
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
  accountId?: string | null;
  payee?: string;
  payeeDetail?: string[];
  description?: string;
  note?: string;
  categoryPath?: string[];
  tags?: JsonTags;
  cardId?: string | null;
  orderIndex?: number;
};

export type ScheduledEventCreateRequest = {
  name: string;
  startDate: string;
  endDate?: string | null;
  recurrenceRule?: string | null;
  amount: string;
  accountId?: string | null;
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

export type SpreadsheetImportProfile =
  | "financial-analysis-expense"
  | "financial-analysis-income"
  | "financial-analysis-recurring";

export type SpreadsheetImportPreviewRow = {
  rowNumber: number;
  date: string;
  amount: string;
  payee: string;
  description: string;
  note: string;
  categoryPath: string[];
  project: string | null;
  accountId: string | null;
  cardId: string | null;
  suggestion: {
    accountId: string | null;
    cardId: string | null;
    categoryPath: string[];
    project: string | null;
    evidenceCount: number;
  } | null;
  appliedSuggestionFields: string[];
  raw: string[];
};

export type SpreadsheetImportIssue = {
  level: "warning" | "error";
  rowNumber?: number;
  message: string;
};

export type SpreadsheetImportPreview = {
  fileName: string;
  sheets: Array<{
    name: string;
    rowCount: number;
    suggestion: SpreadsheetImportProfile | null;
  }>;
  selectedSheetName: string | null;
  selectedProfile: SpreadsheetImportProfile | null;
  targetKind: "transaction";
  canImport: boolean;
  issues: SpreadsheetImportIssue[];
  previewRows: SpreadsheetImportPreviewRow[];
};

export type SpreadsheetImportResult = {
  importedCount: number;
  targetKind: "transaction";
  selectedSheetName: string | null;
  selectedProfile: SpreadsheetImportProfile | null;
};
