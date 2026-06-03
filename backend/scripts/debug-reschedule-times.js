require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { formatDateOnlyYmd } = require('../src/utils/dateRange');
const { evaluateRescheduleEligibility } = require('../src/utils/rescheduleEligibility');

async function main() {
  const prisma = new PrismaClient();
  const rows = await prisma.appointment.findMany({
    where: { status: 'PENDING' },
    take: 10,
    orderBy: { slotDate: 'asc' },
    select: { id: true, slotDate: true, slotStartTime: true, slotEndTime: true },
  });
  const now = new Date();
  console.log('Server now:', now.toISOString(), 'offset', now.getTimezoneOffset());
  for (const r of rows) {
    const start = new Date(r.slotStartTime);
    const ev = evaluateRescheduleEligibility(r, now);
    console.log(
      JSON.stringify(
        {
          id: r.id,
          slotDateYmd: formatDateOnlyYmd(r.slotDate),
          slotStartISO: start.toISOString(),
          slotStartLocal: start.toString(),
          startUsedISO: ev.appointmentStart.toISOString(),
          diffHours: Number(ev.diffHours.toFixed(2)),
          allowed: ev.allowed,
        },
        null,
        2
      )
    );
  }
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
