/**
 * One-time script: normalize all resident.phone values to +2519/7XXXXXXXX.
 * Run: node scripts/normalize-resident-phones.js
 */
require('../src/config/env');
const prisma = require('../src/prisma/client');
const { normalizeEthiopianPhone } = require('../src/utils/ethiopianPhone');

async function main() {
  const residents = await prisma.resident.findMany({ select: { id: true, phone: true } });
  let updated = 0;
  let skipped = 0;

  for (const r of residents) {
    const normalized = normalizeEthiopianPhone(r.phone);
    if (!normalized) {
      console.warn(`[skip] id=${r.id} invalid phone: ${r.phone}`);
      skipped += 1;
      continue;
    }
    if (normalized === r.phone) continue;

    try {
      await prisma.resident.update({
        where: { id: r.id },
        data: { phone: normalized },
      });
      console.log(`[ok] ${r.phone} -> ${normalized}`);
      updated += 1;
    } catch (e) {
      console.error(`[fail] id=${r.id} ${r.phone}:`, e.message);
    }
  }

  console.log(`Done. Updated ${updated}, skipped ${skipped}.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
