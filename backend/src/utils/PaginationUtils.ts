/**
 * Interface for pagination parameters
 */
export interface PaginationParams {
  page: number;
  limit: number;
}

/**
 * Interface for pagination result
 */
export interface PaginationResult<T> {
  data: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

/**
 * Utility functions for pagination
 */
export class PaginationUtils {
  /**
   * Default pagination parameters
   */
  public static readonly DEFAULT_PAGE = 1;
  public static readonly DEFAULT_LIMIT = 10;
  public static readonly MAX_LIMIT = 100;

  /**
   * Validates and normalizes pagination parameters
   * @param page The page number
   * @param limit The page size limit
   * @returns Normalized pagination parameters
   */
  public static normalizePaginationParams(
    page?: number | string | null,
    limit?: number | string | null
  ): PaginationParams {
    const parsedPage = typeof page === 'string' ? parseInt(page, 10) : page;
    const parsedLimit = typeof limit === 'string' ? parseInt(limit, 10) : limit;

    return {
      page: Math.max(1, Number.isInteger(parsedPage) && parsedPage !== null && parsedPage !== undefined && parsedPage > 0 ? parsedPage : this.DEFAULT_PAGE),
      limit: Math.min(
        this.MAX_LIMIT,
        Math.max(1, Number.isInteger(parsedLimit) && parsedLimit !== null && parsedLimit !== undefined && parsedLimit > 0 ? parsedLimit : this.DEFAULT_LIMIT)
      )
    };
  }

  /**
   * Paginates an array of items
   * @param items The array to paginate
   * @param params The pagination parameters
   * @returns A pagination result
   */
  public static paginateArray<T>(items: T[], params: PaginationParams): PaginationResult<T> {
    const { page, limit } = this.normalizePaginationParams(params.page, params.limit);
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const total = items.length;
    const totalPages = Math.ceil(total / limit);

    return {
      data: items.slice(startIndex, endIndex),
      pagination: {
        total,
        page,
        limit,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    };
  }

  /**
   * Calculates the offset for SQL queries
   * @param params The pagination parameters
   * @returns The SQL offset
   */
  public static calculateOffset(params: PaginationParams): number {
    return (params.page - 1) * params.limit;
  }

  /**
   * Builds pagination SQL clauses
   * @param params The pagination parameters
   * @returns SQL limit and offset clauses
   */
  public static buildPaginationClauses(params: PaginationParams): { limit: number; offset: number } {
    return {
      limit: params.limit,
      offset: this.calculateOffset(params)
    };
  }
}