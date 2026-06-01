/**
 * Creates appointment_status_history table if missing.
 * Usage: node scripts/apply-status-history-schema.js
 */
require('dotenv').config();
const prisma = require('../src/prisma/client');

async function columnExists(table, column) {
  const rows = await prisma.$queryRawUnsafe(
    `SELECT COUNT(*) AS c FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    table,
    column
  );
  return Number(rows[0]?.c ?? 0) > 0;
}

async function tableExists(table) {
  const rows = await prisma.$queryRawUnsafe(
    `SELECT COUNT(*) AS c FROM information_schema.TABLES
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`,
    table
  );
  return Number(rows[0]?.c ?? 0) > 0;
}

async function main() {
  if (!(await tableExists('appointment_status_history'))) {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE \`appointment_status_history\` (
        \`id\` INT NOT NULL AUTO_INCREMENT,
        \`appointmentId\` INT NOT NULL,
        \`previousStatus\` ENUM('PENDING','COMPLETED','RESCHEDULED','NOT_SERVED','CANCELLED') NULL,
        \`newStatus\` ENUM('PENDING','COMPLETED','RESCHEDULED','NOT_SERVED','CANCELLED') NOT NULL,
        \`note\` TEXT NULL,
        \`changedByUserId\` INT NULL,
        \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        PRIMARY KEY (\`id\`),
        INDEX \`appointment_status_history_appointmentId_createdAt_idx\` (\`appointmentId\`, \`createdAt\`),
        CONSTRAINT \`appointment_status_history_appointmentId_fkey\`
          FOREIGN KEY (\`appointmentId\`) REFERENCES \`appointments\`(\`id\`) ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT \`appointment_status_history_changedByUserId_fkey\`
          FOREIGN KEY (\`changedByUserId\`) REFERENCES \`User\`(\`id\`) ON DELETE SET NULL ON UPDATE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('Created appointment_status_history table.');
  } else {
    console.log('appointment_status_history already exists.');
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
