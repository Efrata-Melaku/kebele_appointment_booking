# Models

This directory is intentionally left empty as we are using Prisma ORM for database modeling.

All database models are defined in `prisma/schema.prisma` and generated automatically.

## Available Models

- **User**: Admin and staff authentication
- **Resident**: Users who book appointments
- **Department**: Service departments (ID Department, Certificate Department, etc.)
- **Service**: Specific services within departments (New ID, ID Renewal, etc.)
- **TimeSlot**: Generated appointment time slots
- **Appointment**: Booked appointments
- **Feedback**: User feedback on appointments
- **Houseowner**: Houseowner records (for admin management)

## Relations

- Department has many Services
- Service belongs to Department
- Service has many TimeSlots
- Service has many Appointments
- TimeSlot has many Appointments
- Resident has many Appointments
- Appointment belongs to Resident, Service, and TimeSlot
- Appointment has one Feedback