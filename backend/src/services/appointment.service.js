// const { Prisma } = require('@prisma/client');
// const prisma = require('../prisma/client');
// const generateAppointmentNumber = require('../utils/generateAppointmentNumber');
// const { APPOINTMENT_STATUS } = require('../config/constants');

// const TRANSACTION_OPTIONS = {
//   isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
//   maxWait: 5000,
//   timeout: 10000,
// };

// class AppointmentService {
//   /**
//    * Resident books a slot — atomic capacity check + booked_count + is_available sync.
//    */
//   async createAppointment(appointmentData, documentUrl = null) {
//     const { fullName, phone, gender, serviceId, timeSlotId } = appointmentData;
// const serviceIdNum = Number(serviceId);
// const timeSlotIdNum = Number(timeSlotId);
//     const maxAttempts = 8;
//     for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
//       const appointmentNumber = generateAppointmentNumber();
//       try {
//         return await prisma.$transaction(async (tx) => {
//           const timeSlot = await tx.timeSlot.findUnique({
//             where: { id: timeSlotIdNum },
//             include: { service: true },
//           });

//           if (!timeSlot) {
//             throw new Error('Time slot not found');
//           }

//           if (timeSlot.serviceId !== Number(serviceIdNum)) {
//             throw new Error('Selected slot does not belong to the selected service');
//           }

//           if (!timeSlot.isAvailable || timeSlot.bookedCount >= timeSlot.maxCapacity) {
//             throw new Error('Time slot is fully booked');
//           }

//           let resident = await tx.resident.findUnique({ where: { phone } });

//           if (!resident) {
//             resident = await tx.resident.create({
//               data: {
//                 fullName,
//                 phone,
//                 gender,
//                 documentUrl,
//               },
//             });
//           } else {
//             resident = await tx.resident.update({
//               where: { id: resident.id },
//               data: {
//                 fullName,
//                 gender,
//                 ...(documentUrl !== null && documentUrl !== undefined
//                   ? { documentUrl }
//                   : {}),
//               },
//             });
//           }

//           const newBooked = timeSlot.bookedCount + 1;
//         const appointment = await tx.appointment.create({
//           data: {
//             appointmentNumber,
//             residentId: resident.id,
//             serviceId: serviceIdNum,
//             timeSlotId: timeSlotIdNum,
//             ...(documentUrl != null && documentUrl !== ''
//               ? { documentUrl }
//               : {}),
//           },
//             include: {
//               resident: true,
//               service: {
//                 include: {
//                   department: true,
//                 },
//               },
//               timeSlot: true,
//             },
//           });

//           await tx.timeSlot.update({
//             where: { id: timeSlotId },
//             data: {
//               bookedCount: newBooked,
//               isAvailable: newBooked < timeSlot.maxCapacity,
//             },
//           });

//           return appointment;
//         }, TRANSACTION_OPTIONS);
//       } catch (err) {
//         if (err.code === 'P2002') {
//           const targets = Array.isArray(err.meta?.target) ? err.meta.target : [];
//           const isAppointmentNumberDup = targets.includes('appointmentNumber');
//           if (isAppointmentNumberDup) {
//             continue;
//           }
//         }
//         throw err;
//       }
//     }

//     throw new Error('Unable to generate a unique appointment number, please try again');
//   }

//   /**
//    * Resident reschedules — release old slot, consume new slot (same service only).
//    */
//   async rescheduleAppointment(appointmentId, { phone, timeSlotId }) {
//     return prisma.$transaction(async (tx) => {
//       const appointment = await tx.appointment.findUnique({
//         where: { id: appointmentId },
//         include: { resident: true, timeSlot: true },
//       });

//       if (!appointment) {
//         throw new Error('Appointment not found');
//       }

//       if (appointment.resident.phone !== phone) {
//         throw new Error('Verification failed for this appointment');
//       }

//       if (appointment.status === APPOINTMENT_STATUS.CANCELLED) {
//         throw new Error('Cannot reschedule a cancelled appointment');
//       }

//       if (appointment.status === APPOINTMENT_STATUS.COMPLETED) {
//         throw new Error('Cannot reschedule a completed appointment');
//       }

