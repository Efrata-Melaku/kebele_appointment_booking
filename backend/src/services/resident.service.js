const residentModel = require('../models/resident.model');
const { parsePagination, buildPaginationMeta } = require('../utils/pagination');

class ResidentService {
  async listResidents(query = {}) {
    const where = {};
    const search = query.search?.trim();
    if (search) {
      where.OR = [
        { fullName: { contains: search } },
        { phone: { contains: search } },
        { kebeleId: { contains: search } },
        { houseNumber: { contains: search } },
      ];
    }

    const { page, limit, skip } = parsePagination(query);

    const [total, rows] = await Promise.all([
      residentModel.countResidents(where),
      residentModel.findManyResidents({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          fullName: true,
          phone: true,
          gender: true,
          kebeleId: true,
          houseNumber: true,
          createdAt: true,
          _count: { select: { appointmentGroups: true } },
        },
      }),
    ]);

    const items = rows.map((r) => ({
      id: r.id,
      name: r.fullName,
      phone: r.phone,
      gender: r.gender,
      idNumber: r.kebeleId,
      address: r.houseNumber,
      registered: r.createdAt,
      appointments: r._count?.appointmentGroups ?? 0,
    }));

    return {
      items,
      pagination: buildPaginationMeta({ page, limit, total }),
    };
  }
}

module.exports = new ResidentService();
