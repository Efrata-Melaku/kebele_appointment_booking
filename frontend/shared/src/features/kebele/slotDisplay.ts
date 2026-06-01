/** Resident slot shape from API (no capacity fields). */
export type ResidentSlot = {
  id: number;
  startTime: string;
  endTime: string;
};

export function normalizeResidentSlot(raw: {
  id?: number;
  startTime?: string;
  endTime?: string;
  start?: string;
  end?: string;
}): ResidentSlot {
  return {
    id: raw.id ?? 0,
    startTime: raw.startTime ?? raw.start ?? '',
    endTime: raw.endTime ?? raw.end ?? '',
  };
}

function formatClockTime(hhmm: string): string {
  const m = hhmm.match(/(\d{1,2}):(\d{2})/);
  if (!m) return hhmm;
  let h = parseInt(m[1], 10);
  const min = m[2];
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12;
  if (h === 0) h = 12;
  return `${String(h).padStart(2, '0')}:${min} ${ampm}`;
}

/** Display label e.g. "09:00 AM – 09:30 AM" */
export function formatSlotTimeRange(startTime: string, endTime: string): string {
  return `${formatClockTime(startTime)} – ${formatClockTime(endTime)}`;
}
