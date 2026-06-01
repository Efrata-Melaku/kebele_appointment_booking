const bcrypt = require('bcrypt');
const { PrismaClient } = require('@prisma/client');
const {
  recalculateStaffCountForService,
} = require('../src/services/serviceStaffCount.service');

const prisma = new PrismaClient();

async function main() {
  const hashed = await bcrypt.hash('ChangeMe123', 10);

  let template = await prisma.workScheduleTemplate.findFirst({ orderBy: { id: 'asc' } });
  if (!template) {
    template = await prisma.workScheduleTemplate.create({ data: {} });
  }

  let dept = await prisma.department.findFirst({ where: { name: 'General Services' } });
  if (!dept) {
    dept = await prisma.department.create({ data: { name: 'General Services' } });
  }

  let service = await prisma.service.findFirst({ where: { name: 'Sample service' } });
  if (!service) {
    service = await prisma.service.create({
      data: {
        name: 'Sample service',
        description: 'Replace with real services in production',
        durationInMinutes: 30,
        staffCount: 0,
        departmentId: dept.id,
      },
    });
  }

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

  const staffUser = await prisma.user.upsert({
    where: { email: 'staff@gmail.com' },
    update: {
      phone: '+251900000000',
      departmentId: dept.id,
    },
    create: {
      email: 'staff@gmail.com',
      password: hashed,
      name: 'Staff User',
      role: 'STAFF',
      phone: '+251900000000',
      departmentId: dept.id,
    },
  });

  await prisma.staffServiceAssignment.deleteMany({ where: { staffUserId: staffUser.id } });
  await prisma.staffServiceAssignment.create({
    data: { staffUserId: staffUser.id, serviceId: service.id },
  });

  await recalculateStaffCountForService(service.id);

  console.log('Seeded admin, staff, schedule template, department, sample service, and staff assignment.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