//       const newSnap = await tx.timeSlot.findUnique({
//         where: { id: timeSlotId },
//         include: { service: true },
//       });

//       if (!newSnap) {
//         throw new Error('Time slot not found');
//       }

//       if (newSnap.serviceId !== appointment.serviceId) {
//         throw new Error('Invalid slot for this service');
//       }

//       if (appointment.timeSlotId === timeSlotId) {
//         return tx.appointment.findUnique({
//           where: { id: appointmentId },
//           include: {
//             resident: true,
//             service: {
//               include: {
//                 department: true,
//               },
//             },
//             timeSlot: true,
//           },
//         });
//       }

//       if (!newSnap.isAvailable || newSnap.bookedCount >= newSnap.maxCapacity) {
//         throw new Error('Time slot is fully booked');
//       }

//       const oldSnap = await tx.timeSlot.findUnique({
//         where: { id: appointment.timeSlotId },
//       });

//       if (!oldSnap) {
//         throw new Error('Original time slot not found');
//       }

//       const oldBookedAfter = Math.max(0, oldSnap.bookedCount - 1);

//       await tx.timeSlot.update({
//         where: { id: oldSnap.id },
//         data: {
//           bookedCount: oldBookedAfter,
//           isAvailable: oldBookedAfter < oldSnap.maxCapacity,
//         },
//       });

//       const newBookedAfter = newSnap.bookedCount + 1;
//       await tx.timeSlot.update({
//         where: { id: newSnap.id },
//         data: {
//           bookedCount: newBookedAfter,
//           isAvailable: newBookedAfter < newSnap.maxCapacity,
//         },
//       });

//       await tx.appointment.update({
//         where: { id: appointmentId },
//         data: {
//           timeSlotId,
//           status: APPOINTMENT_STATUS.PENDING,
//         },
//       });

//       return tx.appointment.findUnique({
//         where: { id: appointmentId },
//         include: {
//           resident: true,
//           service: {
//             include: {
//               department: true,
//             },
//           },
//           timeSlot: true,
//         },
//       });
//     }, TRANSACTION_OPTIONS);
//   }

//   async cancelAppointmentById(appointmentId, phone) {
//     return prisma.$transaction(async (tx) => {
//       const appointment = await tx.appointment.findUnique({
//         where: { id: appointmentId },
//         include: { resident: true, timeSlot: true },
//       });

//       if (!appointment) {
//         throw new Error('Appointment not found');
//       }

//       if (appointment.resident.phone !== phone) {
//         throw new Error('Verification failed for this appointment');
//       }

//       if (appointment.status === APPOINTMENT_STATUS.CANCELLED) {
//         throw new Error('Appointment is already cancelled');
//       }

//       if (appointment.status !== APPOINTMENT_STATUS.PENDING) {
//         throw new Error('Only pending appointments can be cancelled');
//       }

//       const slotSnap = await tx.timeSlot.findUnique({
//         where: { id: appointment.timeSlotId },
//       });

//       if (!slotSnap) {
//         throw new Error('Time slot not found');
//       }

//       const newBooked = Math.max(0, slotSnap.bookedCount - 1);

//       await tx.timeSlot.update({
//         where: { id: slotSnap.id },
//         data: {
//           bookedCount: newBooked,
//           isAvailable: newBooked < slotSnap.maxCapacity,
//         },
//       });

//       await tx.appointment.update({
//         where: { id: appointmentId },
//         data: { status: APPOINTMENT_STATUS.CANCELLED },
//       });

//       return { id: appointmentId, status: APPOINTMENT_STATUS.CANCELLED };
//     }, TRANSACTION_OPTIONS);
//   }

//   /**
//    * Staff updates lifecycle status — capacity is managed at booking/cancel/reschedule time only.
//    */
//   async updateAppointmentStatus(appointmentId, status) {
//     const appointment = await prisma.appointment.findUnique({
//       where: { id: appointmentId },
//     });

//     if (!appointment) {
//       throw new Error('Appointment not found');
//     }

//     return prisma.appointment.update({
//       where: { id: appointmentId },
//       data: { status },
//       include: {
//         resident: true,
//         service: {
//           include: {
//             department: true,
//           },
//         },
//         timeSlot: true,
//       },
//     });
//   }

