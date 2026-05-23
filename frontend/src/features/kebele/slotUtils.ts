export type SlotRow = {
  start: string;
  end: string;
  available: boolean;
  remainingCapacity: number;
};

export type SlotsApiPayload = {
  slots: SlotRow[];
  closed?: boolean;
  closedReason?: string | null;
  hint?: string | null;
};

/** First upcoming weekday (Mon–Fri) on or after `from`. */
export function nextWeekdayISO(from: Date = new Date()): string {
  const d = new Date(from);
  d.setHours(0, 0, 0, 0);
  while (d.getDay() === 0 || d.getDay() === 6) {
    d.setDate(d.getDate() + 1);
  }
  return d.toISOString().split('T')[0];
}

export function parseSlotsResponse(data: unknown): SlotsApiPayload {
  if (Array.isArray(data)) {
    return { slots: data as SlotRow[] };
  }
  if (data && typeof data === 'object' && 'slots' in data) {
    const o = data as SlotsApiPayload;
    return {
      slots: Array.isArray(o.slots) ? o.slots : [],
      closed: o.closed,
      closedReason: o.closedReason,
      hint: o.hint,
    };
  }
  return { slots: [] };
}
