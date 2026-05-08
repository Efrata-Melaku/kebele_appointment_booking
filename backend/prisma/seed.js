const bcrypt = require('bcrypt');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const plain = process.env.ADMIN_SEED_PASSWORD || 'ChangeMe123!';
  const hashed = await bcrypt.hash(plain, 10);

  await prisma.user.upsert({
    where: { email: 'admin@kebele.local' },
    update: {},
    create: {
      email: 'admin@kebele.local',
      password: hashed,
      name: 'System Admin',
      role: 'ADMIN',
      phone: null,
    },
  });

  console.log('Seeded admin user: admin@kebele.local (password from ADMIN_SEED_PASSWORD or default ChangeMe123!)');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
