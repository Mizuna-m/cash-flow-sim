type ScenarioCandidateInput = {
  id: string;
  name: string;
  startDate: string;
  amount: string;
  isActive: boolean;
};

export type ScenarioCandidate = {
  id: string;
  label: string;
  detail: string;
  excludedEventIds: string[];
};

export function buildScenarioCandidates(events: ScenarioCandidateInput[]): ScenarioCandidate[] {
  return [...events]
    .filter((event) => event.isActive && Number(event.amount) < 0)
    .sort((left, right) => {
      if (left.startDate === right.startDate) {
        return Number(left.amount) - Number(right.amount);
      }

      return left.startDate.localeCompare(right.startDate);
    })
    .slice(0, 3)
    .map((event) => ({
      id: `exclude-${event.id}`,
      label: `${event.name} を外した場合`,
      detail: `${event.startDate} / ${event.amount}`,
      excludedEventIds: [event.id]
    }));
}
