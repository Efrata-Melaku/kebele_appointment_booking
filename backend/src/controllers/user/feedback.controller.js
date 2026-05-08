const prisma = require('../../prisma/client');
const { successResponse, errorResponse } = require('../../utils/response');

class FeedbackController {
  async createFeedback(req, res) {
    try {
      const { appointmentId, rating, comment } = req.body;

      // Check if appointment exists and doesn't already have feedback
      const appointment = await prisma.appointment.findUnique({
        where: { id: appointmentId },
        include: { feedback: true },
      });

      if (!appointment) {
        return errorResponse(res, 'Appointment not found', 404);
      }

      if (appointment.feedback) {
        return errorResponse(res, 'Feedback already exists for this appointment', 400);
      }

      const feedback = await prisma.feedback.create({
        data: {
          appointmentId,
          rating,
          comment,
        },
        include: {
          appointment: {
            include: {
              service: {
                include: {
                  department: true,
                },
              },
            },
          },
        },
      });

      successResponse(res, 'Feedback submitted successfully', feedback, 201);
    } catch (error) {
      errorResponse(res, 'Failed to submit feedback', 500);
    }
  }

  async getFeedback(req, res) {
    try {
      const { appointmentId } = req.params;

      const feedback = await prisma.feedback.findUnique({
        where: { appointmentId: parseInt(appointmentId) },
        include: {
          appointment: {
            include: {
              service: {
                include: {
                  department: true,
                },
              },
            },
          },
        },
      });

      if (!feedback) {
        return errorResponse(res, 'Feedback not found', 404);
      }

      successResponse(res, 'Feedback retrieved successfully', feedback);
    } catch (error) {
      errorResponse(res, 'Failed to retrieve feedback', 500);
    }
  }

  async updateFeedback(req, res) {
    try {
      const { appointmentId } = req.params;
      const { rating, comment } = req.body;

      const feedback = await prisma.feedback.update({
        where: { appointmentId: parseInt(appointmentId) },
        data: {
          rating,
          comment,
        },
        include: {
          appointment: {
            include: {
              service: {
                include: {
                  department: true,
                },
              },
            },
          },
        },
      });

      successResponse(res, 'Feedback updated successfully', feedback);
    } catch (error) {
      if (error.code === 'P2025') {
        return errorResponse(res, 'Feedback not found', 404);
      }
      errorResponse(res, 'Failed to update feedback', 500);
    }
  }

  async getAllFeedback(req, res) {
    try {
      const feedback = await prisma.feedback.findMany({
        include: {
          appointment: {
            include: {
              resident: {
                select: { fullName: true },
              },
              service: {
                include: {
                  department: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      successResponse(res, 'Feedback retrieved successfully', feedback);
    } catch (error) {
      errorResponse(res, 'Failed to retrieve feedback', 500);
    }
  }
}

module.exports = new FeedbackController();