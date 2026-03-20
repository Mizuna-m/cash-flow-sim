function toIsoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function buildDefaultRange(referenceDate = new Date()) {
  const start = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), 1);
  const end = new Date(referenceDate.getFullYear(), referenceDate.getMonth() + 2, 0);

  return {
    startDate: toIsoDate(start),
    endDate: toIsoDate(end)
  };
}