//   async getUserAppointments(residentId) {
//     const appointments = await prisma.appointment.findMany({
//       where: { residentId },
//       include: {
//         service: {
//           include: {
//             department: true,
//           },
//         },
//         timeSlot: true,
//       },
//       orderBy: {
//         createdAt: 'desc',
//       },
//     });

//     return appointments;
//   }

//   async getStaffAppointments() {
//     const appointments = await prisma.appointment.findMany({
//       include: {
//         resident: true,
//         service: {
//           include: {
//             department: true,
//           },
//         },
//         timeSlot: true,
//       },
//       orderBy: {
//         createdAt: 'desc',
//       },
//     });

//     return appointments;
//   }
// }

// module.exports = new AppointmentService();



const { Prisma } = require('@prisma/client');
const prisma = require('../prisma/client');
const generateAppointmentNumber = require('../utils/generateAppointmentNumber');
const { APPOINTMENT_STATUS } = require('../config/constants');

const TRANSACTION_OPTIONS = {
  isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
  maxWait: 5000,
  timeout: 10000,
};

class AppointmentService {
  async createAppointment(appointmentData, documentUrl = null) {
    const { fullName, phone, gender, serviceId, timeSlotId } = appointmentData;

    const serviceIdNum = Number(serviceId);
    const timeSlotIdNum = Number(timeSlotId);

    const maxAttempts = 8;
    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      const appointmentNumber = generateAppointmentNumber();
      try {
        return await prisma.$transaction(async (tx) => {
          const timeSlot = await tx.timeSlot.findUnique({
            where: { id: timeSlotIdNum },
            include: { service: true },
          });

          if (!timeSlot) {
            throw new Error('Time slot not found');
          }

          if (timeSlot.serviceId !== serviceIdNum) {
            throw new Error('Selected slot does not belong to the selected service');
          }

          if (!timeSlot.isAvailable || timeSlot.bookedCount >= timeSlot.maxCapacity) {
            throw new Error('Time slot is fully booked');
          }

          let resident = await tx.resident.findUnique({ where: { phone } });

          if (!resident) {
            resident = await tx.resident.create({
              data: {
                fullName,
                phone,
                gender,
                documentUrl,
              },
            });
          } else {
            resident = await tx.resident.update({
              where: { id: resident.id },
              data: {
                fullName,
                gender,
                ...(documentUrl !== null && documentUrl !== undefined
                  ? { documentUrl }
                  : {}),
              },
            });
          }

          const newBooked = timeSlot.bookedCount + 1;

          const appointment = await tx.appointment.create({
            data: {
              appointmentNumber,
              residentId: resident.id,
              serviceId: serviceIdNum,
              timeSlotId: timeSlotIdNum,
              ...(documentUrl != null && documentUrl !== ''
                ? { documentUrl }
                : {}),
            },
            include: {
              resident: true,
              service: {
                include: {
                  department: true,
                },
              },
              timeSlot: true,
            },
          });

          await tx.timeSlot.update({
            where: { id: timeSlotIdNum },
            data: {
              bookedCount: newBooked,
              isAvailable: newBooked < timeSlot.maxCapacity,
            },
          });

          return appointment;
        }, TRANSACTION_OPTIONS);
      } catch (err) {
        if (err.code === 'P2002') {
          const targets = Array.isArray(err.meta?.target) ? err.meta.target : [];
          const isAppointmentNumberDup = targets.includes('appointmentNumber');
          if (isAppointmentNumberDup) {
            continue;
          }
        }
        throw err;
      }
    }

