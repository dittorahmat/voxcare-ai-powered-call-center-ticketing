/**
 * Pagination helper for Cloudflare Workers
 * Takes an array and returns paginated results with metadata
 */
export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: PaginationMeta;
}

export function paginate<T>(
  items: T[],
  page: number = 1,
  limit: number = 20,
  sort?: string,
  order: 'asc' | 'desc' = 'desc'
): PaginatedResponse<T> {
  let sorted = [...items];

  if (sort) {
    sorted.sort((a: any, b: any) => {
      const aVal = a[sort];
      const bVal = b[sort];
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return order === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return order === 'asc' ? aVal - bVal : bVal - aVal;
      }
      return 0;
    });
  }

  const total = sorted.length;
  const totalPages = Math.ceil(total / limit);
  const start = (page - 1) * limit;
  const paginated = sorted.slice(start, start + limit);

  return {
    data: paginated,
    pagination: { total, page, limit, totalPages },
  };
}

export function parsePaginationParams(c: any): { page: number; limit: number; sort?: string; order: 'asc' | 'desc'; format: string } {
  const page = Math.max(1, parseInt(c.req.query('page') || '1'));
  const limit = Math.min(100, Math.max(1, parseInt(c.req.query('limit') || '20')));
  const sort = c.req.query('sort');
  const order = (c.req.query('order') || 'desc') as 'asc' | 'desc';
  const format = c.req.query('format') || 'paginated';
  return { page, limit, sort, order, format };
}
