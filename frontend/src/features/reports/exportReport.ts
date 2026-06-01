import type { FullReport } from './reportTypes';

function escapeCsv(value: string | number) {
  const s = String(value ?? '');
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function rowsToCsv(rows: (string | number)[][]) {
  return rows.map((r) => r.map(escapeCsv).join(',')).join('\n');
}

/** Export report as CSV (opens in Excel). */
export function exportReportCsv(report: FullReport) {
  const sections: string[] = [];
  const { filters, overview } = report;

  sections.push('Kebele Appointment System — Analytics Report');
  sections.push(`Period,${escapeCsv(filters.label)}`);
  sections.push(`Generated,${escapeCsv(new Date(report.generatedAt).toLocaleString())}`);
  sections.push('');

  sections.push('Overview');
  sections.push(
    rowsToCsv([
      ['Metric', 'Value'],
      ['Total appointments (filtered)', overview.totalAppointments],
      ['Pending', overview.pendingAppointments],
      ['Completed', overview.completedAppointments],
      ['Rescheduled', overview.rescheduledAppointments],
      ['Cancelled', overview.cancelledAppointments],
      ['Not served', overview.notServedAppointments],
      ['Completion rate %', overview.completionRate],
      ['Total residents', overview.totalResidents],
      ['Total services', overview.totalServices],
      ['Total staff', overview.totalStaff],
      ['Total departments', overview.totalDepartments],
    ])
  );
  sections.push('');

  sections.push('Appointments by status');
  sections.push(
    rowsToCsv([
      ['Status', 'Count'],
      ...report.appointmentsByStatus.map((r) => [r.status, r.count]),
    ])
  );
  sections.push('');

  sections.push('Appointments by service');
  sections.push(
    rowsToCsv([
      ['Service', 'Department', 'Count'],
      ...report.appointmentsByService.map((r) => [r.serviceName, r.departmentName, r.count]),
    ])
  );
  sections.push('');

  sections.push('Appointments by department');
  sections.push(
    rowsToCsv([
      ['Department', 'Services', 'Appointments'],
      ...report.appointmentsByDepartment.map((r) => [r.departmentName, r.services, r.count]),
    ])
  );
  sections.push('');

  sections.push('Staff workload');
  sections.push(
    rowsToCsv([
      ['Staff', 'Completed', 'Total status updates'],
      ...report.staffWorkload.map((r) => [r.staffName, r.completedCount, r.totalHandled]),
    ])
  );
  sections.push('');

  sections.push('Trends');
  sections.push(
    rowsToCsv([
      ['Period', 'Total', 'Completed', 'Pending', 'Cancelled', 'Rescheduled', 'Not served'],
      ...report.trends.map((r) => [
        r.label,
        r.total,
        r.completed,
        r.pending,
        r.cancelled,
        r.rescheduled,
        r.notServed,
      ]),
    ])
  );

  const blob = new Blob([sections.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `kebele-report-${filters.datePreset || 'all'}-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** Print-friendly PDF via browser print dialog. */
export function exportReportPdf(report: FullReport) {
  const w = window.open('', '_blank');
  if (!w) return;

  const { filters, overview } = report;
  const table = (headers: string[], rows: (string | number)[][]) => `
    <table border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse;width:100%;margin-bottom:16px;font-size:12px">
      <thead><tr>${headers.map((h) => `<th>${h}</th>`).join('')}</tr></thead>
      <tbody>${rows.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody>
    </table>`;

  w.document.write(`
    <!DOCTYPE html><html><head><title>Report — ${filters.label}</title>
    <style>body{font-family:system-ui,sans-serif;padding:24px;color:#111} h1{font-size:20px} h2{font-size:14px;margin-top:24px}</style>
    </head><body>
    <h1>Kebele Reports — ${filters.label}</h1>
    <p>Generated ${new Date(report.generatedAt).toLocaleString()}</p>
    <h2>Overview</h2>
    ${table(
      ['Metric', 'Value'],
      [
        ['Total appointments', overview.totalAppointments],
        ['Completed', overview.completedAppointments],
        ['Pending', overview.pendingAppointments],
        ['Completion rate', `${overview.completionRate}%`],
        ['Residents', overview.totalResidents],
        ['Services', overview.totalServices],
        ['Staff', overview.totalStaff],
      ]
    )}
    <h2>By status</h2>
    ${table(
      ['Status', 'Count'],
      report.appointmentsByStatus.map((r) => [r.status, r.count])
    )}
    <h2>By service</h2>
    ${table(
      ['Service', 'Department', 'Count'],
      report.appointmentsByService.map((r) => [r.serviceName, r.departmentName, r.count])
    )}
    <h2>Staff workload</h2>
    ${table(
      ['Staff', 'Completed'],
      report.staffWorkload.map((r) => [r.staffName, r.completedCount])
    )}
    </body></html>
  `);
  w.document.close();
  w.focus();
  w.print();
}
