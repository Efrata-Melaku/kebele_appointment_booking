export type PaginationMeta = {
  page: number;
  limit: number;
  totalRecords: number;
  totalPages: number;
};

export const DEFAULT_PAGE_LIMIT = 7;

export function parsePaginatedBody<T>(body: {
  success?: boolean;
  data?: T[];
  pagination?: PaginationMeta;
}): { items: T[]; pagination: PaginationMeta } {
  const pagination = body.pagination ?? {
    page: 1,
    limit: DEFAULT_PAGE_LIMIT,
    totalRecords: Array.isArray(body.data) ? body.data.length : 0,
    totalPages: 1,
  };
  return {
    items: (body.data ?? []) as T[],
    pagination,
  };
}
