const cloudinaryService = require('./cloudinary.service');

class UploadService {
  async uploadDocument(file) {
    return cloudinaryService.uploadMulterFile(file);
  }
}

module.exports = new UploadService();
