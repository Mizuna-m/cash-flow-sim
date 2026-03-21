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
      projectedShortCountDelta: number;
      lowestTheoreticalBalanceDelta: string;
      lowestActualBalanceDelta: string;
      endingTheoreticalBalanceDelta: string;
      endingActualBalanceDelta: string;
    };
  }>;
};

function getLowestTheoreticalBalance(simulation: BuiltSimulation) {
  if (simulation.snapshots.length === 0) {
    return 0;
  }

  return simulation.snapshots.reduce((lowest, snapshot) => {
    const current = Number(snapshot.theoreticalBalance);
    return current < lowest ? current : lowest;
  }, Number.POSITIVE_INFINITY);
}

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

function getProjectedShortCount(simulation: BuiltSimulation) {
  return simulation.snapshots.filter((snapshot) => Number(snapshot.theoreticalBalance) < 0).length;
}

function getEndingTheoreticalBalance(simulation: BuiltSimulation) {
  return Number(simulation.snapshots.at(-1)?.theoreticalBalance ?? 0);
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
          projectedShortCountDelta:
            getProjectedShortCount(simulation) - getProjectedShortCount(base),
          lowestTheoreticalBalanceDelta: (
            getLowestTheoreticalBalance(simulation) - getLowestTheoreticalBalance(base)
          ).toFixed(2),
          lowestActualBalanceDelta: (
            getLowestActualBalance(simulation) - getLowestActualBalance(base)
          ).toFixed(2),
          endingTheoreticalBalanceDelta: (
            getEndingTheoreticalBalance(simulation) - getEndingTheoreticalBalance(base)
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