    throw new Error('Unable to generate a unique appointment number, please try again');
  }

  async rescheduleAppointment(appointmentId, { phone, timeSlotId }) {
    return prisma.$transaction(async (tx) => {
      const appointment = await tx.appointment.findUnique({
        where: { id: appointmentId },
        include: { resident: true, timeSlot: true },
      });

      if (!appointment) {
        throw new Error('Appointment not found');
      }

      if (appointment.resident.phone !== phone) {
        throw new Error('Verification failed for this appointment');
      }

      if (appointment.status === APPOINTMENT_STATUS.CANCELLED) {
        throw new Error('Cannot reschedule a cancelled appointment');
      }

      if (appointment.status === APPOINTMENT_STATUS.COMPLETED) {
        throw new Error('Cannot reschedule a completed appointment');
      }

      const newSnap = await tx.timeSlot.findUnique({
        where: { id: timeSlotId },
        include: { service: true },
      });

      if (!newSnap) {
        throw new Error('Time slot not found');
      }

      if (newSnap.serviceId !== appointment.serviceId) {
        throw new Error('Invalid slot for this service');
      }

      if (appointment.timeSlotId === timeSlotId) {
        return tx.appointment.findUnique({
          where: { id: appointmentId },
          include: {
            resident: true,
            service: {
              include: {
                department: true,
              },
            },
            timeSlot: true,
          },
        });
      }

      if (!newSnap.isAvailable || newSnap.bookedCount >= newSnap.maxCapacity) {
        throw new Error('Time slot is fully booked');
      }

      const oldSnap = await tx.timeSlot.findUnique({
        where: { id: appointment.timeSlotId },
      });

      if (!oldSnap) {
        throw new Error('Original time slot not found');
      }

      const oldBookedAfter = Math.max(0, oldSnap.bookedCount - 1);

      await tx.timeSlot.update({
        where: { id: oldSnap.id },
        data: {
          bookedCount: oldBookedAfter,
          isAvailable: oldBookedAfter < oldSnap.maxCapacity,
        },
      });

      const newBookedAfter = newSnap.bookedCount + 1;

      await tx.timeSlot.update({
        where: { id: timeSlotId },
        data: {
          bookedCount: newBookedAfter,
          isAvailable: newBookedAfter < newSnap.maxCapacity,
        },
      });

      await tx.appointment.update({
        where: { id: appointmentId },
        data: {
          timeSlotId,
          status: APPOINTMENT_STATUS.PENDING,
        },
      });

      return tx.appointment.findUnique({
        where: { id: appointmentId },
        include: {
          resident: true,
          service: {
            include: {
              department: true,
            },
          },
          timeSlot: true,
        },
      });
    }, TRANSACTION_OPTIONS);
  }

  async cancelAppointmentById(appointmentId, phone) {
    return prisma.$transaction(async (tx) => {
      const appointment = await tx.appointment.findUnique({
        where: { id: appointmentId },
        include: { resident: true, timeSlot: true },
      });

      if (!appointment) {
        throw new Error('Appointment not found');
      }

      if (appointment.resident.phone !== phone) {
        throw new Error('Verification failed for this appointment');
      }

      if (appointment.status === APPOINTMENT_STATUS.CANCELLED) {
        throw new Error('Appointment is already cancelled');
      }

      if (appointment.status !== APPOINTMENT_STATUS.PENDING) {
        throw new Error('Only pending appointments can be cancelled');
      }

      const slotSnap = await tx.timeSlot.findUnique({
        where: { id: appointment.timeSlotId },
      });

      if (!slotSnap) {
        throw new Error('Time slot not found');
      }

      const newBooked = Math.max(0, slotSnap.bookedCount - 1);

      await tx.timeSlot.update({
        where: { id: slotSnap.id },
        data: {
          bookedCount: newBooked,
          isAvailable: newBooked < slotSnap.maxCapacity,
        },
      });

      await tx.appointment.update({
        where: { id: appointmentId },
        data: { status: APPOINTMENT_STATUS.CANCELLED },
      });

      return { id: appointmentId, status: APPOINTMENT_STATUS.CANCELLED };
    }, TRANSACTION_OPTIONS);
  }

  async updateAppointmentStatus(appointmentId, status) {
    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
    });

    if (!appointment) {
      throw new Error('Appointment not found');
    }

    return prisma.appointment.update({
      where: { id: appointmentId },
      data: { status },
      include: {
        resident: true,
        service: {
          include: {
            department: true,
          },
        },
        timeSlot: true,
      },
    });
  }

  async getUserAppointments(residentId) {
    return prisma.appointment.findMany({
      where: { residentId },
      include: {
        service: {
          include: {
            department: true,
          },
        },
        timeSlot: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async getStaffAppointments() {
    return prisma.appointment.findMany({
      include: {
        resident: true,
        service: {
          include: {
            department: true,
          },
        },
        timeSlot: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }
}

module.exports = new AppointmentService();
