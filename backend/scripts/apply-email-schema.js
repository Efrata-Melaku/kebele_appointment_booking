/**
 * Adds resident email + appointment confirmation email columns when db push fails on existing rows.
 * Usage: node scripts/apply-email-schema.js
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

async function main() {
  if (!(await columnExists('Resident', 'email'))) {
    await prisma.$executeRawUnsafe(
      'ALTER TABLE `Resident` ADD COLUMN `email` VARCHAR(191) NULL'
    );
  }

  await prisma.$executeRawUnsafe(`
    UPDATE \`Resident\`
    SET \`email\` = CONCAT('resident-', \`id\`, '@migration.local')
    WHERE \`email\` IS NULL OR TRIM(\`email\`) = ''
  `);

  await prisma.$executeRawUnsafe(
    'ALTER TABLE `Resident` MODIFY `email` VARCHAR(191) NOT NULL'
  );

  if (!(await columnExists('appointments', 'confirmationEmailSent'))) {
    await prisma.$executeRawUnsafe(
      'ALTER TABLE `appointments` ADD COLUMN `confirmationEmailSent` BOOLEAN NOT NULL DEFAULT false'
    );
  }

  if (!(await columnExists('appointments', 'confirmationEmailSentAt'))) {
    await prisma.$executeRawUnsafe(
      'ALTER TABLE `appointments` ADD COLUMN `confirmationEmailSentAt` DATETIME(3) NULL'
    );
  }

  console.log('Email schema columns applied.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
