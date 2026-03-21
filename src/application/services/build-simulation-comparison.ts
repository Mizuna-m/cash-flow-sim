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
      lowestActualBalanceDelta: string;
      endingActualBalanceDelta: string;
    };
  }>;
};

function getLowestActualBalance(simulation: BuiltSimulation) {
  if (simulation.snapshots.length === 0) {
    return 0;
  }

  return simulation.snapshots.reduce((lowest, snapshot) => {
    const current = Number(snapshot.actualBalance);
    return current < lowest ? current : lowest;
  }, Number.POSITIVE_INFINITY);
}

function getShortCount(simulation: BuiltSimulation) {
  return simulation.snapshots.filter((snapshot) => snapshot.short).length;
}

function getEndingActualBalance(simulation: BuiltSimulation) {
  return Number(simulation.snapshots.at(-1)?.actualBalance ?? 0);
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
          lowestActualBalanceDelta: (
            getLowestActualBalance(simulation) - getLowestActualBalance(base)
          ).toFixed(2),
          endingActualBalanceDelta: (
            getEndingActualBalance(simulation) - getEndingActualBalance(base)
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
