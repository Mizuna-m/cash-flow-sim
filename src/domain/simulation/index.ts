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

export function simulateRange(input: SimulationInput): DailySimulationSnapshot[] {
  const threshold = new Decimal(input.threshold);
  const theoreticalBalance = new Decimal(input.initialTheoreticalBalance);
  const actualBalance = new Decimal(input.initialActualBalance);

  return [
    {
      date: input.startDate,
      theoreticalBalance: theoreticalBalance.toFixed(2),
      actualBalance: actualBalance.toFixed(2),
      short: actualBalance.lessThan(threshold),
      cardBalances: {}
    }
  ];
}
