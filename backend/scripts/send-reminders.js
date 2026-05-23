/**
 * Run daily reminder SMS job (cron-friendly).
 * Usage: node scripts/send-reminders.js
 */
require('../src/config/env');
const reminderService = require('../src/services/reminder.service');
const { prisma } = require('../src/models/_client');

async function main() {
  const summary = await reminderService.sendTomorrowReminders();
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
