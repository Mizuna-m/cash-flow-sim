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
};

export type DailySimulationSnapshot = {
  date: string;
  theoreticalBalance: string;
  actualBalance: string;
  short: boolean;
  cardBalances: Record<string, string>;
};

export type SimulationInput = {
  startDate: string;
  endDate: string;
  threshold: string;
  defaultCardId: string;
  initialTheoreticalBalance: string;
  initialActualBalance: string;
  events: SimulationEvent[];
};
