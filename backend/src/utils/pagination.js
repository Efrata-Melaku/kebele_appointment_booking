const DEFAULT_LIMIT = 7;
const MAX_LIMIT = 100;

function parsePagination(query = {}) {
  const page = Math.max(1, Number(query.page) || 1);
  const rawLimit = query.limit ?? query.pageSize;
  const limit = Math.min(
    MAX_LIMIT,
    Math.max(1, Number(rawLimit) || DEFAULT_LIMIT)
  );
  return {
    page,
    limit,
    skip: (page - 1) * limit,
  };
}

function buildPaginationMeta({ page, limit, total }) {
  const totalRecords = Number(total) || 0;
  const totalPages = Math.max(1, Math.ceil(totalRecords / limit) || 1);
  return {
    page,
    limit,
    totalRecords,
    totalPages,
  };
}

module.exports = {
  DEFAULT_LIMIT,
  MAX_LIMIT,
  parsePagination,
  buildPaginationMeta,
};
