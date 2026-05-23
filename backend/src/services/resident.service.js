const residentModel = require('../models/resident.model');
const { NotFoundError } = require('../utils/AppError');

class ResidentService {
  async getResidentByPhone(phone, options = {}) {
    const resident = await residentModel.findResidentByPhone(phone, options);
    if (!resident) {
      throw new NotFoundError('Resident not found');
    }
    return resident;
  }

  async findResidentByPhone(phone, options = {}) {
    return residentModel.findResidentByPhone(phone, options);
  }
}

module.exports = new ResidentService();
