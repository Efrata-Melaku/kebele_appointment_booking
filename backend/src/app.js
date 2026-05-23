const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('express-async-errors');

const env = require('./config/env');

const authRoutes = require('./routes/auth/auth.routes');
const adminDepartmentRoutes = require('./routes/admin/department.routes');
const adminServiceRoutes = require('./routes/admin/service.routes');
const adminTimeSlotRoutes = require('./routes/admin/timeslot.routes');
const adminStaffRoutes = require('./routes/admin/staff.routes');
const adminScheduleRoutes = require('./routes/admin/schedule.routes');
const adminDashboardRoutes = require('./routes/admin/dashboard.routes');
const adminAppointmentRoutes = require('./routes/admin/appointment.routes');
const adminFeedbackRoutes = require('./routes/admin/feedback.routes');
const adminFormFieldRoutes = require('./routes/admin/formField.routes');
const staffAppointmentRoutes = require('./routes/staff/appointmentStatus.routes');
const userAppointmentRoutes = require('./routes/user/appointment.routes');
const userFeedbackRoutes = require('./routes/user/feedback.routes');
const userBookingRoutes = require('./routes/user/booking.routes');
const userServiceRoutes = require('./routes/user/service.routes');
const userTimeSlotRoutes = require('./routes/user/timeslot.routes');
const userUploadRoutes = require('./routes/user/upload.routes');
const residentRoutes = require('./routes/user/resident.routes');

const errorHandler = require('./middleware/error.middleware');
const protect = require('./middleware/auth.middleware');
const authorize = require('./middleware/role.middleware');
const { USER_ROLES } = require('./config/constants');

const app = express();

app.use(helmet());
app.use(cors({
  origin: process.env.NODE_ENV === 'production' ? process.env.FRONTEND_URL : '*',
  credentials: true,
}));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests from this IP, please try again later.',
});
app.use('/api/', limiter);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Legacy local uploads — new files are stored in Cloudinary only
if (process.env.SERVE_LEGACY_UPLOADS === 'true') {
  app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));
}

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);

app.use('/api/admin/departments', protect, authorize(USER_ROLES.ADMIN), adminDepartmentRoutes);
app.use('/api/admin/services', protect, authorize(USER_ROLES.ADMIN), adminServiceRoutes);
app.use('/api/admin/timeslots', protect, authorize(USER_ROLES.ADMIN), adminTimeSlotRoutes);
app.use('/api/admin/staff', protect, authorize(USER_ROLES.ADMIN), adminStaffRoutes);
app.use('/api/admin/schedule', protect, authorize(USER_ROLES.ADMIN), adminScheduleRoutes);
app.use('/api/admin/dashboard', protect, authorize(USER_ROLES.ADMIN), adminDashboardRoutes);
app.use('/api/admin/appointments', protect, authorize(USER_ROLES.ADMIN), adminAppointmentRoutes);
app.use('/api/admin/feedback', protect, authorize(USER_ROLES.ADMIN), adminFeedbackRoutes);
app.use('/api/admin/form-fields', protect, authorize(USER_ROLES.ADMIN), adminFormFieldRoutes);

app.use('/api/staff', protect, authorize(USER_ROLES.STAFF), staffAppointmentRoutes);

app.use('/api/user/upload', userUploadRoutes);
app.use('/api/user/booking', userBookingRoutes);
app.use('/api/user/services', userServiceRoutes);
app.use('/api/user/timeslots', userTimeSlotRoutes);
app.use('/api/user/appointments', userAppointmentRoutes);
app.use('/api/resident', residentRoutes);
app.use('/api/user/feedback', userFeedbackRoutes);

app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
  });
});

app.use(errorHandler);

module.exports = app;
