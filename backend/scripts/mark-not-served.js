/**
 * Mark past pending appointments as NOT_SERVED (cron-friendly).
 * Usage: node scripts/mark-not-served.js
 */
require('../src/config/env');
const appointmentService = require('../src/services/appointment.service');
const { prisma } = require('../src/models/_client');

async function main() {
  const summary = await appointmentService.markPastPendingAsNotServed();
  console.log(JSON.stringify(summary, null, 2));
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
