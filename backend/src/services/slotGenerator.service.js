const prisma = require('../prisma/client');
const { generateTimeSlots, parseTime } = require('../utils/time.utils');

class SlotGeneratorService {
  async generateTimeSlots(departmentId, serviceId, date, startTimeStr, endTimeStr) {
    const service = await prisma.service.findFirst({
      where: {
        id: serviceId,
        departmentId: departmentId,
      },
    });

    if (!service) {
      throw new Error('Service not found in the specified department');
    }

    const dateObj = new Date(date);
    const startTime = parseTime(startTimeStr);
    const endTime = parseTime(endTimeStr);

    startTime.setFullYear(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate());
    endTime.setFullYear(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate());

    const slots = generateTimeSlots(startTime, endTime, service.durationInMinutes);

    const startOfDay = new Date(dateObj);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(dateObj);
    endOfDay.setHours(23, 59, 59, 999);

    const createdSlots = [];

    for (const slot of slots) {
      try {
        const exists = await prisma.timeSlot.findFirst({
          where: {
            serviceId,
            date: {
              gte: startOfDay,
              lte: endOfDay,
            },
            startTime: slot.start,
          },
        });

        if (exists) {
          createdSlots.push(exists);
          continue;
        }

        const newSlot = await prisma.timeSlot.create({
          data: {
            date: dateObj,
            startTime: slot.start,
            endTime: slot.end,
            maxCapacity: service.staffCount,
            serviceId,
          },
        });
        createdSlots.push(newSlot);
      } catch (err) {
        if (err.code === 'P2002') {
          const existing = await prisma.timeSlot.findFirst({
            where: {
              serviceId,
              startTime: slot.start,
            },
          });
          if (existing) {
            createdSlots.push(existing);
          }
          continue;
        }
        throw err;
      }
    }

    return createdSlots;
  }

  /**
   * Slots residents may book — not full and flagged available.
   */
  async getAvailableSlots(serviceId, date) {
    const dateObj = new Date(date);
    if (Number.isNaN(dateObj.getTime())) {
      throw new Error('Invalid date');
    }

    const startOfDay = new Date(dateObj);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(dateObj);
    endOfDay.setHours(23, 59, 59, 999);

    const slots = await prisma.timeSlot.findMany({
      where: {
        serviceId: Number(serviceId),
        date: {
          gte: startOfDay,
          lte: endOfDay,
        },
        isAvailable: true,
      },
      orderBy: {
        startTime: 'asc',
      },
    });

    return slots.filter((s) => s.bookedCount < s.maxCapacity);
  }
}

module.exports = new SlotGeneratorService();
