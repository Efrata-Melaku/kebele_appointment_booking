# Kebele Appointment Management System - Backend

A comprehensive backend API for managing appointments in a Kebele (local administrative unit) system.

## Features

- **User Management**: Admin and Staff authentication with role-based access
- **Department & Service Management**: Hierarchical organization of services
- **Time Slot Generation**: Automated slot creation based on service duration and staff count
- **Appointment Booking**: Resident appointment booking with document upload
- **Staff Operations**: Appointment status management
- **Feedback System**: Resident feedback collection
- **File Upload**: Secure document upload handling
- **SMS Notifications**: Appointment confirmation notifications

## Tech Stack

- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **Prisma ORM** - Database ORM
- **MySQL** - Database
- **JWT** - Authentication
- **Multer** - File uploads
- **bcrypt** - Password hashing

## Project Structure

```
backend/
├── src/
│   ├── config/          # Configuration files
│   ├── controllers/     # Route controllers
│   │   ├── admin/       # Admin operations
│   │   ├── staff/       # Staff operations
│   │   ├── user/        # User operations
│   │   └── auth/        # Authentication
│   ├── middleware/      # Express middleware
│   ├── models/          # Database models (Prisma)
│   ├── routes/          # API routes
│   │   ├── admin/       # Admin routes
│   │   ├── staff/       # Staff routes
│   │   ├── user/        # User routes
│   │   └── auth/        # Auth routes
│   ├── services/        # Business logic services
│   ├── utils/           # Utility functions
│   ├── prisma/          # Database client
│   ├── app.js           # Express app setup
│   └── index.js         # Server entry point
├── prisma/
│   ├── schema.prisma    # Database schema
│   └── migrations/      # Database migrations
├── uploads/             # File uploads directory
├── .env                 # Environment variables
├── package.json         # Dependencies
└── README.md           # This file
```

## Installation

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment variables:**
   Copy `.env` and update database credentials:
   ```bash
   cp .env.example .env
   ```

3. **Set up database:**
   ```bash
   # Generate Prisma client
   npx prisma generate

   # Run migrations
   npx prisma migrate dev

   # (Optional) Open Prisma Studio
   npx prisma studio
   ```

4. **Start the server:**
   ```bash
   # Development
   npm run dev

   # Production
   npm start
   ```

## API Endpoints

### Authentication (Currently Disabled)
- `POST /api/auth/login` - User login (disabled)
- `POST /api/auth/register-staff` - Register staff (disabled)
- `GET /api/auth/profile` - Get user profile (disabled)

### Admin Endpoints (Now Public - No Authentication Required)
- `GET /api/admin/departments` - Get all departments
- `POST /api/admin/departments` - Create department
- `GET /api/admin/services` - Get all services
- `POST /api/admin/services` - Create service
- `POST /api/admin/timeslots/generate` - Generate time slots
- `GET /api/admin/timeslots` - Get time slots
- `POST /api/admin/staff/register` - Register staff
- `GET /api/admin/dashboard` - Get dashboard statistics

### User Endpoints (Public)
- `GET /api/user/departments` - Get departments
- `GET /api/user/services` - Get services
- `GET /api/user/services/:departmentId` - Get services by department
- `GET /api/user/timeslots/:serviceId/:date` - Get available time slots
- `POST /api/user/appointments` - Book appointment
- `GET /api/user/appointments` - Get user appointments (by phone query)
- `POST /api/user/feedback` - Submit feedback

### Staff Endpoints (Now Public - No Authentication Required)
- `GET /api/staff/appointments` - Get all appointments
- `PATCH /api/staff/appointments/:id/status` - Update appointment status

## Database Schema

### Core Models
- **User**: Admin and staff accounts
- **Resident**: Appointment bookers
- **Department**: Service categories (ID, Certificate, etc.)
- **Service**: Specific services within departments
- **TimeSlot**: Generated appointment slots
- **Appointment**: Booked appointments
- **Feedback**: User feedback

### Key Relationships
- Department → Services (1:many)
- Service → TimeSlots (1:many)
- Service → Appointments (1:many)
- Resident → Appointments (1:many)
- TimeSlot → Appointments (1:many)

## Business Logic

### Time Slot Generation
- Admin specifies working hours and service details
- System generates slots based on service duration
- Each slot has max_capacity = staff_count
- Slots become unavailable when booked_count = max_capacity

### Appointment Booking
- Residents can only see available slots
- Booking fails if slot is full
- Unique appointment numbers: APP-YYYYMMDD-XXXX
- Document upload support

### Status Management
- **Pending**: Initial status
- **Completed**: Successfully served
- **Rescheduled**: Appointment moved
- **Not Served**: No-show or cancellation

## Security

**Note: Authentication is currently disabled for development purposes.**

- JWT authentication with role-based authorization (disabled)
- Password hashing with bcrypt (available for future use)
- Rate limiting on API endpoints
- Input validation with Joi
- File upload restrictions
- CORS configuration

## File Upload

- Supports images and documents (PDF, DOC, DOCX)
- 5MB file size limit
- Files stored in `uploads/documents/`
- Secure filename generation

## Environment Variables

```env
DATABASE_URL="mysql://user:password@localhost:3306/kebele_db"
JWT_SECRET="your-secret-key"
JWT_EXPIRES_IN="7d"
PORT=5000
NODE_ENV="development"
UPLOAD_PATH="./uploads"
MAX_FILE_SIZE=5242880
SMS_API_KEY="your-sms-key"
SMS_API_URL="https://api.smsprovider.com/send"
```

## Development

### Available Scripts
- `npm start` - Start production server
- `npm run dev` - Start development server with nodemon
- `npm run prisma:generate` - Generate Prisma client
- `npm run prisma:migrate` - Run database migrations
- `npm run prisma:studio` - Open Prisma Studio

### Code Quality
- Async/await throughout
- Proper error handling
- Input validation
- Clean separation of concerns
- Professional API responses

## Deployment

1. Set `NODE_ENV=production`
2. Update database URL for production
3. Set strong `JWT_SECRET`
4. Configure file upload paths
5. Set up reverse proxy (nginx recommended)
6. Enable SSL/TLS

## Contributing

1. Follow the existing code structure
2. Use async/await for all async operations
3. Add proper error handling
4. Update documentation for API changes
5. Test thoroughly before committing

## License

ISC