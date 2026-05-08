// const bcrypt = require('bcrypt');
// const { PrismaClient } = require('@prisma/client');

// const prisma = new PrismaClient();

// async function main() {
//   const plain = process.env.ADMIN_SEED_PASSWORD || 'ChangeMe123!';
//   const hashed = await bcrypt.hash(plain, 10);

//   await prisma.user.upsert({
//     where: { email: 'admin@kebele.local' },
//     update: {},
//     create: {
//       email: 'admin@kebele.local',
//       password: hashed,
//       name: 'System Admin',
//       role: 'ADMIN',
//       phone: null,
//     },
//   });

//   console.log('Seeded admin user: admin@kebele.local (password from ADMIN_SEED_PASSWORD or default ChangeMe123!)');
// }

// main()
//   .catch((e) => {
//     console.error(e);
//     process.exit(1);
//   })
//   .finally(async () => {
//     await prisma.$disconnect();
//   });

const bcrypt = require('bcrypt');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const hashed = await bcrypt.hash('ChangeMe123', 10);

  // ADMIN USER
  await prisma.user.upsert({
    where: { email: 'abc@gmail.com' },
    update: {},
    create: {
      email: 'abc@gmail.com',
      password: hashed,
      name: 'System Admin',
      role: 'ADMIN',
      phone: null,
    },
  });

  // STAFF USER
  await prisma.user.upsert({
    where: { email: 'staff@gmail.com' },
    update: {},
    create: {
      email: 'staff@gmail.com',
      password: hashed,
      name: 'Staff User',
      role: 'STAFF',
      phone: null,
    },
  });

  console.log('Admin and Staff users seeded successfully');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });