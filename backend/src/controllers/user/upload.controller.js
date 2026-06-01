const { successResponse, errorResponse } = require('../../utils/response');
const uploadService = require('../../services/upload.service');

class UploadController {
  /** POST /api/user/upload — upload a single document to Cloudinary */
  async uploadDocument(req, res) {
    try {
      if (!req.file) {
        return errorResponse(res, 'No file provided', 400);
      }

      const uploaded = await uploadService.uploadDocument(req.file);
      successResponse(res, 'File uploaded successfully', uploaded, 201);
    } catch (error) {
      if (error.message && error.message.includes('Cloudinary is not configured')) {
        return errorResponse(
          res,
          'File upload is not configured. Add CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET to backend/.env, then restart the server.',
          503
        );
      }
      errorResponse(res, error.message || 'File upload failed', 500);
    }
  }
}

module.exports = new UploadController();
