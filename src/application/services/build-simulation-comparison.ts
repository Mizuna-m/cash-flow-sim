import { buildDatabaseSimulation, type BuiltSimulation } from "@/src/application/services/build-database-simulation";

export type SimulationComparisonScenario = {
  id: string;
  label: string;
  detail?: string;
  excludedEventIds: string[];
};

export type SimulationComparisonResponse = {
  base: BuiltSimulation;
  scenarios: Array<{
    id: string;
    label: string;
    detail: string;
    excludedEventIds: string[];
    simulation: BuiltSimulation;
    diff: {
      shortCountDelta: number;
      projectedNegativeDaysDelta: number;
      lowestProjectedCashDelta: string;
      lowestCashDelta: string;
      endingPlannedOutflowDelta: string;
      endingProjectedCashDelta: string;
      endingCashDelta: string;
    };
  }>;
};

function getLowestProjectedCash(simulation: BuiltSimulation) {
  if (simulation.snapshots.length === 0) {
    return 0;
  }

  return simulation.snapshots.reduce((lowest, snapshot) => {
    const current = Number(snapshot.projectedCash);
    return current < lowest ? current : lowest;
  }, Number.POSITIVE_INFINITY);
}

function getLowestCash(simulation: BuiltSimulation) {
  if (simulation.snapshots.length === 0) {
    return 0;
  }

  return simulation.snapshots.reduce((lowest, snapshot) => {
    const current = Number(snapshot.cash);
    return current < lowest ? current : lowest;
  }, Number.POSITIVE_INFINITY);
}

function getShortCount(simulation: BuiltSimulation) {
  return simulation.snapshots.filter((snapshot) => snapshot.short).length;
}

function getProjectedShortCount(simulation: BuiltSimulation) {
  return simulation.snapshots.filter((snapshot) => Number(snapshot.projectedCash) < 0).length;
}

function getEndingProjectedCash(simulation: BuiltSimulation) {
  return Number(simulation.snapshots.at(-1)?.projectedCash ?? 0);
}

function getEndingCash(simulation: BuiltSimulation) {
  return Number(simulation.snapshots.at(-1)?.cash ?? 0);
}

function getEndingPlannedOutflow(simulation: BuiltSimulation) {
  return Number(simulation.snapshots.at(-1)?.plannedOutflow ?? 0);
}

export async function buildSimulationComparison(
  startDate: string,
  endDate: string,
  scenarios: SimulationComparisonScenario[]
): Promise<SimulationComparisonResponse> {
  const base = await buildDatabaseSimulation(startDate, endDate);

  const comparedScenarios = await Promise.all(
    scenarios.map(async (scenario) => {
      const simulation = await buildDatabaseSimulation(startDate, endDate, {
        excludedEventIds: scenario.excludedEventIds
      });

      return {
        id: scenario.id,
        label: scenario.label,
        detail: scenario.detail ?? "",
        excludedEventIds: scenario.excludedEventIds,
        simulation,
        diff: {
          shortCountDelta: getShortCount(simulation) - getShortCount(base),
          projectedNegativeDaysDelta:
            getProjectedShortCount(simulation) - getProjectedShortCount(base),
          lowestProjectedCashDelta: (
            getLowestProjectedCash(simulation) - getLowestProjectedCash(base)
          ).toFixed(2),
          lowestCashDelta: (
            getLowestCash(simulation) - getLowestCash(base)
          ).toFixed(2),
          endingPlannedOutflowDelta: (
            getEndingPlannedOutflow(simulation) - getEndingPlannedOutflow(base)
          ).toFixed(2),
          endingProjectedCashDelta: (
            getEndingProjectedCash(simulation) - getEndingProjectedCash(base)
          ).toFixed(2),
          endingCashDelta: (
            getEndingCash(simulation) - getEndingCash(base)
          ).toFixed(2)
        }
      };
    })
  );

  return {
    base,
    scenarios: comparedScenarios
  };
}
