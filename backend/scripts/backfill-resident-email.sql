-- Run once before `prisma db push` if Resident rows exist without email.
-- Example: npx prisma db execute --file scripts/backfill-resident-email.sql

ALTER TABLE `Resident`
  ADD COLUMN IF NOT EXISTS `email` VARCHAR(191) NULL;

UPDATE `Resident`
SET `email` = CONCAT('resident-', `id`, '@migration.local')
WHERE `email` IS NULL OR TRIM(`email`) = '';

ALTER TABLE `Resident`
  MODIFY `email` VARCHAR(191) NOT NULL;

ALTER TABLE `Appointment`
  ADD COLUMN IF NOT EXISTS `confirmationEmailSent` BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE `Appointment`
  ADD COLUMN IF NOT EXISTS `confirmationEmailSentAt` DATETIME(3) NULL;
