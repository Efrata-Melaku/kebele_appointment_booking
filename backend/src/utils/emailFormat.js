function formatDisplayDate(dateInput) {
  const d = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (Number.isNaN(d.getTime())) return String(dateInput ?? '');
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function formatDisplayTime(timeInput) {
  if (!timeInput) return '';
  const d = timeInput instanceof Date ? timeInput : new Date(timeInput);
  if (!Number.isNaN(d.getTime()) && String(timeInput).includes('T')) {
    return d.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  }
  const raw = String(timeInput);
  const m = raw.match(/(\d{1,2}):(\d{2})/);
  if (!m) return raw.slice(0, 5);
  let h = parseInt(m[1], 10);
  const min = m[2];
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12;
  if (h === 0) h = 12;
  return `${h}:${min} ${ampm}`;
}

function formatStatus(status) {
  if (!status) return 'Pending';
  const s = String(status).replace(/_/g, ' ').toLowerCase();
  return s.charAt(0).toUpperCase() + s.slice(1);
}

module.exports = {
  formatDisplayDate,
  formatDisplayTime,
  formatStatus,
};
