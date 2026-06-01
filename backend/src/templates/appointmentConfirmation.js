const { formatDisplayDate, formatDisplayTime, formatStatus } = require('../utils/emailFormat');

function emailLayout(title, bodyHtml) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#f4f6f8;font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#1f2937;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f6f8;padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06);">
          <tr>
            <td style="background:#1d4ed8;color:#ffffff;padding:20px 24px;">
              <p style="margin:0;font-size:14px;opacity:0.9;">Kebele Appointment System</p>
              <h1 style="margin:8px 0 0;font-size:22px;font-weight:600;">${title}</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:24px;">${bodyHtml}</td>
          </tr>
          <tr>
            <td style="padding:16px 24px;background:#f9fafb;font-size:12px;color:#6b7280;border-top:1px solid #e5e7eb;">
              Please keep your appointment number for future reference.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function appointmentNumberBlock(appointmentNumber) {
  return `
    <div style="text-align:center;margin:0 0 24px;padding:16px;background:#eff6ff;border:2px solid #3b82f6;border-radius:8px;">
      <p style="margin:0 0 8px;font-size:12px;font-weight:700;letter-spacing:0.08em;color:#1e40af;">APPOINTMENT NUMBER</p>
      <p style="margin:0;font-size:28px;font-weight:800;color:#1e3a8a;line-height:1.2;">${appointmentNumber}</p>
    </div>`;
}

function detailRows(rows) {
  return `
    <table role="presentation" width="100%" style="font-size:15px;line-height:1.6;">
      ${rows
        .map(
          ([label, value]) => `
        <tr>
          <td style="padding:8px 0;color:#6b7280;width:38%;vertical-align:top;">${label}</td>
          <td style="padding:8px 0;font-weight:500;">${value ?? '—'}</td>
        </tr>`
        )
        .join('')}
    </table>`;
}

function buildConfirmationHtml({
  residentName,
  appointmentNumber,
  serviceName,
  departmentName,
  appointmentDate,
  appointmentTime,
  status,
}) {
  const body = `
    <p style="margin:0 0 16px;font-size:16px;">Hello <strong>${residentName}</strong>,</p>
    <p style="margin:0 0 20px;">Your appointment has been successfully booked.</p>
    ${appointmentNumberBlock(appointmentNumber)}
    ${detailRows([
      ['Service', serviceName],
      ['Department', departmentName],
      ['Date', formatDisplayDate(appointmentDate)],
      ['Time', formatDisplayTime(appointmentTime)],
      ['Status', formatStatus(status)],
    ])}
    <p style="margin:24px 0 0;">Thank you.</p>`;
  return emailLayout('Appointment Confirmation', body);
}

function buildUpdateHtml({
  residentName,
  appointmentNumber,
  serviceName,
  appointmentDate,
  appointmentTime,
}) {
  const body = `
    <p style="margin:0 0 16px;font-size:16px;">Hello <strong>${residentName}</strong>,</p>
    <p style="margin:0 0 20px;">Your appointment has been updated.</p>
    ${appointmentNumberBlock(appointmentNumber)}
    ${detailRows([
      ['Service', serviceName],
      ['Updated date', formatDisplayDate(appointmentDate)],
      ['Updated time', formatDisplayTime(appointmentTime)],
    ])}
    <p style="margin:24px 0 0;">Thank you.</p>`;
  return emailLayout('Appointment Updated', body);
}

function buildCancellationHtml({ residentName, appointmentNumber, serviceName }) {
  const body = `
    <p style="margin:0 0 16px;font-size:16px;">Hello <strong>${residentName}</strong>,</p>
    <p style="margin:0 0 20px;">Your appointment has been cancelled.</p>
    ${appointmentNumberBlock(appointmentNumber)}
    ${detailRows([
      ['Service', serviceName],
    ])}
    <p style="margin:24px 0 0;">If you need to book again, please visit the Kebele appointment portal.</p>`;
  return emailLayout('Appointment Cancelled', body);
}

function buildReminderHtml({
  residentName,
  appointmentNumber,
  serviceName,
  appointmentDate,
  appointmentTime,
}) {
  const body = `
    <p style="margin:0 0 16px;font-size:16px;">Hello <strong>${residentName}</strong>,</p>
    <p style="margin:0 0 20px;">This is a reminder that you have an appointment tomorrow.</p>
    ${appointmentNumberBlock(appointmentNumber)}
    ${detailRows([
      ['Service', serviceName],
      ['Date', formatDisplayDate(appointmentDate)],
      ['Time', formatDisplayTime(appointmentTime)],
    ])}
    <p style="margin:24px 0 0;">Thank you.</p>`;
  return emailLayout('Appointment Reminder', body);
}

module.exports = {
  buildConfirmationHtml,
  buildUpdateHtml,
  buildCancellationHtml,
  buildReminderHtml,
};
