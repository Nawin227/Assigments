export function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function getNextSaturdayDate(fromDate: Date = new Date()): Date {
  const day = fromDate.getDay();
  let diff = (6 - day + 7) % 7;
  if (diff === 0) diff = 7;

  const nextSaturday = new Date(fromDate);
  nextSaturday.setDate(fromDate.getDate() + diff);
  return nextSaturday;
}

export function randomItem<T>(items: T[]): T | undefined {
  if (!items.length) return undefined;
  return items[Math.floor(Math.random() * items.length)];
}

export function cleanText(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}
