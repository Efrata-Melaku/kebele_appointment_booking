export type DatePreset = '' | 'today' | 'week' | 'month';

export function appendDateFilters(
  params: URLSearchParams,
  opts: {
    datePreset?: DatePreset;
    slotDate?: string;
    dateFrom?: string;
    dateTo?: string;
  }
) {
  const { datePreset, slotDate, dateFrom, dateTo } = opts;
  if (datePreset === 'today' || datePreset === 'week' || datePreset === 'month') {
    params.set('datePreset', datePreset);
    return;
  }
  if (slotDate) {
    params.set('slotDate', slotDate);
    return;
  }
  if (dateFrom) params.set('dateFrom', dateFrom);
  if (dateTo) params.set('dateTo', dateTo);
}
